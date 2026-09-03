import { useEffect, useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { CORPS_DE_METIER } from '../../types/memoire';
import type { InterlocuteurPerson } from '../../types/memoire';
import { listInterlocuteurs } from '../../lib/memoire/memoireApi';

export function StartForm() {
  const {
    interlocuteur,
    corpsDeMetier,
    nombrePersonnes,
    setInterlocuteur,
    setCorpsDeMetier,
    setNombrePersonnes,
    setStep,
  } = useMemoireStore();

  const [interlocuteurs, setInterlocuteurs] = useState<InterlocuteurPerson[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listInterlocuteurs()
      .then(setInterlocuteurs)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erreur inconnue'));
  }, []);

  const canContinue = Boolean(interlocuteur && corpsDeMetier && nombrePersonnes);

  return (
    <div className="max-w-lg mx-auto py-12">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Nouveau mémoire technique</h2>
      <p className="text-sm text-gray-600 mb-6">
        Renseigne l'interlocuteur et le corps de métier concernés avant de démarrer.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interlocuteur principal</label>
          <div className="flex flex-wrap gap-2">
            {interlocuteurs.map(({ prenom, nom }) => (
              <Chip
                key={prenom}
                selected={interlocuteur === prenom}
                onClick={() => setInterlocuteur(prenom)}
              >
                {nom ? `${prenom} ${nom}` : prenom}
              </Chip>
            ))}
          </div>
          {loadError && <p className="text-sm text-red-600 mt-1">{loadError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Corps de métier concerné</label>
          <div className="flex flex-wrap gap-2">
            {CORPS_DE_METIER.map((metier) => (
              <Chip
                key={metier}
                selected={corpsDeMetier === metier}
                onClick={() => setCorpsDeMetier(metier)}
              >
                {metier}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de personnes affectées au chantier
          </label>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <Chip key={n} selected={nombrePersonnes === n} onClick={() => setNombrePersonnes(n)}>
                {n}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button disabled={!canContinue} onClick={() => setStep('premoire')}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
