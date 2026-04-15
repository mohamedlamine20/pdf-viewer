import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { BookmarksIcon, CloseIcon } from './icons.jsx';

function ThumbnailItem({ pageNumber, currentPage, onSelectPage, matchCount, scrollRootRef }) {
  const itemRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(pageNumber <= 6);

  useEffect(() => {
    if (shouldRender || !itemRef.current) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      {
        root: scrollRootRef.current,
        rootMargin: '220px 0px',
      },
    );

    observer.observe(itemRef.current);
    return () => observer.disconnect();
  }, [scrollRootRef, shouldRender]);

  return (
    <button
      ref={itemRef}
      type="button"
      className={`thumbnail-card ${currentPage === pageNumber ? 'is-active' : ''}`}
      onClick={() => onSelectPage(pageNumber)}
      aria-label={`Go to page ${pageNumber}`}
      aria-current={currentPage === pageNumber ? 'page' : undefined}
    >
      <span className="thumbnail-page-label">{pageNumber}</span>
      {matchCount ? <span className="thumbnail-match-badge">{matchCount}</span> : null}

      <div className="thumbnail-preview-shell">
        {shouldRender ? (
          <Page pageNumber={pageNumber} width={126} renderAnnotationLayer={false} renderTextLayer={false} loading={null} />
        ) : (
          <div className="thumbnail-placeholder" aria-hidden="true" />
        )}
      </div>
    </button>
  );
}

function OutlineItem({ item, currentPage, depth = 0, onSelectOutlineItem }) {
  const isActive = item.pageNumber === currentPage;

  return (
    <li className="outline-node">
      <button
        type="button"
        className={`outline-item ${isActive ? 'is-active' : ''}`}
        onClick={() => onSelectOutlineItem(item)}
        style={{ '--outline-depth': depth }}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="outline-item-title">{item.title}</span>
        {item.pageNumber ? <span className="outline-page-chip">{item.pageNumber}</span> : <BookmarksIcon />}
      </button>

      {item.items?.length ? (
        <ul className="outline-children">
          {item.items.map((childItem) => (
            <OutlineItem
              key={childItem.id}
              item={childItem}
              currentPage={currentPage}
              depth={depth + 1}
              onSelectOutlineItem={onSelectOutlineItem}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function PdfThumbnailSidebar({
  file,
  numPages,
  currentPage,
  onSelectPage,
  isOpen,
  style,
  isMobileLayout,
  matchCountByPage,
  activeTab,
  onTabChange,
  outlineItems,
  outlineCount,
  isOutlineLoading,
  onSelectOutlineItem,
  onClose,
  onResizeStart,
}) {
  const scrollRootRef = useRef(null);

  useEffect(() => {
    const selector = activeTab === 'outline' ? '.outline-item.is-active' : '.thumbnail-card.is-active';
    const activeItem = scrollRootRef.current?.querySelector(selector);
    activeItem?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeTab, currentPage]);

  return (
    <aside className={`thumbnail-sidebar ${isOpen ? 'is-open' : ''}`} aria-label="Navigation sidebar" style={style}>
      <div className="panel-heading">
        <div>
          <p>Navigation</p>
          <span>{activeTab === 'pages' ? `${numPages || 0} thumbnails` : `${outlineCount} bookmarks`}</span>
        </div>

        <button type="button" className="panel-close-button" onClick={onClose} aria-label="Close navigation panel">
          <CloseIcon />
        </button>
      </div>

      <div className="panel-tabs" role="tablist" aria-label="Sidebar views">
        <button
          type="button"
          className={`panel-tab ${activeTab === 'pages' ? 'is-active' : ''}`}
          onClick={() => onTabChange('pages')}
          role="tab"
          aria-selected={activeTab === 'pages'}
        >
          Pages
        </button>
        <button
          type="button"
          className={`panel-tab ${activeTab === 'outline' ? 'is-active' : ''}`}
          onClick={() => onTabChange('outline')}
          role="tab"
          aria-selected={activeTab === 'outline'}
        >
          Outline
        </button>
      </div>

      <div className="thumbnail-scroll" ref={scrollRootRef}>
        {activeTab === 'pages' ? (
          !file ? (
            <div className="panel-empty-state">Load a PDF to see page thumbnails.</div>
          ) : (
            <Document
              file={file}
              loading={<div className="panel-empty-state">Generating thumbnails…</div>}
              error={<div className="panel-empty-state">Thumbnails unavailable.</div>}
            >
              <div className="thumbnail-list">
                {Array.from({ length: numPages }, (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <ThumbnailItem
                      key={pageNumber}
                      pageNumber={pageNumber}
                      currentPage={currentPage}
                      onSelectPage={onSelectPage}
                      matchCount={matchCountByPage[pageNumber]}
                      scrollRootRef={scrollRootRef}
                    />
                  );
                })}
              </div>
            </Document>
          )
        ) : isOutlineLoading ? (
          <div className="panel-empty-state">Reading document outline…</div>
        ) : outlineItems.length ? (
          <ul className="outline-list">
            {outlineItems.map((item) => (
              <OutlineItem
                key={item.id}
                item={item}
                currentPage={currentPage}
                onSelectOutlineItem={onSelectOutlineItem}
              />
            ))}
          </ul>
        ) : (
          <div className="panel-empty-state">This PDF does not include bookmarks or an outline.</div>
        )}
      </div>

      {!isMobileLayout && isOpen ? (
        <button
          type="button"
          className="panel-resize-handle panel-resize-handle-right"
          onPointerDown={onResizeStart}
          aria-label="Resize navigation panel"
          title="Resize navigation panel"
        />
      ) : null}
    </aside>
  );
}
