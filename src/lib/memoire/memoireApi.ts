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
  const dataError = (data as { error?: string } | null)?.error;
  if (dataError) return dataError;

  if (error?.context instanceof Response) {
    try {
      const body = await error.context.clone().json();
      if (body?.error) return body.error;
    } catch {
      // corps non-JSON ou déjà consommé : on retombe sur le message générique
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
): Promise<{ config: CompanyConfig; referenceDocs: ReferenceDoc[] }> {
  return callMemoireAdmin('get-config', password, { corpsDeMetier });
}

export async function saveAdminConfig(
  password: string,
  corpsDeMetier: CorpsDeMetier,
  fields: {
    systemPrompt: string;
    structurePrompt: string;
    presentation: string;
    moyensHumains: string;
    moyensMateriels: string;
    organisationChantier: string;
    gestionAstreintes: string;
    gestionMilieuOccupe: string;
    methodes: string;
    certifications: string;
  }
): Promise<void> {
  await callMemoireAdmin('save-config', password, { corpsDeMetier, ...fields });
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

export async function generateMemoire(payload: GenerateMemoirePayload): Promise<{ downloadUrl: string }> {
  const { data, error } = await supabase.functions.invoke('memoire-generate', { body: payload });

  if (error) throw new Error(await extractErrorMessage(error, data));
  if (data?.error) throw new Error(data.error);

  return data as { downloadUrl: string };
}
