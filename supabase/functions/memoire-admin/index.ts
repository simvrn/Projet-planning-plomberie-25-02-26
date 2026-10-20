// Edge Function "memoire-admin"
// Toutes les opérations d'administration de la base entreprise (infos générales, prompt système,
// mémoires de référence) passent par ici. Le mot de passe est vérifié côté serveur via la fonction
// SQL verify_memoire_admin_password (pgcrypto), jamais comparé côté client.
//
// Body attendu : { action: string, password: string, ...champs spécifiques à l'action }

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const VALID_CORPS_DE_METIER = ['Électricité', 'Interphonie', 'Plomberie', 'Serrurerie'];
const VALID_ENTREPRISES = ['Edetel Systems', 'Elec Service Centre'];

// Clés de memoire_images : un logo par entreprise + un organigramme commun.
function isValidImageKey(key: string): boolean {
  return key === 'organigramme' || VALID_ENTREPRISES.some((nom) => key === `logo:${nom}`);
}

// La liste des interlocuteurs n'est plus figée (table memoire_interlocuteurs, gérable depuis
// l'espace admin) : on vérifie leur existence en base plutôt que contre un tableau en dur.
async function interlocuteurExists(prenom: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('memoire_interlocuteurs')
    .select('prenom')
    .eq('prenom', prenom)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

// Champs de memoire_company_config : [clé camelCase reçue du client, colonne snake_case en base].
// system_prompt et structure_prompt sont gérés à part (prompts, pas des infos entreprise).
const COMPANY_CONFIG_FIELDS: [string, string][] = [
  ['presentation', 'presentation'],
  ['equipeOrganigramme', 'equipe_organigramme'],
  ['methodes', 'methodes'],
  ['moyensMateriels', 'moyens_materiels'],
  ['informatiqueLogiciels', 'informatique_logiciels'],
  ['stockFournisseurs', 'stock_fournisseurs'],
  ['organisationChantier', 'organisation_chantier'],
  ['environnement', 'environnement'],
  ['choixFournisseurs', 'choix_fournisseurs'],
  ['insertionProfessionnelle', 'insertion_professionnelle'],
  ['tailleEntrepriseEncadrement', 'taille_entreprise_encadrement'],
  ['referencesChantiers', 'references_chantiers'],
  ['securiteGenerale', 'securite_generale'],
  ['amiante', 'amiante'],
  ['qualiteAutocontrole', 'qualite_autocontrole'],
  ['relationLocataires', 'relation_locataires'],
  ['gestionAstreintes', 'gestion_astreintes'],
  ['gestionMilieuOccupe', 'gestion_milieu_occupe'],
  ['certifications', 'certifications'],
  ['rse', 'rse'],
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const { action, password } = body as { action?: string; password?: string };
  if (!action || !password) {
    return json({ error: 'action et password requis' }, 400);
  }

  const { data: passwordValid, error: verifyError } = await supabase.rpc(
    'verify_memoire_admin_password',
    { input_password: password }
  );
  if (verifyError) return json({ error: verifyError.message }, 500);
  if (!passwordValid) return json({ error: 'Mot de passe incorrect' }, 401);

  try {
    switch (action) {
      case 'verify': {
        return json({ ok: true });
      }

      case 'get-config': {
        const { corpsDeMetier } = body as { corpsDeMetier?: string };
        if (!corpsDeMetier || !VALID_CORPS_DE_METIER.includes(corpsDeMetier)) {
          return json({ error: 'corpsDeMetier invalide' }, 400);
        }

        const selectColumns = [
          'corps_de_metier',
          'system_prompt',
          'structure_prompt',
          ...COMPANY_CONFIG_FIELDS.map(([, col]) => col),
          'updated_at',
        ].join(', ');

        const { data: config, error: configError } = await supabase
          .from('memoire_company_config')
          .select(selectColumns)
          .eq('corps_de_metier', corpsDeMetier)
          .single();
        if (configError) return json({ error: configError.message }, 500);

        const { data: referenceDocs, error: docsError } = await supabase
          .from('memoire_reference_docs')
          .select('id, file_name, storage_path, corps_de_metier, uploaded_at')
          .eq('corps_de_metier', corpsDeMetier)
          .order('uploaded_at', { ascending: false });
        if (docsError) return json({ error: docsError.message }, 500);

        const { data: moyensHumainsRows, error: moyensError } = await supabase
          .from('memoire_moyens_humains')
          .select('interlocuteur, contenu, techniciens')
          .eq('corps_de_metier', corpsDeMetier);
        if (moyensError) return json({ error: moyensError.message }, 500);

        const moyensHumainsParInterlocuteur = Object.fromEntries(
          (moyensHumainsRows ?? []).map((row) => [row.interlocuteur, row.contenu])
        );
        const techniciensParInterlocuteur = Object.fromEntries(
          (moyensHumainsRows ?? []).map((row) => [row.interlocuteur, row.techniciens ?? []])
        );

        // Liste des interlocuteurs : commune à tous les corps de métier (une personne existe
        // indépendamment du métier sélectionné dans l'admin).
        const { data: interlocuteurs, error: interlocuteursError } = await supabase
          .from('memoire_interlocuteurs')
          .select('prenom, nom')
          .order('created_at', { ascending: true });
        if (interlocuteursError) return json({ error: interlocuteursError.message }, 500);

        return json({
          config,
          referenceDocs,
          moyensHumainsParInterlocuteur,
          techniciensParInterlocuteur,
          interlocuteurs: interlocuteurs ?? [],
        });
      }

      case 'save-config': {
        const { corpsDeMetier, systemPrompt, structurePrompt } = body as {
          corpsDeMetier?: string;
          systemPrompt?: string;
          structurePrompt?: string;
        };
        if (!corpsDeMetier || !VALID_CORPS_DE_METIER.includes(corpsDeMetier)) {
          return json({ error: 'corpsDeMetier invalide' }, 400);
        }

        const updatePayload: Record<string, string> = {
          system_prompt: systemPrompt ?? '',
          structure_prompt: structurePrompt ?? '',
          updated_at: new Date().toISOString(),
        };
        for (const [key, column] of COMPANY_CONFIG_FIELDS) {
          updatePayload[column] = (body as Record<string, unknown>)[key] as string ?? '';
        }

        const { error: updateError } = await supabase
          .from('memoire_company_config')
          .update(updatePayload)
          .eq('corps_de_metier', corpsDeMetier);
        if (updateError) return json({ error: updateError.message }, 500);

        return json({ ok: true });
      }

      case 'save-moyens-humains': {
        const { corpsDeMetier, interlocuteur, contenu, techniciens } = body as {
          corpsDeMetier?: string;
          interlocuteur?: string;
          contenu?: string;
          techniciens?: string[];
        };
        if (!corpsDeMetier || !VALID_CORPS_DE_METIER.includes(corpsDeMetier)) {
          return json({ error: 'corpsDeMetier invalide' }, 400);
        }
        if (!interlocuteur || !(await interlocuteurExists(interlocuteur))) {
          return json({ error: 'interlocuteur invalide' }, 400);
        }
        if (techniciens !== undefined && !Array.isArray(techniciens)) {
          return json({ error: 'techniciens invalide : tableau attendu' }, 400);
        }

        const { error: upsertError } = await supabase
          .from('memoire_moyens_humains')
          .upsert(
            {
              corps_de_metier: corpsDeMetier,
              interlocuteur,
              contenu: contenu ?? '',
              techniciens: (techniciens ?? []).filter((t) => typeof t === 'string' && t.trim().length > 0),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'corps_de_metier,interlocuteur' }
          );
        if (upsertError) return json({ error: upsertError.message }, 500);

        return json({ ok: true });
      }

      case 'add-interlocuteur': {
        const { prenom, nom } = body as { prenom?: string; nom?: string };
        const trimmedPrenom = prenom?.trim();
        if (!trimmedPrenom) return json({ error: 'prenom requis' }, 400);

        const { error: insertError } = await supabase
          .from('memoire_interlocuteurs')
          .insert({ prenom: trimmedPrenom, nom: nom?.trim() ?? '' });
        if (insertError) {
          if (insertError.code === '23505') {
            return json({ error: 'Cette personne existe déjà' }, 400);
          }
          return json({ error: insertError.message }, 500);
        }

        return json({ ok: true });
      }

      case 'update-interlocuteur': {
        const { prenom, nom } = body as { prenom?: string; nom?: string };
        if (!prenom) return json({ error: 'prenom requis' }, 400);

        const { error: updateInterlocuteurError } = await supabase
          .from('memoire_interlocuteurs')
          .update({ nom: nom?.trim() ?? '' })
          .eq('prenom', prenom);
        if (updateInterlocuteurError) return json({ error: updateInterlocuteurError.message }, 500);

        return json({ ok: true });
      }

      case 'delete-interlocuteur': {
        const { prenom } = body as { prenom?: string };
        if (!prenom) return json({ error: 'prenom requis' }, 400);

        // Nettoie aussi les moyens humains associés (tous corps de métier) : sans quoi ils
        // resteraient orphelins en base, invisibles et impossibles à ré-attribuer.
        await supabase.from('memoire_moyens_humains').delete().eq('interlocuteur', prenom);

        const { error: deleteInterlocuteurError } = await supabase
          .from('memoire_interlocuteurs')
          .delete()
          .eq('prenom', prenom);
        if (deleteInterlocuteurError) return json({ error: deleteInterlocuteurError.message }, 500);

        return json({ ok: true });
      }

      case 'get-branding': {
        const { data: entreprises, error: entreprisesError } = await supabase
          .from('memoire_entreprises')
          .select('nom, adresse')
          .order('created_at', { ascending: true });
        if (entreprisesError) return json({ error: entreprisesError.message }, 500);

        const { data: images, error: imagesError } = await supabase
          .from('memoire_images')
          .select('key, storage_path, updated_at');
        if (imagesError) return json({ error: imagesError.message }, 500);

        const imageUrls = Object.fromEntries(
          (images ?? []).map((img) => [
            img.key,
            // updated_at en paramètre : évite que le navigateur affiche l'ancienne image en cache.
            `${supabase.storage.from('memoire_assets').getPublicUrl(img.storage_path).data.publicUrl}?v=${encodeURIComponent(img.updated_at)}`,
          ])
        );

        return json({ entreprises: entreprises ?? [], imageUrls });
      }

      case 'save-entreprise-adresse': {
        const { nom, adresse } = body as { nom?: string; adresse?: string };
        if (!nom || !VALID_ENTREPRISES.includes(nom)) return json({ error: 'entreprise invalide' }, 400);

        const { error: updateAdresseError } = await supabase
          .from('memoire_entreprises')
          .update({ adresse: adresse?.trim() ?? '' })
          .eq('nom', nom);
        if (updateAdresseError) return json({ error: updateAdresseError.message }, 500);

        return json({ ok: true });
      }

      case 'upload-image': {
        const { key, fileBase64, imageType, width, height } = body as {
          key?: string;
          fileBase64?: string;
          imageType?: string;
          width?: number;
          height?: number;
        };
        if (!key || !isValidImageKey(key)) return json({ error: 'key invalide' }, 400);
        if (!fileBase64) return json({ error: 'fileBase64 requis' }, 400);
        if (imageType !== 'png' && imageType !== 'jpg') {
          return json({ error: 'Format non supporté : PNG ou JPG uniquement' }, 400);
        }
        if (!Number.isInteger(width) || !Number.isInteger(height) || width! < 1 || height! < 1) {
          return json({ error: 'width/height invalides' }, 400);
        }

        const { data: previous } = await supabase
          .from('memoire_images')
          .select('storage_path')
          .eq('key', key)
          .maybeSingle();

        const storagePath = `${Date.now()}-${crypto.randomUUID()}.${imageType}`;
        const fileBytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
        const { error: uploadImageError } = await supabase.storage
          .from('memoire_assets')
          .upload(storagePath, fileBytes, { contentType: imageType === 'png' ? 'image/png' : 'image/jpeg', upsert: false });
        if (uploadImageError) return json({ error: uploadImageError.message }, 500);

        const { error: upsertImageError } = await supabase
          .from('memoire_images')
          .upsert(
            { key, storage_path: storagePath, image_type: imageType, width, height, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
        if (upsertImageError) return json({ error: upsertImageError.message }, 500);

        if (previous?.storage_path) {
          await supabase.storage.from('memoire_assets').remove([previous.storage_path]);
        }

        return json({ ok: true });
      }

      case 'delete-image': {
        const { key } = body as { key?: string };
        if (!key || !isValidImageKey(key)) return json({ error: 'key invalide' }, 400);

        const { data: existingImage, error: fetchImageError } = await supabase
          .from('memoire_images')
          .select('storage_path')
          .eq('key', key)
          .maybeSingle();
        if (fetchImageError) return json({ error: fetchImageError.message }, 500);

        if (existingImage?.storage_path) {
          await supabase.storage.from('memoire_assets').remove([existingImage.storage_path]);
        }
        const { error: deleteImageError } = await supabase.from('memoire_images').delete().eq('key', key);
        if (deleteImageError) return json({ error: deleteImageError.message }, 500);

        return json({ ok: true });
      }

      case 'upload-reference': {
        const { fileName, corpsDeMetier, extractedText, fileBase64 } = body as {
          fileName?: string;
          corpsDeMetier?: string;
          extractedText?: string;
          fileBase64?: string;
        };
        if (!fileName || !corpsDeMetier || !extractedText || !fileBase64) {
          return json({ error: 'fileName, corpsDeMetier, extractedText et fileBase64 requis' }, 400);
        }
        if (!VALID_CORPS_DE_METIER.includes(corpsDeMetier)) {
          return json({ error: 'corpsDeMetier invalide' }, 400);
        }

        const ext = (fileName.split('.').pop() || 'bin').toLowerCase();
        const storagePath = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const fileBytes = Uint8Array.from(atob(fileBase64), (c) => c.charCodeAt(0));
        const contentType =
          ext === 'pdf'
            ? 'application/pdf'
            : ext === 'txt'
              ? 'text/plain'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        const { error: uploadError } = await supabase.storage
          .from('memoire_reference_docs')
          .upload(storagePath, fileBytes, { contentType, upsert: false });
        if (uploadError) return json({ error: uploadError.message }, 500);

        const { data: doc, error: insertError } = await supabase
          .from('memoire_reference_docs')
          .insert({
            file_name: fileName,
            storage_path: storagePath,
            corps_de_metier: corpsDeMetier,
            extracted_text: extractedText,
          })
          .select()
          .single();
        if (insertError) return json({ error: insertError.message }, 500);

        return json({ ok: true, doc });
      }

      case 'delete-reference': {
        const { id } = body as { id?: string };
        if (!id) return json({ error: 'id requis' }, 400);

        const { data: existing, error: fetchError } = await supabase
          .from('memoire_reference_docs')
          .select('storage_path')
          .eq('id', id)
          .single();
        if (fetchError) return json({ error: fetchError.message }, 500);

        if (existing?.storage_path) {
          await supabase.storage.from('memoire_reference_docs').remove([existing.storage_path]);
        }

        const { error: deleteError } = await supabase
          .from('memoire_reference_docs')
          .delete()
          .eq('id', id);
        if (deleteError) return json({ error: deleteError.message }, 500);

        return json({ ok: true });
      }

      default:
        return json({ error: `Action inconnue : ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erreur inconnue' }, 500);
  }
});
