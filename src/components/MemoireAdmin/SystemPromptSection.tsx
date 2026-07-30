import { useState } from 'react';
import { Button } from '../ui/Button';
import { saveAdminConfig } from '../../lib/memoire/memoireApi';
import type { CompanyConfig } from '../../types/memoire';

interface SystemPromptSectionProps {
  password: string;
  config: CompanyConfig;
  onSaved: () => void;
}

export function SystemPromptSection({ password, config, onSaved }: SystemPromptSectionProps) {
  const [systemPrompt, setSystemPrompt] = useState(config.system_prompt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveAdminConfig(password, {
        systemPrompt,
        presentation: config.presentation,
        moyens: config.moyens,
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
      <h3 className="text-lg font-semibold text-gray-900">Prompt système</h3>
      <p className="text-sm text-gray-600">
        Instructions données à l'IA pour rédiger les mémoires techniques (ton, structure attendue,
        règles à respecter...). Laisser vide pour utiliser le prompt par défaut.
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
