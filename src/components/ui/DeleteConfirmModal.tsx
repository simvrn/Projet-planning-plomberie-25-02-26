import { useEffect } from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, onConfirm, onCancel }: DeleteConfirmModalProps) {
  // Fermer avec Échap
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      {/* Fond semi-transparent */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onCancel}
      />

      {/* Fenêtre de confirmation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4">
        <div
          className="bg-white rounded-2xl shadow-2xl pointer-events-auto w-full max-w-md border border-gray-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* En-tête coloré */}
          <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-red-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Supprimer l'intervention
              </h3>
              <p className="text-sm text-red-600 font-medium mt-0.5">
                Action irréversible
              </p>
            </div>
          </div>

          {/* Corps */}
          <div className="px-6 py-6">
            <p className="text-base text-gray-700 leading-relaxed">
              Êtes-vous sûr de vouloir{' '}
              <span className="font-semibold text-gray-900">
                supprimer cette intervention
              </span>{' '}
              ? Cette action ne peut pas être annulée.
            </p>
          </div>

          {/* Boutons */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
