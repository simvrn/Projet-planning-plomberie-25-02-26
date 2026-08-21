import { useEffect, useRef, useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';
import { extractTextFromFile } from '../../lib/memoire/textExtraction';
import { uploadProjectDoc, uploadExtractedText, generateMemoireStepByStep } from '../../lib/memoire/memoireApi';
import type { ProjectDocFile } from '../../types/memoire';
import { PdfToTxtTool } from './PdfToTxtTool';

const STATUS_LABEL: Record<ProjectDocFile['status'], string> = {
  extracting: 'Lecture du document...',
  uploading: 'Envoi...',
  ready: 'Prêt',
  error: 'Erreur',
};

export function ProjectDocsUpload() {
  const {
    interlocuteur,
    corpsDeMetier,
    thematiques,
    nombrePersonnes,
    projectDocs,
    addProjectDocs,
    updateProjectDoc,
    removeProjectDoc,
    generationStatus,
    generationProgress,
    generationError,
    startGeneration,
    setGenerationProgress,
    setGenerationSuccess,
    setGenerationError,
    setStep,
  } = useMemoireStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (generationStatus !== 'generating') {
      setElapsedSeconds(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [generationStatus]);

  function formatElapsed(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async function processDoc(doc: ProjectDocFile) {
    try {
      updateProjectDoc(doc.id, { status: 'extracting' });
      const extractedText = await extractTextFromFile(doc.file);
      updateProjectDoc(doc.id, { status: 'uploading', extractedText });
      const [{ storagePath }, { storagePath: textStoragePath }] = await Promise.all([
        uploadProjectDoc(doc.file),
        uploadExtractedText(extractedText),
      ]);
      updateProjectDoc(doc.id, { status: 'ready', storagePath, textStoragePath });
    } catch (err) {
      updateProjectDoc(doc.id, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Erreur inconnue',
      });
    }
  }

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const ids = addProjectDocs(files);
    const newDocs = useMemoireStore.getState().projectDocs.filter((d) => ids.includes(d.id));
    newDocs.forEach((doc) => void processDoc(doc));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const allReady = projectDocs.length > 0 && projectDocs.every((d) => d.status === 'ready');

  async function handleGenerate() {
    if (!interlocuteur || !corpsDeMetier || !nombrePersonnes) return;
    startGeneration();
    try {
      const { downloadUrl, usage } = await generateMemoireStepByStep(
        {
          interlocuteur,
          corpsDeMetier,
          thematiques,
          nombrePersonnes,
          projectDocs: projectDocs.map((d) => ({
            name: d.name,
            textStoragePath: d.textStoragePath!,
          })),
        },
        ({ current, total, thematique }) => setGenerationProgress({ current, total, thematique })
      );
      setGenerationSuccess(downloadUrl, usage);
      setStep('result');
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Documents du projet</h2>
      <p className="text-sm text-gray-600 mb-6">
        Uploade le CCTP, les plans, le cahier des charges... (PDF, Word ou texte). L'IA s'appuiera dessus pour
        rédiger le mémoire.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />

      {projectDocs.length > 0 && (
        <ul className="mt-4 space-y-2">
          {projectDocs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-gray-900">{doc.name}</p>
                <p className={`text-xs ${doc.status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
                  {doc.status === 'error' ? doc.errorMessage : STATUS_LABEL[doc.status]}
                </p>
              </div>
              <button
                onClick={() => removeProjectDoc(doc.id)}
                className="ml-3 text-gray-400 hover:text-red-600 text-sm flex-shrink-0"
                aria-label="Retirer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {generationStatus === 'error' && (
        <p className="mt-4 text-sm text-red-600">Erreur lors de la génération : {generationError}</p>
      )}

      {generationStatus === 'generating' && (
        <p className="mt-4 text-sm text-gray-500">
          {generationProgress
            ? `Rédaction de la thématique ${generationProgress.current}/${generationProgress.total} : « ${generationProgress.thematique} » — (${formatElapsed(elapsedSeconds)})`
            : `Préparation de la génération... (${formatElapsed(elapsedSeconds)})`}
        </p>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={() => setStep('premoire')}>
          Retour
        </Button>
        <Button
          disabled={!allReady || generationStatus === 'generating'}
          onClick={handleGenerate}
        >
          {generationStatus === 'generating'
            ? `Génération en cours... (${formatElapsed(elapsedSeconds)})`
            : 'Générer le mémoire'}
        </Button>
      </div>
      {generationStatus !== 'generating' && (
        <p className="mt-2 text-xs text-gray-400 text-right">
          Peut prendre plusieurs minutes selon le nombre de thématiques sélectionnées.
        </p>
      )}

      <PdfToTxtTool />
    </div>
  );
}
