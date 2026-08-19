// Edge Function "memoire-generate"
// Reçoit le choix de l'étape 1 (interlocuteur + corps de métier) et le texte déjà extrait des
// documents projet (l'extraction PDF/Word se fait côté navigateur, voir src/lib/memoire/textExtraction.ts).
// Croise avec la base entreprise (memoire_company_config + memoire_reference_docs), appelle Claude
// pour produire un contenu structuré, puis génère un .docx et le stocke dans le bucket memoire_generated.
//
// Body attendu :
// {
//   interlocuteur: 'Vlad' | 'Stéphane' | 'Simon' | 'Eric' | 'Sébastien',
//   corpsDeMetier: 'Électricité' | 'Interphonie' | 'Plomberie' | 'Serrurerie',
//   projectDocs: { name: string, storagePath: string, extractedText: string }[]
// }

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  TableOfContents,
} from 'npm:docx@9';

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

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const CLAUDE_MODEL = 'claude-sonnet-5';

const VALID_INTERLOCUTEURS = ['Vlad', 'Stéphane', 'Simon', 'Eric', 'Sébastien'];
const VALID_CORPS_DE_METIER = ['Électricité', 'Interphonie', 'Plomberie', 'Serrurerie'];
// Les thématiques ne sont plus restreintes à cette liste côté serveur : l'utilisateur peut
// ajouter des thématiques libres non prévues (voir StartForm.tsx côté client).

const DEFAULT_SYSTEM_PROMPT = `Tu es un rédacteur technique expérimenté d'une entreprise du bâtiment (électricité, interphonie, plomberie, serrurerie) qui répond à des appels d'offres publics et privés.
Tu rédiges des mémoires techniques précis, structurés, professionnels et adaptés au projet, en t'appuyant sur les documents du projet (CCTP, plans, cahier des charges) et sur les informations de l'entreprise fournies.
Tu ne dois jamais inventer d'informations sur l'entreprise qui ne figurent pas dans les informations fournies. Pour la partie spécifique au projet, tu t'appuies exclusivement sur les documents du projet fournis — les mémoires de référence ne servent qu'à calibrer le ton, le style et la structure.`;

interface ProjectDoc {
  name: string;
  storagePath?: string;
  extractedText: string;
}

interface MemoireSection {
  heading: string;
  level: number;
  paragraphs: string[];
}

interface MemoireContent {
  title: string;
  sections: MemoireSection[];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[...texte tronqué...]`;
}

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const memoireTool = {
  name: 'submit_memoire',
  description: 'Soumets le mémoire technique complet, structuré en titre + sections hiérarchisées.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Titre principal du mémoire technique' },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            level: { type: 'integer', enum: [1, 2, 3], description: '1 = titre de partie, 2 = sous-partie, 3 = sous-sous-partie' },
            paragraphs: { type: 'array', items: { type: 'string' } },
          },
          required: ['heading', 'level', 'paragraphs'],
        },
      },
    },
    required: ['title', 'sections'],
  },
};

async function callClaude(systemPrompt: string, userPrompt: string): Promise<MemoireContent> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [memoireTool],
      tool_choice: { type: 'tool', name: 'submit_memoire' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API Claude (${response.status}) : ${errText}`);
  }

  const data = await response.json();
  const toolUse = data.content?.find((block: { type: string }) => block.type === 'tool_use');
  if (!toolUse) throw new Error('Claude n’a pas retourné de contenu structuré (submit_memoire manquant)');

  return toolUse.input as MemoireContent;
}

function headingLevelFor(level: number) {
  if (level <= 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  return HeadingLevel.HEADING_3;
}

async function buildDocx(
  content: MemoireContent,
  interlocuteur: string,
  corpsDeMetier: string
): Promise<Uint8Array> {
  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(new Paragraph({ text: content.title, heading: HeadingLevel.TITLE }));
  children.push(
    new Paragraph({
      text: `${corpsDeMetier} — Interlocuteur : ${interlocuteur}`,
      alignment: AlignmentType.CENTER,
    })
  );
  children.push(
    new Paragraph({
      text: new Date().toLocaleDateString('fr-FR'),
      alignment: AlignmentType.CENTER,
    })
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  children.push(new Paragraph({ text: 'Sommaire', heading: HeadingLevel.HEADING_1 }));
  children.push(
    new TableOfContents('Sommaire (clic droit → "Mettre à jour les champs" à l’ouverture)', {
      hyperlink: true,
      headingStyleRange: '1-3',
    })
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  for (const section of content.sections) {
    children.push(new Paragraph({ text: section.heading, heading: headingLevelFor(section.level) }));
    for (const paragraph of section.paragraphs) {
      children.push(new Paragraph({ text: paragraph }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let body: {
    interlocuteur?: string;
    corpsDeMetier?: string;
    thematiques?: string[];
    nombrePersonnes?: number;
    projectDocs?: ProjectDoc[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const { interlocuteur, corpsDeMetier, thematiques, nombrePersonnes, projectDocs } = body;

  if (!interlocuteur || !VALID_INTERLOCUTEURS.includes(interlocuteur)) {
    return json({ error: 'interlocuteur invalide' }, 400);
  }
  if (!corpsDeMetier || !VALID_CORPS_DE_METIER.includes(corpsDeMetier)) {
    return json({ error: 'corpsDeMetier invalide' }, 400);
  }
  if (!thematiques || thematiques.length === 0 || !thematiques.every((t) => typeof t === 'string' && t.trim().length > 0)) {
    return json({ error: 'thematiques invalide : au moins une thématique non vide requise' }, 400);
  }
  if (!Number.isInteger(nombrePersonnes) || nombrePersonnes! < 1 || nombrePersonnes! > 8) {
    return json({ error: 'nombrePersonnes invalide : entier entre 1 et 8 requis' }, 400);
  }
  if (!projectDocs || projectDocs.length === 0) {
    return json({ error: 'Au moins un document projet est requis' }, 400);
  }

  const { data: generation, error: insertGenError } = await supabase
    .from('memoire_generations')
    .insert({
      interlocuteur,
      corps_de_metier: corpsDeMetier,
      thematiques,
      nombre_personnes: nombrePersonnes,
      project_doc_names: projectDocs.map((d) => d.name),
      status: 'processing',
    })
    .select()
    .single();
  if (insertGenError) return json({ error: insertGenError.message }, 500);

  try {
    const { data: config, error: configError } = await supabase
      .from('memoire_company_config')
      .select('system_prompt, structure_prompt, presentation, moyens_humains, moyens_materiels, organisation_chantier, gestion_astreintes, gestion_milieu_occupe, methodes, certifications')
      .eq('corps_de_metier', corpsDeMetier)
      .single();
    if (configError) throw new Error(configError.message);

    const { data: referenceDocs, error: refError } = await supabase
      .from('memoire_reference_docs')
      .select('file_name, corps_de_metier, extracted_text')
      .eq('corps_de_metier', corpsDeMetier)
      .order('uploaded_at', { ascending: false })
      .limit(3);
    if (refError) throw new Error(refError.message);

    const structureSection = config.structure_prompt?.trim()
      ? `\n\n# Structure et mise en page imposées\nRespecte STRICTEMENT la structure suivante pour tous les mémoires de ce corps de métier (ordre des sections, format des titres...) :\n${config.structure_prompt.trim()}`
      : '';

    const systemPrompt = `${config.system_prompt?.trim() || DEFAULT_SYSTEM_PROMPT}${structureSection}

# Informations sur l'entreprise

## Présentation
${config.presentation || '(non renseigné)'}

## Moyens humains
${config.moyens_humains || '(non renseigné)'}

## Moyens matériels
${config.moyens_materiels || '(non renseigné)'}

## Organisation sur le chantier
${config.organisation_chantier || '(non renseigné)'}

## Gestion des astreintes
${config.gestion_astreintes || '(non renseigné)'}

## Gestion en milieu occupé
${config.gestion_milieu_occupe || '(non renseigné)'}

## Méthodes
${config.methodes || '(non renseigné)'}

## Certifications
${config.certifications || '(non renseigné)'}`;

    const referenceSection = referenceDocs.length
      ? referenceDocs
          .map(
            (d, i) =>
              `### Exemple de référence ${i + 1} (${d.file_name})\n${truncate(d.extracted_text, 6000)}`
          )
          .join('\n\n')
      : 'Aucun mémoire de référence disponible.';

    const projectDocsSection = projectDocs
      .map((d, i) => `### Document projet ${i + 1} : ${d.name}\n${truncate(d.extractedText, 60000)}`)
      .join('\n\n---\n\n');

    const thematiquesSection = thematiques.map((t) => `- ${t}`).join('\n');

    const userPrompt = `Rédige un mémoire technique pour répondre à un appel d'offres.

Interlocuteur principal côté entreprise : ${interlocuteur}
Corps de métier concerné : ${corpsDeMetier}
Nombre de personnes affectées au chantier : ${nombrePersonnes}

# Thématiques demandées par le CCTP
Le mémoire doit traiter EXCLUSIVEMENT les thématiques suivantes (une section par thématique, pas de section hors de cette liste) :
${thematiquesSection}

# Mémoires de référence de l'entreprise
(À utiliser UNIQUEMENT pour le ton, le style et la structure — ne reprends jamais leur contenu spécifique à un autre projet.)

${referenceSection}

# Documents du projet en cours
(CCTP, plans, cahier des charges... C'est le contenu sur lequel le mémoire doit être précisément basé.)

${projectDocsSection}

Génère maintenant le mémoire technique complet en appelant l'outil submit_memoire.`;

    const content = await callClaude(systemPrompt, userPrompt);
    const docxBytes = await buildDocx(content, interlocuteur, corpsDeMetier);

    const fileName = `Memoire_Technique_${slugify(corpsDeMetier)}_${generation.id}.docx`;
    const { error: uploadError } = await supabase.storage
      .from('memoire_generated')
      .upload(fileName, docxBytes, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    const {
      data: { publicUrl },
    } = supabase.storage.from('memoire_generated').getPublicUrl(fileName, { download: fileName });

    await supabase
      .from('memoire_generations')
      .update({ status: 'done', generated_docx_path: fileName })
      .eq('id', generation.id);

    return json({ ok: true, downloadUrl: publicUrl, generationId: generation.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    await supabase
      .from('memoire_generations')
      .update({ status: 'error', error_message: message })
      .eq('id', generation.id);
    return json({ error: message }, 500);
  }
});
