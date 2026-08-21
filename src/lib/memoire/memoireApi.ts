import { supabase } from '../supabase';
import type { CompanyConfig, CorpsDeMetier, Interlocuteur, ReferenceDoc } from '../../types/memoire';

/**
 * Upload un document projet (PDF, Word ou texte) dans le bucket public "memoire_project_docs".
 * Même logique que uploadPdf() dans src/lib/supabase.ts (bucket dédié à cette fonctionnalité).
 */
export async function uploadProjectDoc(file: File): Promise<{ storagePath: string; publicUrl: string }> {
  const ext = file.name.split('.').pop() || 'bin';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('memoire_project_docs')
    .upload(uniqueName, file, { upsert: false });

  if (error) throw new Error(`Erreur upload document projet : ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from('memoire_project_docs').getPublicUrl(data.path);

  return { storagePath: data.path, publicUrl };
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Le client supabase-js ne remplit PAS `data` quand la fonction renvoie un statut non-2xx :
 * le vrai corps de la réponse (avec notre message d'erreur) se trouve dans `error.context`
 * (la Response brute), qu'il faut relire séparément.
 */
async function extractErrorMessage(error: { context?: unknown; message?: string } | null, data: unknown): Promise<string> {
  const dataObj = data as { error?: string; message?: string } | null;
  if (dataObj?.error) return dataObj.error;
  if (dataObj?.message) return dataObj.message;

  if (error?.context instanceof Response) {
    try {
      const body = await error.context.clone().json();
      if (body?.error) return body.error;
      // Erreurs de plate-forme Supabase (ex: WORKER_RESOURCE_LIMIT) utilisent `.message`, pas `.error`.
      if (body?.message) return body.message;
    } catch {
      try {
        const text = await error.context.clone().text();
        if (text) return text.slice(0, 300);
      } catch {
        // corps déjà consommé/illisible : on retombe sur le message générique
      }
    }
  }

  return error?.message ?? 'Erreur inconnue';
}

async function callMemoireAdmin<T>(action: string, password: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('memoire-admin', {
    body: { action, password, ...extra },
  });

  if (error) throw new Error(await extractErrorMessage(error, data));
  if (data?.error) throw new Error(data.error);

  return data as T;
}

export async function verifyAdminPassword(password: string): Promise<void> {
  await callMemoireAdmin('verify', password);
}

export async function getAdminConfig(
  password: string,
  corpsDeMetier: CorpsDeMetier
): Promise<{
  config: CompanyConfig;
  referenceDocs: ReferenceDoc[];
  moyensHumainsParInterlocuteur: Partial<Record<Interlocuteur, string>>;
}> {
  return callMemoireAdmin('get-config', password, { corpsDeMetier });
}

export interface CompanyInfoFields {
  presentation: string;
  equipeOrganigramme: string;
  methodes: string;
  moyensMateriels: string;
  informatiqueLogiciels: string;
  stockFournisseurs: string;
  organisationChantier: string;
  environnement: string;
  choixFournisseurs: string;
  insertionProfessionnelle: string;
  tailleEntrepriseEncadrement: string;
  referencesChantiers: string;
  securiteGenerale: string;
  amiante: string;
  qualiteAutocontrole: string;
  relationLocataires: string;
  gestionAstreintes: string;
  gestionMilieuOccupe: string;
  certifications: string;
  rse: string;
}

/**
 * Reprend les infos entreprise déjà chargées telles quelles, pour les sections (Prompt système,
 * Structure) qui ne modifient qu'un seul champ mais doivent renvoyer l'ensemble à save-config
 * (sans quoi les autres champs seraient réinitialisés).
 */
export function companyInfoFieldsFrom(config: CompanyConfig): CompanyInfoFields {
  return {
    presentation: config.presentation,
    equipeOrganigramme: config.equipe_organigramme,
    methodes: config.methodes,
    moyensMateriels: config.moyens_materiels,
    informatiqueLogiciels: config.informatique_logiciels,
    stockFournisseurs: config.stock_fournisseurs,
    organisationChantier: config.organisation_chantier,
    environnement: config.environnement,
    choixFournisseurs: config.choix_fournisseurs,
    insertionProfessionnelle: config.insertion_professionnelle,
    tailleEntrepriseEncadrement: config.taille_entreprise_encadrement,
    referencesChantiers: config.references_chantiers,
    securiteGenerale: config.securite_generale,
    amiante: config.amiante,
    qualiteAutocontrole: config.qualite_autocontrole,
    relationLocataires: config.relation_locataires,
    gestionAstreintes: config.gestion_astreintes,
    gestionMilieuOccupe: config.gestion_milieu_occupe,
    certifications: config.certifications,
    rse: config.rse,
  };
}

export async function saveAdminConfig(
  password: string,
  corpsDeMetier: CorpsDeMetier,
  fields: {
    systemPrompt: string;
    structurePrompt: string;
  } & CompanyInfoFields
): Promise<void> {
  await callMemoireAdmin('save-config', password, { corpsDeMetier, ...fields });
}

export async function saveMoyensHumains(
  password: string,
  corpsDeMetier: CorpsDeMetier,
  interlocuteur: Interlocuteur,
  contenu: string
): Promise<void> {
  await callMemoireAdmin('save-moyens-humains', password, { corpsDeMetier, interlocuteur, contenu });
}

export async function uploadReferenceDoc(
  password: string,
  file: File,
  corpsDeMetier: CorpsDeMetier,
  extractedText: string
): Promise<ReferenceDoc> {
  const fileBase64 = await fileToBase64(file);
  const result = await callMemoireAdmin<{ doc: ReferenceDoc }>('upload-reference', password, {
    fileName: file.name,
    corpsDeMetier,
    extractedText,
    fileBase64,
  });
  return result.doc;
}

export async function deleteReferenceDoc(password: string, id: string): Promise<void> {
  await callMemoireAdmin('delete-reference', password, { id });
}

export interface GenerateMemoirePayload {
  interlocuteur: Interlocuteur;
  corpsDeMetier: CorpsDeMetier;
  thematiques: string[];
  nombrePersonnes: number;
  projectDocs: { name: string; storagePath: string; extractedText: string }[];
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

async function callMemoireGenerate<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('memoire-generate', { body });
  if (error) throw new Error(await extractErrorMessage(error, data));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/**
 * Génère le mémoire thématique par thématique : un appel Claude court par section (bien sous la
 * limite de durée d'exécution des Edge Functions Supabase, 150s/400s) plutôt qu'un seul très long
 * appel qui finissait par se faire tuer silencieusement par la plateforme. `onProgress` est
 * appelé après chaque section pour afficher une vraie progression côté UI.
 */
export async function generateMemoireStepByStep(
  payload: GenerateMemoirePayload,
  onProgress: (info: { current: number; total: number; thematique: string; usage: { totalInputTokens: number; totalOutputTokens: number } }) => void
): Promise<{ downloadUrl: string; usage: TokenUsage }> {
  const { generationId } = await callMemoireGenerate<{ generationId: string }>({
    action: 'start',
    interlocuteur: payload.interlocuteur,
    corpsDeMetier: payload.corpsDeMetier,
    thematiques: payload.thematiques,
    nombrePersonnes: payload.nombrePersonnes,
    projectDocs: payload.projectDocs,
  });

  const total = payload.thematiques.length;
  let lastUsage = { totalInputTokens: 0, totalOutputTokens: 0 };
  const MAX_ATTEMPTS_PER_SECTION = 3;

  for (let i = 0; i < total; i++) {
    const thematique = payload.thematiques[i];

    // Un appel de section peut occasionnellement dépasser le timeout applicatif (variance
    // normale de temps de réponse de Claude) : il échoue alors proprement (voir callClaude côté
    // serveur) sans avoir rien écrit en base pour cette section, donc un nouvel essai est sûr.
    let result: {
      ok: true;
      usage: { sectionInputTokens: number; sectionOutputTokens: number; totalInputTokens: number; totalOutputTokens: number };
    } | null = null;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_SECTION; attempt++) {
      try {
        result = await callMemoireGenerate<{
          ok: true;
          usage: { sectionInputTokens: number; sectionOutputTokens: number; totalInputTokens: number; totalOutputTokens: number };
        }>({
          action: 'generate-section',
          generationId,
          interlocuteur: payload.interlocuteur,
          corpsDeMetier: payload.corpsDeMetier,
          nombrePersonnes: payload.nombrePersonnes,
          projectDocs: payload.projectDocs,
          thematique,
          sectionIndex: i,
          totalSections: total,
        });
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Erreur inconnue');
      }
    }
    if (!result) throw lastError ?? new Error(`Échec de la section ${i + 1}/${total}`);

    lastUsage = { totalInputTokens: result.usage.totalInputTokens, totalOutputTokens: result.usage.totalOutputTokens };
    onProgress({ current: i + 1, total, thematique, usage: lastUsage });
  }

  const final = await callMemoireGenerate<{ ok: true; downloadUrl: string; usage: TokenUsage }>({
    action: 'finalize',
    generationId,
    interlocuteur: payload.interlocuteur,
    corpsDeMetier: payload.corpsDeMetier,
  });

  return { downloadUrl: final.downloadUrl, usage: final.usage };
}
