import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload un fichier PDF dans le bucket "interventions_pdfs".
 * Retourne l'URL publique du fichier.
 */
export async function uploadPdf(file: File): Promise<{ url: string; name: string }> {
  // Nom unique : timestamp + aléatoire + nom original
  const ext = file.name.split('.').pop() || 'pdf';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('interventions_pdfs')
    .upload(uniqueName, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) throw new Error(`Erreur upload PDF : ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('interventions_pdfs')
    .getPublicUrl(data.path);

  return { url: publicUrl, name: file.name };
}

/**
 * Supprime un PDF du bucket à partir de son URL publique.
 */
export async function deletePdf(publicUrl: string): Promise<void> {
  // Extrait le chemin relatif depuis l'URL publique
  const path = publicUrl.split('/interventions_pdfs/').at(-1);
  if (!path) return;

  await supabase.storage.from('interventions_pdfs').remove([path]);
}
