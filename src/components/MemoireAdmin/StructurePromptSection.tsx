import { useState } from 'react';
import { Button } from '../ui/Button';
import { saveAdminConfig, companyInfoFieldsFrom } from '../../lib/memoire/memoireApi';
import type { CompanyConfig, CorpsDeMetier } from '../../types/memoire';

interface StructurePromptSectionProps {
  password: string;
  corpsDeMetier: CorpsDeMetier;
  config: CompanyConfig;
  onSaved: () => void;
}

// Uniquement affiché en placeholder (texte gris, jamais envoyé/enregistré) : des exemples
// concrets de ce qui a sa place dans ce champ, pour rappel à chaque ouverture tant que rien n'a
// été saisi — des consignes de contenu/style que Claude peut suivre en écrivant du texte, jamais
// des specs techniques de mise en page (déjà gérées ailleurs dans le code).
const STRUCTURE_PLACEHOLDER = `Organisation du contenu
- Pour toute thématique équipe/personnel, présente toujours la composition sous forme de tableau (nom, rôle, habilitations).
- Pour les thématiques planning, présente toujours un tableau phase/durée/intervenants.
- Commence chaque section par un court paragraphe de contexte avant les sous-parties.

Citation du CCTP
- Cite toujours le numéro d'article exact du CCTP en gras avant d'expliquer la réponse de l'entreprise.
- Une citation par exigence traitée, jamais de recopie de paragraphe entier.

Ton et vocabulaire
- Utilise systématiquement le vocabulaire suivant : ... (termes maison, noms d'outils internes comme Airtable, VisioSoft...).
- Évite le conditionnel, privilégie les phrases affirmatives et actives.

Longueur / densité
- Limite chaque sous-partie à 2-3 paragraphes maximum, privilégie les listes à puces pour les points d'exécution.`;

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
        ...companyInfoFieldsFrom(config),
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
        Consignes de contenu et de style optionnelles (ex : toujours présenter l'équipe en tableau,
        citer précisément les articles du CCTP, éviter certaines tournures...). La mise en page
        visuelle (titres, couleurs, tableaux Word) est déjà entièrement gérée par ailleurs — ce champ
        sert uniquement à orienter ce que Claude écrit, pas comment le document est mis en forme.
        Laisser vide fonctionne très bien : ce n'est utile que si tu veux standardiser un point
        précis.
      </p>

      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[320px]"
        value={structurePrompt}
        onChange={(e) => setStructurePrompt(e.target.value)}
        placeholder={STRUCTURE_PLACEHOLDER}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </Button>
    </div>
  );
}
