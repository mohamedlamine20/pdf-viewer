import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import PdfDetailsPanel from './PdfDetailsPanel.jsx';
import PdfThumbnailSidebar from './PdfThumbnailSidebar.jsx';
import PdfToolbar from './PdfToolbar.jsx';
import PdfViewport from './PdfViewport.jsx';
import { useElementSize } from '../../hooks/useElementSize.js';
import {
  DEFAULT_PDF_URL,
  FIT_MODES,
  SCALE_STEP,
  buildOutlineTree,
  clampScale,
  countMatches,
  countOutlineItems,
  getFileNameFromSource,
  getSourceLabel,
} from '../../lib/pdfUtils.js';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function getInitialTheme() {
  const storedTheme = window.localStorage.getItem('pdf-viewer-theme');

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function createUrlSource(url) {
  return {
    file: url,
    fileName: getFileNameFromSource(url),
    sourceType: 'url',
    externalUrl: url,
    fileSize: null,
  };
}

function matchesMobileLayout() {
  return window.matchMedia('(max-width: 960px)').matches;
}

function getInitialPanelWidth(storageKey, fallback) {
  const storedWidth = window.localStorage.getItem(storageKey);
  const parsedWidth = Number.parseInt(storedWidth ?? '', 10);

  return Number.isNaN(parsedWidth) ? fallback : parsedWidth;
}

export default function PdfViewerApp() {
  const objectUrlRef = useRef(null);
  const viewerRootRef = useRef(null);
  const viewportHostRef = useRef(null);
  const searchInputRef = useRef(null);
  const loadSequenceRef = useRef(0);
  const resizeStateRef = useRef(null);

  const [theme, setTheme] = useState(getInitialTheme);
  const [isMobileLayout, setIsMobileLayout] = useState(matchesMobileLayout);
  const [source, setSource] = useState(createUrlSource(DEFAULT_PDF_URL));
  const [urlInput, setUrlInput] = useState(DEFAULT_PDF_URL);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [customScale, setCustomScale] = useState(1);
  const [fitMode, setFitMode] = useState(FIT_MODES.WIDTH);
  const [rotation, setRotation] = useState(0);
  const [documentStatus, setDocumentStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('Use a direct PDF URL or upload a local file.');
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageSize, setPageSize] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => getInitialPanelWidth('pdf-viewer-sidebar-width', 276));
  const [detailsWidth, setDetailsWidth] = useState(() => getInitialPanelWidth('pdf-viewer-details-width', 304));
  const [sidebarTab, setSidebarTab] = useState('pages');
  const [outlineItems, setOutlineItems] = useState([]);
  const [isOutlineLoading, setIsOutlineLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageTextItems, setPageTextItems] = useState([]);
  const [searchMatches, setSearchMatches] = useState([]);
  const [searchResultTargets, setSearchResultTargets] = useState([]);
  const [activeSearchHitIndex, setActiveSearchHitIndex] = useState(0);
  const [isSearchIndexing, setIsSearchIndexing] = useState(false);
  const [scrollRequest, setScrollRequest] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const viewportSize = useElementSize(viewportHostRef);

  useEffect(() => {
    window.localStorage.setItem('pdf-viewer-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 960px)');
    const handleChange = (event) => {
      setIsMobileLayout(event.matches);
    };

    setIsMobileLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      return;
    }

    setIsSidebarOpen(false);
    setIsDetailsOpen(false);
  }, [isMobileLayout]);

  useEffect(() => {
    window.localStorage.setItem('pdf-viewer-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    window.localStorage.setItem('pdf-viewer-details-width', String(detailsWidth));
  }, [detailsWidth]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === viewerRootRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isMobileLayout || (!isSidebarOpen && !isDetailsOpen)) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDetailsOpen, isMobileLayout, isSidebarOpen]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState?.element) {
        return;
      }

      const panelRect = resizeState.element.getBoundingClientRect();

      if (resizeState.side === 'sidebar') {
        const nextWidth = Math.min(Math.max(event.clientX - panelRect.left, 220), 420);
        setSidebarWidth(nextWidth);
      }

      if (resizeState.side === 'details') {
        const nextWidth = Math.min(Math.max(panelRect.right - event.clientX, 240), 460);
        setDetailsWidth(nextWidth);
      }
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [searchOpen]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!pdfDocument) {
      setPageSize(null);
      setMetadata(null);
      return undefined;
    }

    let isCancelled = false;
    const sequence = loadSequenceRef.current;

    const loadDocumentDetails = async () => {
      try {
        const [firstPage, pdfMetadata] = await Promise.all([
          pdfDocument.getPage(1),
          pdfDocument.getMetadata().catch(() => null),
        ]);

        if (isCancelled || sequence !== loadSequenceRef.current) {
          return;
        }

        const viewport = firstPage.getViewport({ scale: 1 });
        setPageSize({ width: viewport.width, height: viewport.height });
        setMetadata(pdfMetadata ?? null);
      } catch {
        if (!isCancelled) {
          setPageSize(null);
          setMetadata(null);
        }
      }
    };

    loadDocumentDetails();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument]);

  useEffect(() => {
    if (!pdfDocument) {
      setOutlineItems([]);
      setIsOutlineLoading(false);
      return undefined;
    }

    let isCancelled = false;
    const sequence = loadSequenceRef.current;

    const loadOutline = async () => {
      setIsOutlineLoading(true);

      try {
        const rawOutline = await pdfDocument.getOutline();
        const nextOutlineItems = await buildOutlineTree(pdfDocument, rawOutline ?? []);

        if (!isCancelled && sequence === loadSequenceRef.current) {
          setOutlineItems(nextOutlineItems);
        }
      } catch {
        if (!isCancelled) {
          setOutlineItems([]);
        }
      } finally {
        if (!isCancelled && sequence === loadSequenceRef.current) {
          setIsOutlineLoading(false);
        }
      }
    };

    loadOutline();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument]);

  useEffect(() => {
    if (!pdfDocument) {
      setPageTextItems([]);
      setIsSearchIndexing(false);
      return undefined;
    }

    let isCancelled = false;
    const sequence = loadSequenceRef.current;

    const indexDocumentText = async () => {
      setIsSearchIndexing(true);

      try {
        const nextPageTextItems = Array.from({ length: pdfDocument.numPages + 1 }, () => []);

        for (let index = 1; index <= pdfDocument.numPages; index += 1) {
          const page = await pdfDocument.getPage(index);
          const textContent = await page.getTextContent();
          nextPageTextItems[index] = textContent.items.map((item) => item.str ?? '');

          if (isCancelled || sequence !== loadSequenceRef.current) {
            return;
          }
        }

        startTransition(() => {
          setPageTextItems(nextPageTextItems);
        });
      } finally {
        if (!isCancelled && sequence === loadSequenceRef.current) {
          setIsSearchIndexing(false);
        }
      }
    };

    indexDocumentText();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument]);

  useEffect(() => {
    if (!deferredSearchQuery) {
      setSearchMatches([]);
      setSearchResultTargets([]);
      setActiveSearchHitIndex(0);
      return;
    }

    startTransition(() => {
      const nextMatches = [];
      const nextSearchResultTargets = [];

      for (let index = 1; index < pageTextItems.length; index += 1) {
        const count = pageTextItems[index].reduce(
          (totalMatches, itemText) => totalMatches + countMatches(itemText, deferredSearchQuery),
          0,
        );

        if (count) {
          nextMatches.push({ pageNumber: index, count });

          for (let matchIndex = 0; matchIndex < count; matchIndex += 1) {
            nextSearchResultTargets.push({ pageNumber: index, localHitIndex: matchIndex });
          }
        }
      }

      setSearchMatches(nextMatches);
      setSearchResultTargets(nextSearchResultTargets);
      setActiveSearchHitIndex(0);
    });
  }, [deferredSearchQuery, pageTextItems]);

  useEffect(() => {
    if (!searchResultTargets.length) {
      setActiveSearchHitIndex(0);
      return;
    }

    if (activeSearchHitIndex >= searchResultTargets.length) {
      setActiveSearchHitIndex(0);
    }
  }, [activeSearchHitIndex, searchResultTargets.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      const hasModifier = event.ctrlKey || event.metaKey;
      const hasDocument = Boolean(source.file && numPages);

      if (event.key === 'Escape') {
        if (searchOpen) {
          event.preventDefault();
          setSearchOpen(false);
          return;
        }

        if (isMobileLayout && (isSidebarOpen || isDetailsOpen)) {
          event.preventDefault();
          closePanels();
          return;
        }
      }

      if (hasModifier && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (hasModifier && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        if (hasDocument) {
          handleZoomIn();
        }
        return;
      }

      if (hasModifier && event.key === '-') {
        event.preventDefault();
        if (hasDocument) {
          handleZoomOut();
        }
        return;
      }

      if (isTypingTarget || !hasDocument) {
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        navigateToPage(pageNumber - 1);
      }

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        navigateToPage(pageNumber + 1);
      }

      if (event.key === 'Home') {
        event.preventDefault();
        navigateToPage(1);
      }

      if (event.key === 'End') {
        event.preventDefault();
        navigateToPage(numPages);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    customScale,
    fitMode,
    isDetailsOpen,
    isMobileLayout,
    isSidebarOpen,
    numPages,
    pageNumber,
    pageSize?.height,
    pageSize?.width,
    rotation,
    searchOpen,
    source.file,
    viewportSize.height,
    viewportSize.width,
  ]);

  const turnedPage = rotation % 180 !== 0;
  const normalizedPageWidth = turnedPage ? pageSize?.height : pageSize?.width;
  const normalizedPageHeight = turnedPage ? pageSize?.width : pageSize?.height;
  const availableWidth = Math.max(viewportSize.width - 88, 320);
  const availableHeight = Math.max(viewportSize.height - 88, 320);

  let effectiveScale = customScale;

  if (normalizedPageWidth && normalizedPageHeight) {
    if (fitMode === FIT_MODES.WIDTH) {
      effectiveScale = clampScale(availableWidth / normalizedPageWidth);
    }

    if (fitMode === FIT_MODES.PAGE) {
      effectiveScale = clampScale(
        Math.min(availableWidth / normalizedPageWidth, availableHeight / normalizedPageHeight),
      );
    }
  }

  const hasDocument = Boolean(source.file);
  const zoomPercentage = `${Math.round(effectiveScale * 100)}%`;
  const totalSearchMatches = searchResultTargets.length;
  const activeSearchTarget = searchResultTargets[activeSearchHitIndex] ?? null;
  const searchSummary = deferredSearchQuery
    ? totalSearchMatches
      ? `${Math.min(activeSearchHitIndex + 1, totalSearchMatches)} / ${totalSearchMatches} matches • ${searchMatches.length} pages`
      : 'No matches found'
    : 'Search the text layer';

  const matchCountByPage = Object.fromEntries(searchMatches.map((result) => [result.pageNumber, result.count]));
  const outlineCount = countOutlineItems(outlineItems);
  const hasMobileOverlay = isMobileLayout && (isSidebarOpen || isDetailsOpen);
  const sidebarPanelStyle = !isMobileLayout ? { width: isSidebarOpen ? `${sidebarWidth}px` : '0px' } : undefined;
  const detailsPanelStyle = !isMobileLayout ? { width: isDetailsOpen ? `${detailsWidth}px` : '0px' } : undefined;
  const fitModeLabel = fitMode === FIT_MODES.WIDTH ? 'Fit width' : fitMode === FIT_MODES.PAGE ? 'Fit page' : 'Custom zoom';

  useEffect(() => {
    if (!activeSearchTarget || activeSearchTarget.pageNumber === pageNumber) {
      return;
    }

    navigateToPage(activeSearchTarget.pageNumber);
  }, [activeSearchTarget]);

  function resetViewerState(nextSource) {
    loadSequenceRef.current += 1;
    setSource(nextSource);
    setNumPages(0);
    setPageNumber(1);
    setPageInput('1');
    setCustomScale(1);
    setFitMode(FIT_MODES.WIDTH);
    setRotation(0);
    setDocumentStatus('loading');
    setErrorMessage('Use a direct PDF URL or upload a local file.');
    setPdfDocument(null);
    setOutlineItems([]);
    setIsOutlineLoading(false);
    setPageTextItems([]);
    setSearchQuery('');
    setSearchMatches([]);
    setSearchResultTargets([]);
    setActiveSearchHitIndex(0);
    setScrollRequest({ id: Date.now(), pageNumber: 1, behavior: 'auto' });
  }

  function releaseObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function loadUrl(event) {
    event.preventDefault();

    const nextUrl = urlInput.trim();
    if (!nextUrl) {
      return;
    }

    try {
      const normalizedUrl = new URL(nextUrl).toString();
      releaseObjectUrl();
      resetViewerState(createUrlSource(normalizedUrl));
    } catch {
      setDocumentStatus('error');
      setErrorMessage('Enter a valid PDF URL.');
    }
  }

  function loadFile(file) {
    if (!file) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setDocumentStatus('error');
      setErrorMessage('Please choose a PDF file.');
      return;
    }

    releaseObjectUrl();
    objectUrlRef.current = URL.createObjectURL(file);

    resetViewerState({
      file,
      fileName: file.name,
      sourceType: 'file',
      externalUrl: objectUrlRef.current,
      fileSize: file.size,
    });
  }

  function navigateToPage(nextPage, behavior = 'smooth') {
    if (!numPages) {
      return;
    }

    const normalizedPage = Math.min(Math.max(nextPage, 1), numPages);
    setPageNumber(normalizedPage);
    setPageInput(String(normalizedPage));
    setScrollRequest({ id: Date.now(), pageNumber: normalizedPage, behavior });
  }

  function commitPageInput() {
    if (!numPages) {
      return;
    }

    const parsedPage = Number.parseInt(pageInput, 10);
    navigateToPage(Number.isNaN(parsedPage) ? pageNumber : parsedPage);
  }

  function updateCustomScale(nextScale) {
    setFitMode(FIT_MODES.CUSTOM);
    setCustomScale(clampScale(nextScale));
  }

  function handleZoomIn() {
    updateCustomScale(effectiveScale + SCALE_STEP);
  }

  function handleZoomOut() {
    updateCustomScale(effectiveScale - SCALE_STEP);
  }

  function moveToSearchResult(direction) {
    if (!searchResultTargets.length) {
      return;
    }

    setSearchOpen(true);
    setActiveSearchHitIndex((currentIndex) => {
      const nextIndex = (currentIndex + direction + searchResultTargets.length) % searchResultTargets.length;
      return nextIndex;
    });
  }

  function handleDocumentLoad(nextDocument) {
    setPdfDocument(nextDocument);
    setNumPages(nextDocument.numPages);
    setDocumentStatus('ready');
    setErrorMessage('Use a direct PDF URL or upload a local file.');
  }

  function handleDocumentError(error) {
    setDocumentStatus('error');
    setErrorMessage(error?.message || 'The PDF could not be opened. Remote URLs must allow direct access.');
  }

  function handleVisiblePageChange(nextPage) {
    setPageNumber((currentPage) => {
      if (currentPage === nextPage) {
        return currentPage;
      }

      return nextPage;
    });
    setPageInput(String(nextPage));
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }

  function closePanels() {
    setIsSidebarOpen(false);
    setIsDetailsOpen(false);
  }

  function startPanelResize(side, event) {
    if (isMobileLayout) {
      return;
    }

    resizeStateRef.current = {
      side,
      element: event.currentTarget.closest('.thumbnail-sidebar, .details-panel'),
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  }

  function toggleSidebar() {
    const nextValue = !isSidebarOpen;
    setIsSidebarOpen(nextValue);

    if (nextValue && isMobileLayout) {
      setIsDetailsOpen(false);
    }
  }

  function toggleDetails() {
    const nextValue = !isDetailsOpen;
    setIsDetailsOpen(nextValue);

    if (nextValue && isMobileLayout) {
      setIsSidebarOpen(false);
    }
  }

  function navigateFromSidebar(nextPage) {
    navigateToPage(nextPage);

    if (isMobileLayout) {
      setIsSidebarOpen(false);
    }
  }

  function handleOutlineSelection(outlineItem) {
    if (outlineItem.pageNumber) {
      navigateFromSidebar(outlineItem.pageNumber);
      return;
    }

    if (outlineItem.url) {
      if (isMobileLayout) {
        setIsSidebarOpen(false);
      }

      window.open(outlineItem.url, '_blank', 'noopener,noreferrer');
    }
  }

  async function toggleFullscreen() {
    if (!viewerRootRef.current) {
      return;
    }

    if (document.fullscreenElement === viewerRootRef.current) {
      await document.exitFullscreen();
      return;
    }

    await viewerRootRef.current.requestFullscreen();
  }

  function openInNewTab() {
    if (!source.externalUrl) {
      return;
    }

    window.open(source.externalUrl, '_blank', 'noopener,noreferrer');
  }

  function downloadDocument() {
    if (!source.externalUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = source.externalUrl;
    link.download = source.fileName || 'document.pdf';
    link.rel = 'noopener noreferrer';
    link.click();
  }

  function printDocument() {
    if (!source.externalUrl) {
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.src = source.externalUrl;

    printFrame.onload = () => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch {
        openInNewTab();
      }
    };

    document.body.appendChild(printFrame);
    window.setTimeout(() => {
      printFrame.remove();
    }, 60_000);
  }

  return (
    <div className={`pdf-app-shell ${isFullscreen ? 'is-fullscreen' : ''}`} data-theme={theme} ref={viewerRootRef}>
      <button
        type="button"
        className={`mobile-panel-backdrop ${hasMobileOverlay ? 'is-visible' : ''}`}
        aria-label="Close navigation panels"
        onClick={closePanels}
        tabIndex={hasMobileOverlay ? 0 : -1}
      />

      <PdfToolbar
        fileName={source.fileName}
        sourceLabel={getSourceLabel(source.sourceType)}
        urlInput={urlInput}
        onUrlInputChange={setUrlInput}
        onLoadUrl={loadUrl}
        onFileSelect={loadFile}
        pageInput={pageInput}
        pageNumber={pageNumber}
        numPages={numPages}
        onPageInputChange={setPageInput}
        onPageInputCommit={commitPageInput}
        onPreviousPage={() => navigateToPage(pageNumber - 1)}
        onNextPage={() => navigateToPage(pageNumber + 1)}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        searchSummary={searchSummary}
        isSearchBusy={isSearchIndexing}
        searchInputRef={searchInputRef}
        onToggleSearch={() => setSearchOpen((current) => !current)}
        onSearchChange={setSearchQuery}
        onSearchNext={() => moveToSearchResult(1)}
        onSearchPrevious={() => moveToSearchResult(-1)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitWidth={() => setFitMode(FIT_MODES.WIDTH)}
        onFitPage={() => setFitMode(FIT_MODES.PAGE)}
        onRotate={() => setRotation((currentRotation) => (currentRotation + 90) % 360)}
        zoomPercentage={zoomPercentage}
        fitMode={fitMode}
        onToggleSidebar={toggleSidebar}
        onToggleDetails={toggleDetails}
        isSidebarOpen={isSidebarOpen}
        isDetailsOpen={isDetailsOpen}
        onToggleTheme={toggleTheme}
        theme={theme}
        onDownload={downloadDocument}
        onPrint={printDocument}
        onOpenInNewTab={openInNewTab}
        onFullscreen={toggleFullscreen}
        hasDocument={hasDocument}
      />

      <div className="pdf-workspace-grid">
        <PdfThumbnailSidebar
          file={source.file}
          numPages={numPages}
          currentPage={pageNumber}
          onSelectPage={navigateFromSidebar}
          isOpen={isSidebarOpen}
          style={sidebarPanelStyle}
          isMobileLayout={isMobileLayout}
          matchCountByPage={matchCountByPage}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          outlineItems={outlineItems}
          outlineCount={outlineCount}
          isOutlineLoading={isOutlineLoading}
          onSelectOutlineItem={handleOutlineSelection}
          onClose={() => setIsSidebarOpen(false)}
          onResizeStart={(event) => startPanelResize('sidebar', event)}
        />

        <main className="pdf-viewport-host" ref={viewportHostRef} aria-busy={documentStatus === 'loading'}>
          <PdfViewport
            file={source.file}
            numPages={numPages}
            currentPage={pageNumber}
            scale={effectiveScale}
            rotation={rotation}
            pageSize={
              normalizedPageWidth && normalizedPageHeight
                ? { width: normalizedPageWidth, height: normalizedPageHeight }
                : null
            }
            searchQuery={deferredSearchQuery}
            activeSearchTarget={activeSearchTarget}
            pageMatchCounts={matchCountByPage}
            scrollRequest={scrollRequest}
            errorMessage={errorMessage}
            onDocumentLoad={handleDocumentLoad}
            onDocumentError={handleDocumentError}
            onVisiblePageChange={handleVisiblePageChange}
            onSearchHitPageChange={handleVisiblePageChange}
            onScaleRequest={updateCustomScale}
          />

          {hasDocument && (
            <div className="viewer-status-hud" aria-live="polite">
              <span>{pageNumber} / {numPages || 0}</span>
              <span>{zoomPercentage}</span>
              <span>{fitModeLabel}</span>
            </div>
          )}
        </main>

        <PdfDetailsPanel
          isOpen={isDetailsOpen}
          style={detailsPanelStyle}
          isMobileLayout={isMobileLayout}
          onClose={() => setIsDetailsOpen(false)}
          onResizeStart={(event) => startPanelResize('details', event)}
          fileName={source.fileName}
          sourceType={source.sourceType}
          fileSize={source.fileSize}
          numPages={numPages}
          pageNumber={pageNumber}
          zoomPercentage={zoomPercentage}
          fitMode={fitMode}
          rotation={rotation}
          pageSize={pageSize}
          metadata={metadata}
          searchSummary={searchSummary}
          isSearchIndexing={isSearchIndexing}
        />
      </div>
    </div>
  );
}
