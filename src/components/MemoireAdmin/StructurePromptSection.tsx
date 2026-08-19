import { useState } from 'react';
import { Button } from '../ui/Button';
import { saveAdminConfig } from '../../lib/memoire/memoireApi';
import type { CompanyConfig, CorpsDeMetier } from '../../types/memoire';

interface StructurePromptSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  config: CompanyConfig;
  onSaved: () => void;
}

export function StructurePromptSection({ password, corpsDeMetier, config, onSaved }: StructurePromptSectionProps) {
  const [structurePrompt, setStructurePrompt] = useState(config.structure_prompt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveAdminConfig(password, corpsDeMetier, {
        systemPrompt: config.system_prompt,
        structurePrompt,
        presentation: config.presentation,
        moyensMateriels: config.moyens_materiels,
        organisationChantier: config.organisation_chantier,
        gestionAstreintes: config.gestion_astreintes,
        gestionMilieuOccupe: config.gestion_milieu_occupe,
        methodes: config.methodes,
        certifications: config.certifications,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Structure / mise en page — {corpsDeMetier}</h3>
      <p className="text-sm text-gray-600">
        Décris l'ordre des sections et la mise en page attendue (ex: "1. Présentation de l'entreprise,
        2. Moyens humains, 3. Moyens matériels, 4. Organisation de chantier...") pour que tous les
        mémoires de ce corps de métier suivent la même structure. Laisser vide pour laisser l'IA
        structurer librement.
      </p>

      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[320px]"
        value={structurePrompt}
        onChange={(e) => setStructurePrompt(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
