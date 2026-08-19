import { useState } from 'react';
import { Button } from '../ui/Button';
import { saveAdminConfig } from '../../lib/memoire/memoireApi';
import type { CompanyConfig, CorpsDeMetier } from '../../types/memoire';

interface CompanyInfoSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  config: CompanyConfig;
  onSaved: () => void;
}

const textareaClassName =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]';

export function CompanyInfoSection({ password, corpsDeMetier, config, onSaved }: CompanyInfoSectionProps) {
  const [presentation, setPresentation] = useState(config.presentation);
  const [moyensHumains, setMoyensHumains] = useState(config.moyens_humains);
  const [moyensMateriels, setMoyensMateriels] = useState(config.moyens_materiels);
  const [organisationChantier, setOrganisationChantier] = useState(config.organisation_chantier);
  const [gestionAstreintes, setGestionAstreintes] = useState(config.gestion_astreintes);
  const [gestionMilieuOccupe, setGestionMilieuOccupe] = useState(config.gestion_milieu_occupe);
  const [methodes, setMethodes] = useState(config.methodes);
  const [certifications, setCertifications] = useState(config.certifications);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveAdminConfig(password, corpsDeMetier, {
        systemPrompt: config.system_prompt,
        structurePrompt: config.structure_prompt,
        presentation,
        moyensHumains,
        moyensMateriels,
        organisationChantier,
        gestionAstreintes,
        gestionMilieuOccupe,
        methodes,
        certifications,
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
      <h3 className="text-lg font-semibold text-gray-900">Infos entreprise — {corpsDeMetier}</h3>
      <p className="text-sm text-gray-600">
        Ces informations sont injectées dans chaque mémoire technique généré pour ce corps de métier.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Présentation</label>
        <textarea className={textareaClassName} value={presentation} onChange={(e) => setPresentation(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Moyens humains</label>
        <textarea
          className={textareaClassName}
          value={moyensHumains}
          onChange={(e) => setMoyensHumains(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Moyens matériels</label>
        <textarea
          className={textareaClassName}
          value={moyensMateriels}
          onChange={(e) => setMoyensMateriels(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Organisation sur le chantier</label>
        <textarea
          className={textareaClassName}
          value={organisationChantier}
          onChange={(e) => setOrganisationChantier(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gestion des astreintes</label>
        <textarea
          className={textareaClassName}
          value={gestionAstreintes}
          onChange={(e) => setGestionAstreintes(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gestion en milieu occupé</label>
        <textarea
          className={textareaClassName}
          value={gestionMilieuOccupe}
          onChange={(e) => setGestionMilieuOccupe(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Méthodes</label>
        <textarea className={textareaClassName} value={methodes} onChange={(e) => setMethodes(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
        <textarea
          className={textareaClassName}
          value={certifications}
          onChange={(e) => setCertifications(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
