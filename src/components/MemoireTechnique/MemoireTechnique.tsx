import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';
import { StartForm } from './StartForm';
import { ProjectDocsUpload } from './ProjectDocsUpload';
import { MemoireAdminGate } from '../MemoireAdmin/MemoireAdminGate';

function ResultStep() {
  const { downloadUrl, resetWizard, setStep } = useMemoireStore();

  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Mémoire technique généré</h2>
      <p className="text-sm text-gray-600 mb-6">
        Le document a été généré. Ouvre-le dans Word et mets à jour le sommaire (clic droit dessus →
        "Mettre à jour les champs").
      </p>

      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 text-base"
        >
          Télécharger le .docx
        </a>
      )}

      <div className="mt-6">
        <Button
          variant="secondary"
          onClick={() => {
            resetWizard();
            setStep('start');
          }}
        >
          Générer un nouveau mémoire
        </Button>
      </div>
    </div>
  );
}

export function MemoireTechnique() {
  const { view, setView, step } = useMemoireStore();

  if (view === 'admin') {
    return <MemoireAdminGate />;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 pt-4 flex justify-end">
        <button
          onClick={() => setView('admin')}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Espace admin
        </button>
      </div>

      {step === 'start' && <StartForm />}
      {step === 'upload' && <ProjectDocsUpload />}
      {step === 'result' && <ResultStep />}
    </div>
  );
}
