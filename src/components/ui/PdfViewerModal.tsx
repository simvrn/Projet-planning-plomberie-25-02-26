import { useEffect } from 'react';

interface PdfViewerModalProps {
  pdfDataUrl: string;
  pdfName: string;
  onClose: () => void;
}

export function PdfViewerModal({ pdfDataUrl, pdfName, onClose }: PdfViewerModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Fond sombre */}
      <div className="fixed inset-0 bg-black/80 z-50" onClick={onClose} />

      {/* Fenêtre PDF */}
      <div className="fixed inset-4 z-50 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Barre de titre */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
              <path d="M8.5 14.5h1.5v1.5H8.5zm0-3h1.5v1.5H8.5zm3 3h3.5v1.5H11.5zm0-3h3.5v1.5H11.5z" />
            </svg>
            <span className="text-sm font-medium text-gray-800 truncate max-w-xs">{pdfName}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-800"
            title="Fermer (Échap)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Iframe PDF */}
        <iframe
          src={pdfDataUrl}
          className="flex-1 w-full"
          title={pdfName}
        />
      </div>
    </>
  );
}
