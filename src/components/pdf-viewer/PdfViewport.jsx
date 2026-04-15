import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { SCALE_STEP, highlightText } from '../../lib/pdfUtils.js';

const devicePixelRatio = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

function ViewerLoadingState() {
  return (
    <div className="viewer-state-card" role="status" aria-live="polite">
      <div className="viewer-state-spinner" aria-hidden="true" />
      <div>
        <h2>Loading document</h2>
        <p>Preparing pages, text selection, and thumbnails.</p>
      </div>
    </div>
  );
}

function ViewerErrorState({ message }) {
  return (
    <div className="viewer-state-card viewer-state-error" role="alert">
      <div>
        <h2>Unable to open PDF</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}

function ViewerPageSlot({
  pageNumber,
  currentPage,
  scale,
  rotation,
  searchQuery,
  pageMatchCount,
  forceRender,
  pageSize,
  scrollRootRef,
  onRegisterPageRef,
}) {
  const shellRef = useRef(null);
  const [isNearViewport, setIsNearViewport] = useState(pageNumber <= 2);

  const estimatedWidth = pageSize?.width ? Math.max(Math.round(pageSize.width * scale), 240) : Math.max(Math.round(860 * scale), 280);
  const estimatedHeight = pageSize?.height
    ? Math.max(Math.round(pageSize.height * scale), 320)
    : Math.max(Math.round(1120 * scale), 420);

  useEffect(() => {
    if (!scrollRootRef.current || !shellRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting);
      },
      {
        root: scrollRootRef.current,
        rootMargin: '1600px 0px',
        threshold: 0.01,
      },
    );

    observer.observe(shellRef.current);
    return () => observer.disconnect();
  }, [scrollRootRef, scale, rotation]);

  const shouldRenderPage = forceRender || isNearViewport;

  return (
    <article
      className={`viewer-page-shell ${shouldRenderPage ? 'is-rendered' : 'is-placeholder'}`}
      data-page-number={pageNumber}
      ref={(element) => {
        shellRef.current = element;
        onRegisterPageRef(pageNumber, element);
      }}
    >
      <div className="viewer-page-meta">
        <span>{currentPage === pageNumber ? `Page ${pageNumber} - current` : `Page ${pageNumber}`}</span>
        {pageMatchCount ? <span>{pageMatchCount} matches</span> : null}
      </div>

      <div className="viewer-page-frame">
        {shouldRenderPage ? (
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            renderAnnotationLayer
            renderTextLayer
            loading={<div className="viewer-page-skeleton" style={{ width: `${estimatedWidth}px`, height: `${estimatedHeight}px` }} aria-hidden="true" />}
            devicePixelRatio={devicePixelRatio}
            customTextRenderer={({ str }) => highlightText(str, searchQuery)}
          />
        ) : (
          <div className="viewer-page-placeholder" style={{ width: `${estimatedWidth}px`, height: `${estimatedHeight}px` }}>
            <span>Page {pageNumber}</span>
            <small>Rendered when you scroll nearby</small>
          </div>
        )}
      </div>
    </article>
  );
}

export default function PdfViewport({
  file,
  numPages,
  currentPage,
  scale,
  rotation,
  pageSize,
  searchQuery,
  activeSearchTarget,
  pageMatchCounts,
  scrollRequest,
  errorMessage,
  onDocumentLoad,
  onDocumentError,
  onVisiblePageChange,
  onSearchHitPageChange,
  onScaleRequest,
}) {
  const scrollContainerRef = useRef(null);
  const pageRefs = useRef(new Map());
  const syncAnimationFrameRef = useRef(0);
  const zoomAnchorRef = useRef(null);
  const previousScaleRef = useRef(scale);

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return undefined;
    }

    scrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return undefined;
  }, [file]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !file) {
      return undefined;
    }

    const handleWheel = (event) => {
      const wantsZoom = event.ctrlKey || event.metaKey || event.altKey;

      if (!wantsZoom) {
        return;
      }

      event.preventDefault();

      const rect = scrollContainer.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      zoomAnchorRef.current = {
        documentX: (scrollContainer.scrollLeft + offsetX) / scale,
        documentY: (scrollContainer.scrollTop + offsetY) / scale,
        offsetX,
        offsetY,
      };

      const nextScale = event.deltaY < 0 ? scale + SCALE_STEP : scale - SCALE_STEP;
      onScaleRequest(nextScale);
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener('wheel', handleWheel);
  }, [file, onScaleRequest, scale]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      previousScaleRef.current = scale;
      return;
    }

    const previousScale = previousScaleRef.current;
    if (zoomAnchorRef.current && previousScale !== scale) {
      const { documentX, documentY, offsetX, offsetY } = zoomAnchorRef.current;

      scrollContainer.scrollTo({
        left: Math.max(documentX * scale - offsetX, 0),
        top: Math.max(documentY * scale - offsetY, 0),
        behavior: 'auto',
      });

      zoomAnchorRef.current = null;
    }

    previousScaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    if (!scrollRequest?.id) {
      return;
    }

    const target = pageRefs.current.get(scrollRequest.pageNumber);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: scrollRequest.behavior ?? 'smooth', block: 'start' });
  }, [scrollRequest]);

  useEffect(() => {
    if (!scrollContainerRef.current || !numPages) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);

        if (!visibleEntries.length) {
          return;
        }

        const mostVisibleEntry = visibleEntries.reduce((bestEntry, currentEntry) => {
          if (!bestEntry || currentEntry.intersectionRatio > bestEntry.intersectionRatio) {
            return currentEntry;
          }

          return bestEntry;
        }, null);

        const nextPage = Number(mostVisibleEntry?.target?.dataset.pageNumber);
        if (nextPage) {
          onVisiblePageChange(nextPage);
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.35, 0.5, 0.75],
      },
    );

    const pageElements = Array.from(pageRefs.current.values());
    pageElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [numPages, onVisiblePageChange]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return undefined;
    }

    const syncSearchHits = () => {
      scrollContainer.querySelectorAll('.pdf-hit.is-active').forEach((element) => {
        element.classList.remove('is-active');
      });

      if (!searchQuery.trim() || !activeSearchTarget) {
        return;
      }

      const targetPageElement = pageRefs.current.get(activeSearchTarget.pageNumber);
      const targetHits = Array.from(targetPageElement?.querySelectorAll('.pdf-hit') ?? []);
      const activeHit = targetHits[activeSearchTarget.localHitIndex] ?? targetHits[0];

      if (!activeHit) {
        return;
      }

      activeHit.classList.add('is-active');
      activeHit.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      onSearchHitPageChange(activeSearchTarget.pageNumber);
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(syncAnimationFrameRef.current);
      syncAnimationFrameRef.current = window.requestAnimationFrame(syncSearchHits);
    };

    scheduleSync();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(scrollContainer, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(syncAnimationFrameRef.current);
    };
  }, [activeSearchTarget, file, numPages, onSearchHitPageChange, scale, rotation, searchQuery]);

  return (
    <section className="viewer-stage">
      {!file ? (
        <div className="viewer-state-card viewer-state-empty">
          <div>
            <h2>Open a PDF</h2>
            <p>Upload a file or paste a direct PDF URL to start reviewing documents.</p>
          </div>
        </div>
      ) : (
        <div className="viewer-scroll-region" ref={scrollContainerRef}>
          <Document
            file={file}
            loading={<ViewerLoadingState />}
            noData={<ViewerLoadingState />}
            error={<ViewerErrorState message={errorMessage} />}
            externalLinkTarget="_blank"
            externalLinkRel="noreferrer noopener"
            onLoadSuccess={onDocumentLoad}
            onLoadError={onDocumentError}
          >
            <div className="viewer-document-column">
              {Array.from({ length: numPages }, (_, index) => {
                const pageNumber = index + 1;
                const forceRender =
                  pageNumber === scrollRequest?.pageNumber ||
                  pageNumber === activeSearchTarget?.pageNumber ||
                  Math.abs(pageNumber - currentPage) <= 1;

                return (
                  <ViewerPageSlot
                    key={pageNumber}
                    pageNumber={pageNumber}
                    currentPage={currentPage}
                    scale={scale}
                    rotation={rotation}
                    searchQuery={searchQuery}
                    pageMatchCount={pageMatchCounts[pageNumber]}
                    forceRender={forceRender}
                    pageSize={pageSize}
                    scrollRootRef={scrollContainerRef}
                    onRegisterPageRef={(resolvedPageNumber, element) => {
                      if (element) {
                        pageRefs.current.set(resolvedPageNumber, element);
                      } else {
                        pageRefs.current.delete(resolvedPageNumber);
                      }
                    }}
                  />
                );
              })}
            </div>
          </Document>
        </div>
      )}
    </section>
  );
}
