import { useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { extractTextFromFile } from '../../lib/memoire/textExtraction';
import { uploadReferenceDoc, deleteReferenceDoc } from '../../lib/memoire/memoireApi';
import { CORPS_DE_METIER } from '../../types/memoire';
import type { CorpsDeMetier, ReferenceDoc } from '../../types/memoire';

interface ReferenceDocsSectionProps {
  password: string;
  referenceDocs: ReferenceDoc[];
  onChanged: () => void;
}

const selectClassName =
  'px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export function ReferenceDocsSection({ password, referenceDocs, onChanged }: ReferenceDocsSectionProps) {
  const [corpsDeMetier, setCorpsDeMetier] = useState<CorpsDeMetier | 'Général'>('Général');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const extractedText = await extractTextFromFile(file);
      await uploadReferenceDoc(password, file, corpsDeMetier === 'Général' ? null : corpsDeMetier, extractedText);
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
        <h3 className="text-lg font-semibold text-gray-900">Mémoires de référence</h3>
        <p className="text-sm text-gray-600">
          Mémoires techniques déjà rédigés par l'entreprise, utilisés comme exemples de style (jamais
          repris tels quels pour la partie spécifique au projet).
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          className={selectClassName}
          value={corpsDeMetier}
          onChange={(e) => setCorpsDeMetier(e.target.value as CorpsDeMetier | 'Général')}
        >
          <option value="Général">Général (tous corps de métier)</option>
          {CORPS_DE_METIER.map((metier) => (
            <option key={metier} value={metier}>
              {metier}
            </option>
          ))}
        </select>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => void handleFileSelected(e.target.files?.[0])}
          disabled={uploading}
          className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {uploading && <p className="text-sm text-gray-500">Envoi en cours...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {referenceDocs.length === 0 && <p className="text-sm text-gray-500">Aucun mémoire de référence.</p>}
        {referenceDocs.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-gray-900">{doc.file_name}</p>
              <p className="text-xs text-gray-500">{doc.corps_de_metier ?? 'Général'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
              Supprimer
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
