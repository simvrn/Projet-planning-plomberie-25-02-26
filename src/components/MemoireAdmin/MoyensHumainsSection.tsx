import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { saveMoyensHumains } from '../../lib/memoire/memoireApi';
import { INTERLOCUTEURS } from '../../types/memoire';
import type { CorpsDeMetier, Interlocuteur } from '../../types/memoire';

interface MoyensHumainsSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  moyensHumainsParInterlocuteur: Partial<Record<Interlocuteur, string>>;
  onSaved: () => void;
}

const textareaClassName =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[220px]';

export function MoyensHumainsSection({
  password,
  corpsDeMetier,
  moyensHumainsParInterlocuteur,
  onSaved,
}: MoyensHumainsSectionProps) {
  const [selected, setSelected] = useState<Interlocuteur>(INTERLOCUTEURS[0]);
  const [contenu, setContenu] = useState(moyensHumainsParInterlocuteur[selected] ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContenu(moyensHumainsParInterlocuteur[selected] ?? '');
  }, [selected, moyensHumainsParInterlocuteur]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveMoyensHumains(password, corpsDeMetier, selected, contenu);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Moyens humains — {corpsDeMetier}</h3>
      <p className="text-sm text-gray-600">
        Chaque interlocuteur gère des ressources différentes : renseigne les moyens humains
        propres à chacun. Ce contenu change rarement une fois rempli.
      </p>

      <div className="flex flex-wrap gap-2">
        {INTERLOCUTEURS.map((name) => (
          <Chip key={name} selected={selected === name} onClick={() => setSelected(name)}>
            {name}
          </Chip>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Moyens humains — {selected}
        </label>
        <textarea className={textareaClassName} value={contenu} onChange={(e) => setContenu(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
