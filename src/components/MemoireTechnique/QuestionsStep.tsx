import { useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';

export function QuestionsStep() {
  const { thematiques, setThematiques, setStep } = useMemoireStore();
  const [current, setCurrent] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const trimmedCurrent = current.trim();
  const isEditing = editingIndex !== null;

  function handleValidateQuestion() {
    if (!trimmedCurrent) return;

    if (isEditing) {
      const updated = [...thematiques];
      updated[editingIndex] = trimmedCurrent;
      setThematiques(updated);
      setEditingIndex(null);
    } else {
      setThematiques([...thematiques, trimmedCurrent]);
    }
    setCurrent('');
  }

  function handleEdit(index: number) {
    setEditingIndex(index);
    setCurrent(thematiques[index]);
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setCurrent('');
  }

  function handleRemove(index: number) {
    setThematiques(thematiques.filter((_, i) => i !== index));
    if (editingIndex === index) {
      handleCancelEdit();
    }
  }

  function handleContinue() {
    setStep('upload');
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Questions du mémoire</h2>
      <p className="text-sm text-gray-600 mb-6">
        Ajoute les questions/critères exacts de cet appel d'offres une par une (avec le nombre de
        points entre parenthèses si tu les as). Une question peut tenir sur plusieurs lignes. Valide
        chaque question pour l'ajouter à la liste. L'IA rédigera une section par question, en répondant
        uniquement à ce qui est demandé — rien de plus.
      </p>

      {thematiques.length > 0 && (
        <ul className="mb-6 space-y-2">
          {thematiques.map((question, index) => (
            <li
              key={index}
              className={`rounded-lg border px-3 py-2 ${
                editingIndex === index ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 text-xs font-medium text-gray-400">
                  {index + 1}
                </span>
                <p className="flex-1 whitespace-pre-wrap text-sm text-gray-900">{question}</p>
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="text-xs text-gray-400 hover:text-blue-600"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-gray-300 p-3">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          {isEditing ? `Modifier la question ${editingIndex! + 1}` : 'Nouvelle question'}
        </label>
        <textarea
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          rows={4}
          placeholder={
            "Méthodologie et organisation du candidat (20 points)\n" +
            "Peut continuer sur plusieurs lignes si besoin de préciser le critère…"
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-2 flex justify-end gap-2">
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              Annuler
            </Button>
          )}
          <Button size="sm" disabled={!trimmedCurrent} onClick={handleValidateQuestion}>
            {isEditing ? 'Enregistrer la question' : 'Valider la question'}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {thematiques.length} question{thematiques.length !== 1 ? 's' : ''} validée
        {thematiques.length !== 1 ? 's' : ''}
      </p>

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={() => setStep('start')}>
          Retour
        </Button>
        <Button disabled={thematiques.length === 0} onClick={handleContinue}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
