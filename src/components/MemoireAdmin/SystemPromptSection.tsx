import { useState } from 'react';
import { Button } from '../ui/Button';
import { saveAdminConfig } from '../../lib/memoire/memoireApi';
import type { CompanyConfig, CorpsDeMetier } from '../../types/memoire';

interface SystemPromptSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  config: CompanyConfig;
  onSaved: () => void;
}

export function SystemPromptSection({ password, corpsDeMetier, config, onSaved }: SystemPromptSectionProps) {
  const [systemPrompt, setSystemPrompt] = useState(config.system_prompt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveAdminConfig(password, corpsDeMetier, {
        systemPrompt,
        structurePrompt: config.structure_prompt,
        presentation: config.presentation,
        moyensMateriels: config.moyens_materiels,
        organisationChantier: config.organisation_chantier,
        gestionAstreintes: config.gestion_astreintes,
        gestionMilieuOccupe: config.gestion_milieu_occupe,
        methodes: config.methodes,
        certifications: config.certifications,
        rse: config.rse,
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
      <h3 className="text-lg font-semibold text-gray-900">Prompt système — {corpsDeMetier}</h3>
      <p className="text-sm text-gray-600">
        Instructions données à l'IA pour rédiger les mémoires techniques de ce corps de métier (ton,
        structure attendue, règles à respecter...). Laisser vide pour utiliser le prompt par défaut.
      </p>

      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[320px]"
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
