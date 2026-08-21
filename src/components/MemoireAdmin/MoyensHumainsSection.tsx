import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { Input } from '../ui/Input';
import { saveMoyensHumains } from '../../lib/memoire/memoireApi';
import { INTERLOCUTEURS } from '../../types/memoire';
import type { CorpsDeMetier, Interlocuteur } from '../../types/memoire';

interface MoyensHumainsSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  moyensHumainsParInterlocuteur: Partial<Record<Interlocuteur, string>>;
  techniciensParInterlocuteur: Partial<Record<Interlocuteur, string[]>>;
  onSaved: () => void;
}

const textareaClassName =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[160px]';

export function MoyensHumainsSection({
  password,
  corpsDeMetier,
  moyensHumainsParInterlocuteur,
  techniciensParInterlocuteur,
  onSaved,
}: MoyensHumainsSectionProps) {
  const [selected, setSelected] = useState<Interlocuteur>(INTERLOCUTEURS[0]);
  const [contenu, setContenu] = useState(moyensHumainsParInterlocuteur[selected] ?? '');
  const [techniciens, setTechniciens] = useState<string[]>(techniciensParInterlocuteur[selected] ?? []);
  const [newTechnicien, setNewTechnicien] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContenu(moyensHumainsParInterlocuteur[selected] ?? '');
    setTechniciens(techniciensParInterlocuteur[selected] ?? []);
  }, [selected, moyensHumainsParInterlocuteur, techniciensParInterlocuteur]);

  function handleAddTechnicien() {
    const trimmed = newTechnicien.trim();
    if (!trimmed) return;
    setTechniciens([...techniciens, trimmed]);
    setNewTechnicien('');
  }

  function handleRemoveTechnicien(index: number) {
    setTechniciens(techniciens.filter((_, i) => i !== index));
  }

  function handleMoveTechnicien(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= techniciens.length) return;
    const next = [...techniciens];
    [next[index], next[target]] = [next[target], next[index]];
    setTechniciens(next);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveMoyensHumains(password, corpsDeMetier, selected, contenu, techniciens);
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
        Chaque interlocuteur gère des ressources différentes : renseigne les moyens humains propres à
        chacun. Ce contenu change rarement une fois rempli.
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
          Techniciens de {selected}, par ordre de priorité
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Quand un mémoire est généré avec par exemple 4 personnes affectées au chantier, l'IA
          nomme {selected} (interlocuteur) + les 3 premiers techniciens de cette liste, toujours
          dans cet ordre et jamais d'autres noms inventés. Une ligne par technicien (nom, rôle,
          habilitations...).
        </p>

        {techniciens.length > 0 && (
          <ul className="space-y-1 mb-3">
            {techniciens.map((technicien, index) => (
              <li
                key={index}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <span className="text-xs text-gray-400 w-5 flex-shrink-0">{index + 1}.</span>
                <span className="flex-1 text-gray-900">{technicien}</span>
                <button
                  onClick={() => handleMoveTechnicien(index, -1)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                  aria-label="Monter"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveTechnicien(index, 1)}
                  disabled={index === techniciens.length - 1}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400"
                  aria-label="Descendre"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleRemoveTechnicien(index)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label="Retirer"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="ex : David DURAND – Chef d'équipe, habilitation BR"
            value={newTechnicien}
            onChange={(e) => setNewTechnicien(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTechnicien();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={handleAddTechnicien}>
            Ajouter
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contexte / notes générales — {selected}
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Infos libres (méthode de travail de l'équipe, organisation, présentation de{' '}
          {selected}...) — vient en complément de la liste de techniciens ci-dessus.
        </p>
        <textarea className={textareaClassName} value={contenu} onChange={(e) => setContenu(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
