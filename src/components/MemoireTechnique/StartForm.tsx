import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';
import { CORPS_DE_METIER, INTERLOCUTEURS, THEMATIQUES } from '../../types/memoire';
import type { CorpsDeMetier, Interlocuteur } from '../../types/memoire';

const selectClassName =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export function StartForm() {
  const {
    interlocuteur,
    corpsDeMetier,
    thematiques,
    setInterlocuteur,
    setCorpsDeMetier,
    toggleThematique,
    setStep,
  } = useMemoireStore();

  const canContinue = Boolean(interlocuteur && corpsDeMetier && thematiques.length > 0);

  return (
    <div className="max-w-lg mx-auto py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Nouveau mémoire technique</h2>
      <p className="text-sm text-gray-600 mb-6">
        Renseigne l'interlocuteur et le corps de métier concernés avant de démarrer.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interlocuteur principal</label>
          <select
            className={selectClassName}
            value={interlocuteur ?? ''}
            onChange={(e) => setInterlocuteur(e.target.value as Interlocuteur)}
          >
            <option value="" disabled>
              Sélectionner...
            </option>
            {INTERLOCUTEURS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Corps de métier concerné</label>
          <select
            className={selectClassName}
            value={corpsDeMetier ?? ''}
            onChange={(e) => setCorpsDeMetier(e.target.value as CorpsDeMetier)}
          >
            <option value="" disabled>
              Sélectionner...
            </option>
            {CORPS_DE_METIER.map((metier) => (
              <option key={metier} value={metier}>
                {metier}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Thématiques demandées par le CCTP
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Sélectionne les points sur lesquels le mémoire doit répondre (plusieurs choix possibles).
          </p>
          <div className="space-y-2">
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
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button disabled={!canContinue} onClick={() => setStep('upload')}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
