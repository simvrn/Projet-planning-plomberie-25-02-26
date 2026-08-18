import { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { extractTextFromFile } from '../../lib/memoire/textExtraction';
import { uploadReferenceDoc, deleteReferenceDoc } from '../../lib/memoire/memoireApi';
import type { CorpsDeMetier, ReferenceDoc } from '../../types/memoire';

interface ReferenceDocsSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  referenceDocs: ReferenceDoc[];
  onChanged: () => void;
}

export function ReferenceDocsSection({ password, corpsDeMetier, referenceDocs, onChanged }: ReferenceDocsSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const extractedText = await extractTextFromFile(file);
      await uploadReferenceDoc(password, file, corpsDeMetier, extractedText);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteReferenceDoc(password, id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Mémoires de référence — {corpsDeMetier}</h3>
        <p className="text-sm text-gray-600">
          Mémoires techniques déjà rédigés par l'entreprise pour ce corps de métier, utilisés comme
          exemples de style (jamais repris tels quels pour la partie spécifique au projet).
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
        disabled={uploading}
        className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {uploading && <p className="text-sm text-gray-500">Envoi en cours...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {referenceDocs.length === 0 && <p className="text-sm text-gray-500">Aucun mémoire de référence pour ce corps de métier.</p>}
        {referenceDocs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <p className="truncate text-gray-900">{doc.file_name}</p>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
              Supprimer
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
