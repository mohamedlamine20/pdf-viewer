import { formatBytes, formatFitMode, formatPageSize, getSourceLabel } from '../../lib/pdfUtils.js';
import { CloseIcon } from './icons.jsx';

function DetailRow({ label, value }) {
  return (
    <div className="details-row">
      <dt>{label}</dt>
      <dd>{value || 'Unavailable'}</dd>
    </div>
  );
}

export default function PdfDetailsPanel({
  isOpen,
  style,
  isMobileLayout,
  onClose,
  onResizeStart,
  fileName,
  sourceType,
  fileSize,
  numPages,
  pageNumber,
  zoomPercentage,
  fitMode,
  rotation,
  pageSize,
  metadata,
  searchSummary,
  isSearchIndexing,
}) {
  const info = metadata?.info ?? {};

  return (
    <aside className={`details-panel ${isOpen ? 'is-open' : ''}`} aria-label="Document details" style={style}>
      <div className="panel-heading">
        <div>
          <p>Details</p>
          <span>Document properties</span>
        </div>

        <button type="button" className="panel-close-button" onClick={onClose} aria-label="Close details panel">
          <CloseIcon />
        </button>
      </div>

      <div className="details-scroll">
        <section className="details-section">
          <h2>Overview</h2>
          <dl>
            <DetailRow label="Name" value={fileName} />
            <DetailRow label="Source" value={getSourceLabel(sourceType)} />
            <DetailRow label="Size" value={formatBytes(fileSize)} />
            <DetailRow label="Pages" value={numPages} />
            <DetailRow label="Current page" value={pageNumber} />
          </dl>
        </section>

        <section className="details-section">
          <h2>View</h2>
          <dl>
            <DetailRow label="Zoom" value={zoomPercentage} />
            <DetailRow label="Mode" value={formatFitMode(fitMode)} />
            <DetailRow label="Rotation" value={`${rotation}deg`} />
            <DetailRow label="Page size" value={formatPageSize(pageSize)} />
          </dl>
        </section>

        <section className="details-section">
          <h2>Search</h2>
          <dl>
            <DetailRow label="Status" value={isSearchIndexing ? 'Indexing text layer' : searchSummary} />
          </dl>
        </section>

        <section className="details-section">
          <h2>Metadata</h2>
          <dl>
            <DetailRow label="Title" value={info.Title} />
            <DetailRow label="Author" value={info.Author} />
            <DetailRow label="Subject" value={info.Subject} />
            <DetailRow label="Creator" value={info.Creator} />
            <DetailRow label="Producer" value={info.Producer} />
            <DetailRow label="PDF version" value={info.PDFFormatVersion} />
          </dl>
        </section>
      </div>

      {!isMobileLayout && isOpen ? (
        <button
          type="button"
          className="panel-resize-handle panel-resize-handle-left"
          onPointerDown={onResizeStart}
          aria-label="Resize details panel"
          title="Resize details panel"
        />
      ) : null}
    </aside>
  );
}
