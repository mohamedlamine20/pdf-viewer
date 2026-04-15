import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './App.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function App() {
  const viewerRef = useRef(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(720);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!viewerRef.current) {
      return undefined;
    }

    const element = viewerRef.current;
    const updatePageWidth = () => {
      const nextWidth = Math.max(240, Math.floor(element.clientWidth - 32));
      setPageWidth(nextWidth);
    };

    updatePageWidth();

    const observer = new ResizeObserver(updatePageWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const resetViewer = () => {
    setPdfFile(null);
    setPageNumber(1);
    setNumPages(0);
    setErrorMessage('');
  };

  const handleFileSelection = (file) => {
    if (!file) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setPdfFile(null);
      setPageNumber(1);
      setNumPages(0);
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setPdfFile(file);
    setPageNumber(1);
    setNumPages(0);
    setErrorMessage('');
  };

  const handleDocumentLoad = ({ numPages: totalPages }) => {
    setNumPages(totalPages);
    setPageNumber((currentPage) => Math.min(currentPage, totalPages));
  };

  const goToPreviousPage = () => {
    setPageNumber((currentPage) => Math.max(currentPage - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((currentPage) => Math.min(currentPage + 1, numPages));
  };

  const hasPdf = Boolean(pdfFile);

  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="hero">
          <div>
            <p className="eyebrow">React PDF Viewer</p>
            <h1>Read PDFs on any screen size.</h1>
            <p className="subtitle">
              Upload a PDF and the page will automatically fit the available space on desktop,
              tablet, and mobile.
            </p>
          </div>

          <label className="upload-button">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                handleFileSelection(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
            Choose PDF
          </label>
        </header>

        <section className="toolbar" aria-live="polite">
          <div className="toolbar-group">
            <button type="button" onClick={goToPreviousPage} disabled={!hasPdf || pageNumber === 1}>
              Previous
            </button>
            <button type="button" onClick={goToNextPage} disabled={!hasPdf || pageNumber === numPages}>
              Next
            </button>
            <button type="button" className="ghost-button" onClick={resetViewer} disabled={!hasPdf}>
              Clear
            </button>
          </div>

          <div className="status-group">
            <span className="status-pill">
              {hasPdf ? `Page ${pageNumber} of ${numPages || '...'}` : 'No PDF selected'}
            </span>
            <span className="file-name">{hasPdf ? pdfFile.name : 'Choose a file to start reading.'}</span>
          </div>
        </section>

        <main className="viewer-panel">
          <div className="viewer-stage" ref={viewerRef}>
            {!hasPdf && (
              <div className="empty-state">
                <h2>Open a PDF</h2>
                <p>Select a local `.pdf` file to preview it inside the app.</p>
              </div>
            )}

            {hasPdf && (
              <Document
                file={pdfFile}
                onLoadSuccess={handleDocumentLoad}
                onLoadError={() => setErrorMessage('The PDF could not be loaded.')}
                loading={<p className="viewer-message">Loading PDF...</p>}
                error={<p className="viewer-message">{errorMessage || 'The PDF could not be loaded.'}</p>}
              >
                <Page pageNumber={pageNumber} width={pageWidth} loading={null} />
              </Document>
            )}

            {!hasPdf && errorMessage && <p className="viewer-message">{errorMessage}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
