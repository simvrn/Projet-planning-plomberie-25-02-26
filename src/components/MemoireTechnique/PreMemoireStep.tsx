import { useRef, useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Input } from '../ui/Input';
import { extractTextFromFile } from '../../lib/memoire/textExtraction';
import { analysePreMemoire } from '../../lib/memoire/memoireApi';
import { THEMATIQUES } from '../../types/memoire';

export function PreMemoireStep() {
  const {
    thematiques,
    preMemoireFileName,
    preMemoireText,
    analysisStatus,
    analysisError,
    toggleThematique,
    addCustomThematique,
    removeCustomThematique,
    setPreMemoire,
    startAnalysis,
    setAnalysisSuggestions,
    setAnalysisError,
    setStep,
  } = useMemoireStore();

  const [customThematique, setCustomThematique] = useState('');
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customThematiques = thematiques.filter(
    (t) => !THEMATIQUES.includes(t as (typeof THEMATIQUES)[number])
  );

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      setPreMemoire(file.name, text);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Erreur de lecture du fichier');
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleAnalyse() {
    if (!preMemoireText) return;
    startAnalysis();
    try {
      const { thematiques: suggested } = await analysePreMemoire(preMemoireText);
      setAnalysisSuggestions(suggested);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  function handleAddCustomThematique() {
    addCustomThematique(customThematique);
    setCustomThematique('');
  }

  const canContinue = thematiques.length > 0;

  return (
    <div className="max-w-lg mx-auto py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Pré-mémoire (questions de l'appel d'offres)</h2>
      <p className="text-sm text-gray-600 mb-6">
        Uploade le document qui liste les questions/exigences de l'AO — l'IA propose les thématiques à
        traiter, tu valides ou ajustes ensuite. Ce n'est pas obligatoire : tu peux aussi cocher directement
        à la main plus bas.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => void handleFileSelected(e.target.files?.[0])}
        disabled={extracting}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {extracting && <p className="text-xs text-gray-500 mt-2">Lecture du document...</p>}
      {preMemoireFileName && !extracting && (
        <p className="text-xs text-gray-500 mt-2">Document chargé : {preMemoireFileName}</p>
      )}

      <div className="mt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={!preMemoireText || analysisStatus === 'analyzing'}
          onClick={handleAnalyse}
        >
          {analysisStatus === 'analyzing' ? 'Analyse en cours...' : 'Analyser avec l\'IA'}
        </Button>
      </div>

      {analysisStatus === 'error' && (
        <p className="text-sm text-red-600 mt-2">Erreur d'analyse : {analysisError}</p>
      )}
      {analysisStatus === 'done' && (
        <p className="text-sm text-green-600 mt-2">
          Thématiques proposées ci-dessous — vérifie et ajuste si besoin.
        </p>
      )}

      <div className="mt-8">
        <label className="block text-sm font-medium text-gray-700 mb-1">Thématiques à traiter</label>
        <p className="text-xs text-gray-500 mb-2">
          Sélection proposée par l'IA (ou à cocher toi-même) — plusieurs choix possibles.
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {THEMATIQUES.map((thematique) => (
            <label key={thematique} className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={thematiques.includes(thematique)}
                onChange={() => toggleThematique(thematique)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {thematique}
            </label>
          ))}
        </div>

        {customThematiques.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {customThematiques.map((t) => (
              <Chip key={t} selected onRemove={() => removeCustomThematique(t)}>
                {t}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <Input
            placeholder="Autre thématique non prévue..."
            value={customThematique}
            onChange={(e) => setCustomThematique(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomThematique();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={handleAddCustomThematique}>
            Ajouter
          </Button>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={() => setStep('start')}>
          Retour
        </Button>
        <Button disabled={!canContinue} onClick={() => setStep('upload')}>
          Valider
        </Button>
      </div>
    </div>
  );
}
