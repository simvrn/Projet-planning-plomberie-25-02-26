import { useState } from 'react';
import { useMemoireStore } from '../../store/useMemoireStore';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Input } from '../ui/Input';
import { CORPS_DE_METIER, INTERLOCUTEURS, THEMATIQUES } from '../../types/memoire';
import { PdfToTxtTool } from './PdfToTxtTool';

export function StartForm() {
  const {
    interlocuteur,
    corpsDeMetier,
    thematiques,
    nombrePersonnes,
    setInterlocuteur,
    setCorpsDeMetier,
    toggleThematique,
    addCustomThematique,
    removeCustomThematique,
    setNombrePersonnes,
    setStep,
  } = useMemoireStore();

  const [customThematique, setCustomThematique] = useState('');
  const customThematiques = thematiques.filter((t) => !THEMATIQUES.includes(t as (typeof THEMATIQUES)[number]));

  function handleAddCustomThematique() {
    addCustomThematique(customThematique);
    setCustomThematique('');
  }

  const canContinue = Boolean(
    interlocuteur && corpsDeMetier && nombrePersonnes && thematiques.length > 0
  );

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
            {INTERLOCUTEURS.map((name) => (
              <Chip
                key={name}
                selected={interlocuteur === name}
                onClick={() => setInterlocuteur(name)}
              >
                {name}
              </Chip>
            ))}
          </div>
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
      </div>

      <div className="mt-8 flex justify-end">
        <Button disabled={!canContinue} onClick={() => setStep('upload')}>
          Continuer
        </Button>
      </div>

      <PdfToTxtTool />
    </div>
  );
}
