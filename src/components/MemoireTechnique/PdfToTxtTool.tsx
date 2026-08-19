import { useRef, useState } from 'react';
import { extractTextFromFile } from '../../lib/memoire/textExtraction';

type ToolStatus = 'idle' | 'converting' | 'done' | 'error';

export function PdfToTxtTool() {
  const [status, setStatus] = useState<ToolStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setStatus('converting');
    setError(null);
    try {
      const text = await extractTextFromFile(file);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${baseName}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setStatus('error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-10 border-t border-gray-200 pt-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Convertir un PDF en texte (.txt)</h3>
      <p className="text-xs text-gray-500 mb-3">
        Petit outil indépendant : uploade un PDF, le texte extrait est téléchargé directement en .txt.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
        disabled={status === 'converting'}
        className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
      />

      {status === 'converting' && <p className="text-xs text-gray-500 mt-2">Conversion en cours...</p>}
      {status === 'done' && <p className="text-xs text-green-600 mt-2">Fichier .txt téléchargé.</p>}
      {status === 'error' && <p className="text-xs text-red-600 mt-2">Erreur : {error}</p>}
    </div>
  );
}
