import { useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';

export function QuestionsStep() {
  const { thematiques, setThematiques, setStep } = useMemoireStore();
  const [text, setText] = useState(thematiques.join('\n'));

  const parsedThematiques = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  function handleContinue() {
    setThematiques(parsedThematiques);
    setStep('upload');
  }

  return (
    <div className="max-w-lg mx-auto py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Questions du mémoire</h2>
      <p className="text-sm text-gray-600 mb-6">
        Colle ici les questions/critères exacts de cet appel d'offres, une par ligne (avec le nombre de
        points entre parenthèses si tu les as). L'IA rédigera une section par question, en répondant
        uniquement à ce qui est demandé — rien de plus.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder={
          'Méthodologie et organisation du candidat (20 points)\n' +
          'Moyens techniques et matériels et humains dédiés à ces travaux (20 points)\n' +
          'Planning travaux avec description organisation et cohérence par rapport aux moyens en oeuvre (15 points)\n' +
          "Mesures proposées concernant l'hygiène et la propreté du chantier et la sécurité (5 points)"
        }
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="mt-1 text-xs text-gray-400">
        {parsedThematiques.length} question{parsedThematiques.length !== 1 ? 's' : ''} détectée
        {parsedThematiques.length !== 1 ? 's' : ''}
      </p>

      <div className="mt-8 flex justify-between">
        <Button variant="secondary" onClick={() => setStep('start')}>
          Retour
        </Button>
        <Button disabled={parsedThematiques.length === 0} onClick={handleContinue}>
          Valider
        </Button>
      </div>
    </div>
  );
}
