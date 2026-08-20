import { useState } from 'react';
import { Button } from '../ui/Button';
import { saveAdminConfig, type CompanyInfoFields } from '../../lib/memoire/memoireApi';
import type { CompanyConfig, CorpsDeMetier } from '../../types/memoire';

interface CompanyInfoSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  config: CompanyConfig;
  onSaved: () => void;
}

const textareaClassName =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]';

// [clé dans CompanyConfig, clé attendue par saveAdminConfig, libellé affiché]
const FIELDS: [keyof CompanyConfig, string, string][] = [
  ['presentation', 'presentation', 'Présentation'],
  ['equipe_organigramme', 'equipeOrganigramme', 'Équipe et organigramme (qui fait quoi)'],
  ['taille_entreprise_encadrement', 'tailleEntrepriseEncadrement', "Taille de l'entreprise et encadrement"],
  ['methodes', 'methodes', 'Méthode de travail (comment on suit les interventions)'],
  ['moyens_materiels', 'moyensMateriels', 'Matériel (outils, protections)'],
  ['informatique_logiciels', 'informatiqueLogiciels', 'Informatique et logiciels'],
  ['stock_fournisseurs', 'stockFournisseurs', 'Stock et fournisseurs (logistique)'],
  ['choix_fournisseurs', 'choixFournisseurs', 'Choix des fournisseurs'],
  ['organisation_chantier', 'organisationChantier', 'Organisation sur le chantier'],
  ['gestion_astreintes', 'gestionAstreintes', 'Gestion des astreintes'],
  ['gestion_milieu_occupe', 'gestionMilieuOccupe', 'Gestion en milieu occupé'],
  ['relation_locataires', 'relationLocataires', 'Relation avec les locataires'],
  ['securite_generale', 'securiteGenerale', 'Sécurité générale'],
  ['amiante', 'amiante', 'Amiante (procédure à part)'],
  ['qualite_autocontrole', 'qualiteAutocontrole', 'Qualité et autocontrôle'],
  ['references_chantiers', 'referencesChantiers', 'Références (chantiers déjà faits)'],
  ['certifications', 'certifications', 'Certifications'],
  ['insertion_professionnelle', 'insertionProfessionnelle', "Insertion professionnelle (aide à l'emploi)"],
  ['environnement', 'environnement', 'Environnement (déchets, énergie, mobilité)'],
  ['rse', 'rse', 'RSE'],
];

export function CompanyInfoSection({ password, corpsDeMetier, config, onSaved }: CompanyInfoSectionProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map(([key]) => [key, config[key]]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const fields = Object.fromEntries(
        FIELDS.map(([key, paramKey]) => [paramKey, values[key] ?? ''])
      ) as unknown as CompanyInfoFields;
      await saveAdminConfig(password, corpsDeMetier, {
        systemPrompt: config.system_prompt,
        structurePrompt: config.structure_prompt,
        ...fields,
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

      {FIELDS.map(([key, , label]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <textarea
            className={textareaClassName}
            value={values[key] ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
