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
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  TableOfContents,
  BorderStyle,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
  Footer,
  PageNumber,
} from 'npm:docx@9';

const NUMBERED_LIST_REFERENCE = 'memoire-numbered-list';

// Charte graphique du document généré : bleu corporate + gris clair pour les encadrés/tableaux.
const BRAND_BLUE = '1F4E79';
const BRAND_BLUE_LIGHT = 'DCE6F1';
const BRAND_BLUE_PALE = 'EEF3FA';

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

// Champs de memoire_company_config : [colonne snake_case, libellé lisible pour le prompt].
const COMPANY_CONFIG_FIELDS: [string, string][] = [
  ['presentation', 'Présentation'],
  ['equipe_organigramme', 'Équipe et organigramme (qui fait quoi)'],
  ['methodes', 'Méthode de travail (comment on suit les interventions)'],
  ['moyens_materiels', 'Matériel (outils, protections)'],
  ['informatique_logiciels', 'Informatique et logiciels'],
  ['stock_fournisseurs', 'Stock et fournisseurs (logistique)'],
  ['organisation_chantier', 'Organisation sur le chantier'],
  ['environnement', 'Environnement (déchets, énergie, mobilité)'],
  ['choix_fournisseurs', 'Choix des fournisseurs'],
  ['insertion_professionnelle', 'Insertion professionnelle (aide à l\'emploi)'],
  ['taille_entreprise_encadrement', 'Taille de l\'entreprise et encadrement'],
  ['references_chantiers', 'Références (chantiers déjà faits)'],
  ['securite_generale', 'Sécurité générale'],
  ['amiante', 'Amiante (procédure à part)'],
  ['qualite_autocontrole', 'Qualité et autocontrôle'],
  ['relation_locataires', 'Relation avec les locataires'],
  ['gestion_astreintes', 'Gestion des astreintes'],
  ['gestion_milieu_occupe', 'Gestion en milieu occupé'],
  ['certifications', 'Certifications'],
  ['rse', 'RSE'],
];

const DEFAULT_SYSTEM_PROMPT = `Tu es un rédacteur technique expérimenté d'une entreprise du bâtiment (électricité, interphonie, plomberie, serrurerie) qui répond à des appels d'offres publics et privés.
Tu rédiges des mémoires techniques précis, structurés, professionnels et adaptés au projet, en t'appuyant sur les documents du projet (CCTP, plans, cahier des charges) et sur les informations de l'entreprise fournies.
Tu ne dois jamais inventer d'informations sur l'entreprise qui ne figurent pas dans les informations fournies. Pour la partie spécifique au projet, tu t'appuies exclusivement sur les documents du projet fournis — les mémoires de référence ne servent qu'à calibrer le ton, le style et la structure.
Sois exhaustif et développé : chaque section doit être substantiellement traitée (plusieurs paragraphes et/ou plusieurs points détaillés), jamais réduite à une ou deux phrases génériques. Appuie-toi précisément sur le CCTP (cite les articles et exigences concernés, explique concrètement comment l'entreprise y répond) et sur l'intégralité des informations entreprise fournies pour chaque section. Un mémoire technique de qualité pour un appel d'offres compte généralement plusieurs pages par thématique traitée : vise l'exhaustivité et la précision, pas la concision — rédige comme tu le ferais dans une conversation normale où on te demanderait ce document, sans te limiter.`;

// Toujours ajoutée, même si l'admin a défini un prompt système personnalisé : c'est une exigence
// technique du pipeline (le texte est ensuite parsé en Markdown pour générer le .docx), pas un
// choix de style — sans ça le parseur ne peut pas reconstruire le document.
const OUTPUT_FORMAT_INSTRUCTIONS = `# Format de réponse attendu
Réponds directement en rédigeant le mémoire en Markdown, sans préambule ni commentaire hors document (pas de "Voici le mémoire..."). Utilise # pour le titre principal, ## pour chaque section/thématique, ### pour d'éventuelles sous-parties, des listes à puces (-) ou numérotées (1.) pour le matériel/les étapes/les points de contrôle, et **gras** pour les termes importants.`;

interface ProjectDoc {
  name: string;
  storagePath?: string;
  extractedText: string;
}

interface MemoireContentBlock {
  type: 'paragraph' | 'bullet' | 'numbered' | 'table';
  text: string;
  rows?: string[][];
}

interface MemoireSection {
  heading: string;
  level: number;
  content: MemoireContentBlock[];
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

const MAX_OUTPUT_TOKENS = 120000;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  maxTokens: number;
}

// Convertit la réponse Markdown libre de Claude (mode "rédaction normale", comme sur le
// site — pas de schéma JSON forcé) en structure exploitable par buildDocx(). Un tool call forcé
// pousse le modèle en mode "remplir un formulaire" et produit un texte bien plus court/pauvre
// qu'une rédaction libre : on laisse donc Claude écrire librement, puis on parse.
function isTableRow(line: string): boolean {
  return /^\|.*\|$/.test(line);
}

function isTableSeparatorRow(line: string): boolean {
  return /^\|[\s:|-]+\|$/.test(line);
}

function parseTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim().replace(/\*\*/g, ''));
}

function parseMarkdownToMemoire(markdown: string): MemoireContent {
  const lines = markdown.split('\n');
  let title = 'Mémoire technique';
  let titleFound = false;
  const sections: MemoireSection[] = [];
  let currentSection: MemoireSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/\*\*/g, '').trim();
      if (!titleFound && level === 1) {
        title = text;
        titleFound = true;
        continue;
      }
      currentSection = { heading: text, level: Math.min(level, 3), content: [] };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      currentSection = { heading: title, level: 1, content: [] };
      sections.push(currentSection);
    }

    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        const rowLine = lines[i].trim();
        if (!isTableSeparatorRow(rowLine)) rows.push(parseTableRow(rowLine));
        i++;
      }
      i--; // le for...i++ ré-avancera d'un cran
      if (rows.length > 0) currentSection.content.push({ type: 'table', text: '', rows });
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      currentSection.content.push({ type: 'bullet', text: bulletMatch[1].trim() });
      continue;
    }

    const numberedMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      currentSection.content.push({ type: 'numbered', text: numberedMatch[1].trim() });
      continue;
    }

    currentSection.content.push({ type: 'paragraph', text: line });
  }

  return { title, sections };
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: MemoireContent; usage: TokenUsage }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erreur API Claude (${response.status}) : ${errText}`);
  }

  const data = await response.json();

  if (data.stop_reason === 'max_tokens') {
    throw new Error(
      "La réponse a été coupée avant la fin (trop de contenu demandé d'un coup). Réduis le nombre de thématiques sélectionnées ou raccourcis les documents projet, puis réessaie."
    );
  }

  const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
  if (!textBlock?.text) throw new Error('Claude n’a pas retourné de texte');

  const parsed = parseMarkdownToMemoire(textBlock.text);
  if (parsed.sections.length === 0) {
    throw new Error('Claude n’a pas retourné de contenu structuré exploitable (aucune section détectée)');
  }

  const usage: TokenUsage = {
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    maxTokens: MAX_OUTPUT_TOKENS,
  };

  return { content: parsed, usage };
}

function headingLevelFor(level: number) {
  if (level <= 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  return HeadingLevel.HEADING_3;
}

// Découpe "texte **important** suite" en TextRun normaux/gras, pour préserver la mise en
// emphase que Claude produit naturellement (sinon tout ressort en texte plat, sans hiérarchie).
function parseInlineRuns(text: string): InstanceType<typeof TextRun>[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);
  if (parts.length === 0) return [new TextRun('')];
  return parts.map((part) =>
    part.startsWith('**') && part.endsWith('**')
      ? new TextRun({ text: part.slice(2, -2), bold: true })
      : new TextRun(part)
  );
}

function buildTable(rows: string[][]): InstanceType<typeof Table> {
  const columnCount = Math.max(...rows.map((r) => r.length));
  const tableRows = rows.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const cells = Array.from({ length: columnCount }, (_, colIndex) => {
      const cellText = row[colIndex] ?? '';
      return new TableCell({
        width: { size: Math.floor(100 / columnCount), type: WidthType.PERCENTAGE },
        shading: isHeader ? { type: ShadingType.CLEAR, fill: BRAND_BLUE } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader,
                color: isHeader ? 'FFFFFF' : undefined,
              }),
            ],
          }),
        ],
      });
    });
    return new TableRow({ children: cells });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
      left: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
      right: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
    },
  });
}

async function buildDocx(
  content: MemoireContent,
  interlocuteur: string,
  corpsDeMetier: string
): Promise<Uint8Array> {
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  children.push(
    new Paragraph({ text: content.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER })
  );
  children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.CLEAR, fill: BRAND_BLUE_PALE },
      border: {
        top: { style: BorderStyle.SINGLE, size: 8, color: BRAND_BLUE },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND_BLUE },
        left: { style: BorderStyle.SINGLE, size: 8, color: BRAND_BLUE },
        right: { style: BorderStyle.SINGLE, size: 8, color: BRAND_BLUE },
      },
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({ text: corpsDeMetier, bold: true, color: BRAND_BLUE, size: 28 }),
        new TextRun({ text: `  —  Interlocuteur : ${interlocuteur}`, color: BRAND_BLUE, size: 24 }),
      ],
    })
  );
  children.push(
    new Paragraph({
      text: new Date().toLocaleDateString('fr-FR'),
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
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
    for (const block of section.content ?? []) {
      if (block.type === 'table' && block.rows?.length) {
        children.push(buildTable(block.rows));
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        continue;
      }
      const runs = parseInlineRuns(block.text ?? '');
      if (block.type === 'bullet') {
        children.push(new Paragraph({ children: runs, bullet: { level: 0 } }));
      } else if (block.type === 'numbered') {
        children.push(
          new Paragraph({ children: runs, numbering: { reference: NUMBERED_LIST_REFERENCE, level: 0 } })
        );
      } else {
        children.push(new Paragraph({ children: runs }));
      }
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: NUMBERED_LIST_REFERENCE,
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        },
      ],
    },
    styles: {
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 56, bold: true, color: BRAND_BLUE, font: 'Calibri' },
          paragraph: { spacing: { after: 120 } },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 30, bold: true, color: BRAND_BLUE, font: 'Calibri' },
          paragraph: {
            spacing: { before: 360, after: 160 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND_BLUE, space: 4 } },
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 25, bold: true, color: BRAND_BLUE, font: 'Calibri' },
          paragraph: { spacing: { before: 280, after: 120 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 22, bold: true, color: '2E5C8A', font: 'Calibri' },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT, space: 4 } },
                children: [
                  new TextRun({ children: [PageNumber.CURRENT], color: BRAND_BLUE, size: 18 }),
                  new TextRun({ text: ' / ', color: BRAND_BLUE, size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: BRAND_BLUE, size: 18 }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// Fait tout le travail long (config, appel Claude, docx, upload) et met à jour la ligne
// memoire_generations en 'done'/'error' à la fin. Appelée en arrière-plan via
// EdgeRuntime.waitUntil() : la requête HTTP initiale répond en quelques centaines de ms
// (juste l'insertion de la ligne), donc plus aucun risque de dépasser la limite de temps
// d'exécution d'une requête Edge Function — seule la tâche de fond peut prendre plusieurs minutes.
async function runGeneration(
  generationId: string,
  interlocuteur: string,
  corpsDeMetier: string,
  thematiques: string[],
  nombrePersonnes: number,
  projectDocs: ProjectDoc[]
): Promise<void> {
  try {
    const configSelectColumns = [
      'system_prompt',
      'structure_prompt',
      ...COMPANY_CONFIG_FIELDS.map(([col]) => col),
    ].join(', ');

    const { data: config, error: configError } = await supabase
      .from('memoire_company_config')
      .select(configSelectColumns)
      .eq('corps_de_metier', corpsDeMetier)
      .single();
    if (configError) throw new Error(configError.message);

    const { data: moyensHumains, error: moyensError } = await supabase
      .from('memoire_moyens_humains')
      .select('contenu')
      .eq('corps_de_metier', corpsDeMetier)
      .eq('interlocuteur', interlocuteur)
      .single();
    if (moyensError) throw new Error(moyensError.message);

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

    const configRecord = config as unknown as Record<string, string>;

    const companyInfoSections = [
      `## Moyens humains (pour ${interlocuteur})\n${moyensHumains.contenu || '(non renseigné)'}`,
      ...COMPANY_CONFIG_FIELDS.map(
        ([col, label]) => `## ${label}\n${configRecord[col] || '(non renseigné)'}`
      ),
    ].join('\n\n');

    const systemPrompt = `${config.system_prompt?.trim() || DEFAULT_SYSTEM_PROMPT}${structureSection}

${OUTPUT_FORMAT_INSTRUCTIONS}

# Informations sur l'entreprise

${companyInfoSections}`;

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

Rédige maintenant le mémoire technique complet, directement en Markdown (voir le format attendu dans les instructions système). Développe chaque thématique en profondeur (plusieurs paragraphes/points par section, en t'appuyant sur des passages précis du CCTP ci-dessus) — pas de section réduite à une ou deux phrases.`;

    const { content, usage } = await callClaude(systemPrompt, userPrompt);
    const docxBytes = await buildDocx(content, interlocuteur, corpsDeMetier);

    const fileName = `Memoire_Technique_${slugify(corpsDeMetier)}_${generationId}.docx`;
    const { error: uploadError } = await supabase.storage
      .from('memoire_generated')
      .upload(fileName, docxBytes, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      });
    if (uploadError) throw new Error(uploadError.message);

    await supabase
      .from('memoire_generations')
      .update({
        status: 'done',
        generated_docx_path: fileName,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
      })
      .eq('id', generationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    await supabase
      .from('memoire_generations')
      .update({ status: 'error', error_message: message })
      .eq('id', generationId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let body: {
    action?: string;
    generationId?: string;
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

  if (body.action === 'status') {
    const { generationId } = body;
    if (!generationId) return json({ error: 'generationId requis' }, 400);

    const { data, error } = await supabase
      .from('memoire_generations')
      .select('status, generated_docx_path, error_message, input_tokens, output_tokens')
      .eq('id', generationId)
      .single();
    if (error) return json({ error: error.message }, 500);

    if (data.status === 'done' && data.generated_docx_path) {
      const {
        data: { publicUrl },
      } = supabase.storage
        .from('memoire_generated')
        .getPublicUrl(data.generated_docx_path, { download: data.generated_docx_path });
      return json({
        status: 'done',
        downloadUrl: publicUrl,
        usage: {
          inputTokens: data.input_tokens ?? 0,
          outputTokens: data.output_tokens ?? 0,
          maxTokens: MAX_OUTPUT_TOKENS,
        },
      });
    }
    if (data.status === 'error') return json({ status: 'error', error: data.error_message });
    return json({ status: data.status });
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

  const backgroundTask = runGeneration(
    generation.id,
    interlocuteur,
    corpsDeMetier,
    thematiques,
    nombrePersonnes,
    projectDocs
  );

  // @ts-expect-error EdgeRuntime est fourni par le runtime Supabase, pas typé par npm:docx/supabase-js
  EdgeRuntime.waitUntil(backgroundTask);

  return json({ ok: true, generationId: generation.id });
});
