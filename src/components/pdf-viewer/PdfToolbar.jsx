import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  FitPageIcon,
  FitWidthIcon,
  FullscreenIcon,
  LinkIcon,
  MoonIcon,
  OpenInNewIcon,
  PanelRightIcon,
  PrintIcon,
  RotateIcon,
  SearchIcon,
  SidebarIcon,
  SunIcon,
  UploadIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons.jsx';

function ToolbarButton({ children, icon, isActive = false, className = '', label, ...props }) {
  return (
    <button
      type="button"
      className={`toolbar-button ${isActive ? 'is-active' : ''} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon}
      {children ? <span className="toolbar-button-label">{children}</span> : null}
    </button>
  );
}

export default function PdfToolbar({
  fileName,
  sourceLabel,
  urlInput,
  onUrlInputChange,
  onLoadUrl,
  onFileSelect,
  pageInput,
  pageNumber,
  numPages,
  onPageInputChange,
  onPageInputCommit,
  onPreviousPage,
  onNextPage,
  searchOpen,
  searchQuery,
  searchSummary,
  isSearchBusy,
  searchInputRef,
  onToggleSearch,
  onSearchChange,
  onSearchNext,
  onSearchPrevious,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onFitPage,
  onRotate,
  zoomPercentage,
  fitMode,
  onToggleSidebar,
  onToggleDetails,
  isSidebarOpen,
  isDetailsOpen,
  onToggleTheme,
  theme,
  onDownload,
  onPrint,
  onOpenInNewTab,
  onFullscreen,
  hasDocument,
}) {
  return (
    <header className="viewer-topbar">
      <div className="viewer-header-row">
        <div className="viewer-title-block">
          <span className="viewer-title-icon" aria-hidden="true">
            <FileIcon />
          </span>

          <div className="viewer-title-copy">
            <p className="viewer-eyebrow">Drive-style preview</p>
            <h1>{fileName}</h1>
            <span className="viewer-source-chip">{sourceLabel}</span>
          </div>
        </div>

        <div className="viewer-header-actions">
          <form className="toolbar-url-form" onSubmit={onLoadUrl}>
            <label className="toolbar-input toolbar-url-input">
              <LinkIcon />
              <input
                type="url"
                value={urlInput}
                onChange={(event) => onUrlInputChange(event.target.value)}
                placeholder="Paste a PDF URL"
                aria-label="PDF URL"
              />
            </label>
            <button type="submit" className="toolbar-button toolbar-button-primary">
              <span>Open URL</span>
            </button>
          </form>

          <label className="toolbar-button toolbar-button-primary toolbar-upload-button" title="Upload PDF">
            <UploadIcon />
            <span>Upload</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                onFileSelect(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
          </label>
        </div>
      </div>

      <div className="viewer-toolbar-row" role="toolbar" aria-label="PDF controls">
        <div className="toolbar-cluster toolbar-cluster-toggles">
          <ToolbarButton
            icon={<SidebarIcon />}
            isActive={isSidebarOpen}
            label="Toggle thumbnails"
            onClick={onToggleSidebar}
          />
          <ToolbarButton
            icon={<PanelRightIcon />}
            isActive={isDetailsOpen}
            label="Toggle details panel"
            onClick={onToggleDetails}
          />
        </div>

        <div className="toolbar-cluster toolbar-cluster-navigation">
          <ToolbarButton
            icon={<ChevronLeftIcon />}
            label="Previous page"
            onClick={onPreviousPage}
            disabled={!hasDocument || pageNumber <= 1}
          />
          <label className="toolbar-page-indicator">
            <input
              type="number"
              min="1"
              max={numPages || 1}
              value={pageInput}
              onChange={(event) => onPageInputChange(event.target.value)}
              onBlur={onPageInputCommit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onPageInputCommit();
                }
              }}
              aria-label="Current page"
              disabled={!hasDocument}
            />
            <span>/ {numPages || 0}</span>
          </label>
          <ToolbarButton
            icon={<ChevronRightIcon />}
            label="Next page"
            onClick={onNextPage}
            disabled={!hasDocument || pageNumber >= numPages}
          />
        </div>

        <div className="toolbar-cluster toolbar-cluster-zoom">
          <ToolbarButton icon={<ZoomOutIcon />} label="Zoom out" onClick={onZoomOut} disabled={!hasDocument} />
          <span className="toolbar-zoom-chip" aria-live="polite">
            {zoomPercentage}
          </span>
          <ToolbarButton icon={<ZoomInIcon />} label="Zoom in" onClick={onZoomIn} disabled={!hasDocument} />
          <ToolbarButton
            icon={<FitWidthIcon />}
            isActive={fitMode === 'width'}
            label="Fit to width"
            onClick={onFitWidth}
            disabled={!hasDocument}
          >
            Fit width
          </ToolbarButton>
          <ToolbarButton
            icon={<FitPageIcon />}
            isActive={fitMode === 'page'}
            label="Fit to page"
            onClick={onFitPage}
            disabled={!hasDocument}
          >
            Fit page
          </ToolbarButton>
            <ToolbarButton icon={<RotateIcon />} label="Rotate" onClick={onRotate} disabled={!hasDocument} />
        </div>

        <div className={`toolbar-cluster toolbar-cluster-search toolbar-search ${searchOpen ? 'is-open' : ''}`}>
          <ToolbarButton icon={<SearchIcon />} label="Search" onClick={onToggleSearch} isActive={searchOpen}>
            Search
          </ToolbarButton>

          <div className="toolbar-search-panel">
            <label className="toolbar-input toolbar-search-input">
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search in document"
                aria-label="Search inside the PDF"
                disabled={!hasDocument}
              />
            </label>

            <span className="toolbar-search-summary" aria-live="polite">
              {isSearchBusy ? 'Indexing…' : searchSummary}
            </span>

            <ToolbarButton
              icon={<ChevronLeftIcon />}
              label="Previous match"
              onClick={onSearchPrevious}
              disabled={!hasDocument || !searchQuery.trim()}
            />
            <ToolbarButton
              icon={<ChevronRightIcon />}
              label="Next match"
              onClick={onSearchNext}
              disabled={!hasDocument || !searchQuery.trim()}
            />
          </div>
        </div>

        <div className="toolbar-cluster toolbar-cluster-actions toolbar-end-cluster">
          <ToolbarButton icon={<OpenInNewIcon />} label="Open in new tab" onClick={onOpenInNewTab} disabled={!hasDocument} />
          <ToolbarButton icon={<DownloadIcon />} label="Download" onClick={onDownload} disabled={!hasDocument} />
          <ToolbarButton icon={<PrintIcon />} label="Print" onClick={onPrint} disabled={!hasDocument} />
          <ToolbarButton icon={<FullscreenIcon />} label="Fullscreen" onClick={onFullscreen} disabled={!hasDocument} />
          <ToolbarButton
            icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={onToggleTheme}
          />
        </div>
      </div>
    </header>
  );
}
