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
  Header,
  Footer,
  PageNumber,
} from 'npm:docx@9';

const NUMBERED_LIST_REFERENCE = 'memoire-numbered-list';
const BULLET_LIST_REFERENCE = 'memoire-bullet-list';

// Charte graphique du document généré : bleu corporate + accents pour bandeaux/encadrés/tableaux.
const BRAND_BLUE = '1F4E79';
const BRAND_BLUE_LIGHT = 'DCE6F1';
const BRAND_BLUE_PALE = 'EEF3FA';
const BADGE_DARK = '15374F';
const ACCENT_BLUE = '3F7CAC';
const TOTAL_ROW_FILL = 'DCEEE8';
const ZEBRA_FILL = 'F5F7FA';

// L'app est l'outil interne d'EDETEL SYSTEMS : ces infos figurent en toutes lettres sur le
// papier à en-tête réel de l'entreprise, ce n'est pas une donnée inventée.
const COMPANY_NAME = 'EDETEL SYSTEMS';
const COMPANY_ADDRESS = '2 rue des Brosses – 37270 LARÇAY';

const CALLOUT_PALETTE: { border: string; fill: string; text: string }[] = [
  { border: '2E7D6B', fill: 'E1F0EA', text: '1F5C4D' },
  { border: '2E5C8A', fill: 'E4EDF7', text: '1F4E79' },
  { border: 'C97A3A', fill: 'FBEEE1', text: 'A85D22' },
];

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
Réponds directement en rédigeant le mémoire en Markdown, sans préambule ni commentaire hors document (pas de "Voici le mémoire...").

Avant toute chose, commence ta réponse par un bloc de métadonnées entre triples backticks avec le mot "meta", pour les informations suivantes SI ET SEULEMENT SI elles sont explicitement indiquées dans les documents du projet fournis (CCTP, règlement de consultation, acte d'engagement...) — laisse la valeur vide après les deux-points si l'information n'apparaît pas, ne l'invente JAMAIS :
\`\`\`meta
client: (nom du maître d'ouvrage / bailleur / donneur d'ordre)
objet: (intitulé du marché ou de l'accord-cadre)
lot: (numéro et intitulé du lot concerné)
pouvoir_adjudicateur: (nom et fonction du signataire côté maître d'ouvrage)
montant_maximum: (montant maximum du marché HT, si indiqué)
perimetre: (nombre de résidences/logements/sites ou périmètre géographique)
duree: (durée du marché et modalités de reconduction)
\`\`\`

Puis structure le corps du document avec exactement 4 niveaux de titres Markdown, chacun ayant un rôle précis dans la mise en page finale :
- # : le titre général du mémoire (une seule fois, juste après le bloc meta).
- ## : chaque section principale, une par thématique demandée (elle sera mise en avant avec un bandeau numéroté). Si la thématique demandée précise un nombre de points (ex. "Méthodologie (20 points)"), reporte ce "(N points)" à la toute fin du titre ##.
- ### : les sous-parties numérotées à l'intérieur d'une section (ex. présentation, données chiffrées, équipe dédiée...). C'est le niveau le plus utilisé pour découper le contenu.
- #### : uniquement pour scinder occasionnellement une sous-partie ### en plusieurs blocs courts et bien distincts (ex. plusieurs domaines de compétences, plusieurs procédures) — reste exceptionnel, n'en abuse pas.

Utilise des listes à puces (-) ou numérotées (1.) pour le matériel/les étapes/les points de contrôle, des tableaux Markdown (|...|) pour les données chiffrées ou comparatives, et **gras** pour les termes importants. Pour un tableau à 2 colonnes de type clé/valeur, ne mets pas de ligne d'en-tête générique ("Clé | Valeur") : commence directement par les lignes de données.`;

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
  points?: number;
}

interface MemoireContent {
  title: string;
  sections: MemoireSection[];
}

interface MemoireMetadata {
  client?: string;
  objet?: string;
  lot?: string;
  pouvoirAdjudicateur?: string;
  montantMaximum?: string;
  perimetre?: string;
  duree?: string;
}

// Extrait le bloc ```meta ...``` que Claude place en tête de sa réponse (voir
// OUTPUT_FORMAT_INSTRUCTIONS) et retire ce bloc du texte avant le parsing des sections, pour
// qu'il ne soit jamais interprété comme du contenu de mémoire.
function extractMetadata(markdown: string): { metadata: MemoireMetadata; cleaned: string } {
  const match = markdown.match(/```meta\s*([\s\S]*?)```/i);
  const metadata: MemoireMetadata = {};
  if (!match) return { metadata, cleaned: markdown };

  const fieldMap: Record<string, keyof MemoireMetadata> = {
    client: 'client',
    objet: 'objet',
    lot: 'lot',
    pouvoir_adjudicateur: 'pouvoirAdjudicateur',
    montant_maximum: 'montantMaximum',
    perimetre: 'perimetre',
    duree: 'duree',
  };

  for (const line of match[1].split('\n')) {
    const kv = line.match(/^\s*([a-z_]+)\s*:\s*(.*)$/i);
    if (!kv) continue;
    const field = fieldMap[kv[1].trim().toLowerCase()];
    const value = kv[2].trim();
    if (field && value) metadata[field] = value;
  }

  const cleaned = markdown.slice(0, match.index) + markdown.slice((match.index ?? 0) + match[0].length);
  return { metadata, cleaned };
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

// Extrait un "(N points)" en fin de titre de section (reporté depuis la thématique demandée,
// voir OUTPUT_FORMAT_INSTRUCTIONS) pour l'afficher comme badge séparé plutôt que dans le texte.
function extractPoints(heading: string): { heading: string; points?: number } {
  const match = heading.match(/\(\s*(\d+)\s*points?\s*\)\s*$/i);
  if (!match) return { heading };
  return { heading: heading.slice(0, match.index).trim(), points: parseInt(match[1], 10) };
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

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/\*\*/g, '').trim();
      if (!titleFound && level === 1) {
        title = text;
        titleFound = true;
        continue;
      }
      const { heading, points } = extractPoints(text);
      currentSection = { heading, level: Math.min(level, 4), content: [], points };
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

const CLAUDE_CALL_TIMEOUT_MS = 9 * 60 * 1000; // 9 minutes — au-delà, on considère l'appel bloqué.

async function callClaude(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: MemoireContent; metadata: MemoireMetadata; usage: TokenUsage }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_CALL_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
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
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `L'appel à Claude n'a pas répondu dans les ${CLAUDE_CALL_TIMEOUT_MS / 60000} minutes (connexion probablement bloquée). Réessaie.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

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

  const { metadata, cleaned } = extractMetadata(textBlock.text);
  const parsed = parseMarkdownToMemoire(cleaned);
  if (parsed.sections.length === 0) {
    throw new Error('Claude n’a pas retourné de contenu structuré exploitable (aucune section détectée)');
  }

  const usage: TokenUsage = {
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    maxTokens: MAX_OUTPUT_TOKENS,
  };

  return { content: parsed, metadata, usage };
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

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
}

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
  left: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
  right: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT },
};

// Tableau à 2 colonnes : rendu en paires clé/valeur (colonne gauche teintée), utilisé pour les
// fiches synthétiques (infos marché, structure d'équipe...).
function buildKeyValueTable(rows: string[][]): InstanceType<typeof Table> {
  const tableRows = rows.map((row) => {
    const label = row[0] ?? '';
    const value = row[1] ?? '';
    const isHighlight = /moy|total|synthèse/i.test(label);
    return new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 32, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: isHighlight ? TOTAL_ROW_FILL : BRAND_BLUE_LIGHT },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 120, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: BRAND_BLUE })] })],
        }),
        new TableCell({
          width: { size: 68, type: WidthType.PERCENTAGE },
          shading: isHighlight ? { type: ShadingType.CLEAR, fill: TOTAL_ROW_FILL } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 120, right: 100 },
          children: [new Paragraph({ children: parseInlineRuns(value) })],
        }),
      ],
    });
  });

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows, borders: TABLE_BORDERS });
}

// Tableau à 3+ colonnes : rendu classique avec ligne d'en-tête bleu foncé, lignes alternées, et
// mise en avant de la ligne de total/synthèse si détectée.
function buildHeaderRowTable(rows: string[][]): InstanceType<typeof Table> {
  const columnCount = Math.max(...rows.map((r) => r.length));
  const tableRows = rows.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const isHighlight = !isHeader && /moy|total|synthèse/i.test(row[0] ?? '');
    const zebra = !isHeader && !isHighlight && rowIndex % 2 === 0;
    const cells = Array.from({ length: columnCount }, (_, colIndex) => {
      const cellText = row[colIndex] ?? '';
      let fill: string | undefined;
      if (isHeader) fill = BRAND_BLUE;
      else if (isHighlight) fill = TOTAL_ROW_FILL;
      else if (zebra) fill = ZEBRA_FILL;
      return new TableCell({
        width: { size: Math.floor(100 / columnCount), type: WidthType.PERCENTAGE },
        shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellText,
                bold: isHeader || isHighlight,
                color: isHeader ? 'FFFFFF' : isHighlight ? BRAND_BLUE : undefined,
              }),
            ],
          }),
        ],
      });
    });
    return new TableRow({ cantSplit: true, children: cells });
  });

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows, borders: TABLE_BORDERS });
}

function buildTable(rows: string[][]): InstanceType<typeof Table> {
  const columnCount = Math.max(...rows.map((r) => r.length));
  return columnCount === 2 ? buildKeyValueTable(rows) : buildHeaderRowTable(rows);
}

function pushContentBlocks(
  content: MemoireContentBlock[] | undefined,
  children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[]
) {
  for (const block of content ?? []) {
    if (block.type === 'table' && block.rows?.length) {
      children.push(buildTable(block.rows));
      children.push(new Paragraph({ text: '', spacing: { after: 120 } }));
      continue;
    }
    const runs = parseInlineRuns(block.text ?? '');
    if (block.type === 'bullet') {
      children.push(new Paragraph({ children: runs, numbering: { reference: BULLET_LIST_REFERENCE, level: 0 } }));
    } else if (block.type === 'numbered') {
      children.push(new Paragraph({ children: runs, numbering: { reference: NUMBERED_LIST_REFERENCE, level: 0 } }));
    } else {
      children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
    }
  }
}

// Bandeau plein-cadre numéroté d'une section principale (thématique), avec badge "N points" à
// droite si le titre en portait un (voir extractPoints). Le titre garde le style Word "Heading 1"
// (formatage écrasé par les TextRun explicites) pour rester capté par le Sommaire (TOC).
function buildSectionBanner(number: number, heading: string, points: number | undefined): InstanceType<typeof Table> {
  const numberCellWidth = 8;
  const pointsCellWidth = points ? 14 : 0;
  const headingCellWidth = 100 - numberCellWidth - pointsCellWidth;

  const cells = [
    new TableCell({
      width: { size: numberCellWidth, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: BADGE_DARK },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 160, bottom: 160, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(number), bold: true, color: 'FFFFFF', size: 32 })],
        }),
      ],
    }),
    new TableCell({
      width: { size: headingCellWidth, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: BRAND_BLUE },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 160, bottom: 160, left: 200, right: 200 },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: heading, bold: true, color: 'FFFFFF', size: 24 })],
        }),
      ],
    }),
  ];

  if (points) {
    cells.push(
      new TableCell({
        width: { size: pointsCellWidth, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: ACCENT_BLUE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 160, bottom: 160, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 20 },
            children: [new TextRun({ text: String(points), bold: true, color: 'FFFFFF', size: 24 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'points', color: 'FFFFFF', size: 16 })],
          }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [new TableRow({ cantSplit: true, children: cells })],
  });
}

// Encadré coloré (utilisé pour les sous-parties #### occasionnelles) : barre d'accent + fond
// teinté, couleur qui tourne dans une petite palette pour distinguer visuellement les blocs
// consécutifs, comme dans les mémoires de référence de l'entreprise.
function buildCalloutBox(
  heading: string,
  content: MemoireContentBlock[] | undefined,
  colorIndex: number
): InstanceType<typeof Table> {
  const palette = CALLOUT_PALETTE[colorIndex % CALLOUT_PALETTE.length];
  const innerChildren: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [
    new Paragraph({
      children: [new TextRun({ text: heading, bold: true, color: palette.text, size: 22 })],
      spacing: { after: 100 },
    }),
  ];
  pushContentBlocks(content, innerChildren);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders(),
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 2, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: palette.border },
            children: [new Paragraph({ text: '' })],
          }),
          new TableCell({
            width: { size: 98, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: palette.fill },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: innerChildren,
          }),
        ],
      }),
    ],
  });
}

// En-tête répété sur chaque page : nom du client/lot à gauche, périmètre/date à droite, avec un
// filet de séparation — reprend la mise en page des mémoires déjà livrés par l'entreprise.
function buildRunningHeader(
  metadata: MemoireMetadata,
  corpsDeMetier: string
): InstanceType<typeof Header> {
  const leftText = metadata.client && metadata.lot
    ? `${COMPANY_NAME} × ${metadata.client} | ${metadata.lot}`
    : metadata.client
    ? `${COMPANY_NAME} × ${metadata.client}`
    : `${COMPANY_NAME} | Mémoire technique – ${corpsDeMetier}`;
  const rightParts = [metadata.perimetre, new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })].filter(Boolean);

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: leftText, bold: true, color: BRAND_BLUE, size: 15 })] })],
              }),
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: rightParts.join(' · '), color: ACCENT_BLUE, size: 15 })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: '', border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_BLUE, space: 4 } } }),
    ],
  });
}

function buildFooter(metadata: MemoireMetadata, corpsDeMetier: string): InstanceType<typeof Footer> {
  const confidentialFor = metadata.client || corpsDeMetier;
  return new Footer({
    children: [
      new Paragraph({ text: '', border: { top: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT, space: 4 } } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 75, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${COMPANY_NAME} – ${COMPANY_ADDRESS} | Confidentiel – usage exclusif ${confidentialFor}`,
                        color: '5A5A5A',
                        size: 15,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({ children: [PageNumber.CURRENT], color: BRAND_BLUE, size: 15 }),
                      new TextRun({ text: ' / ', color: BRAND_BLUE, size: 15 }),
                      new TextRun({ children: [PageNumber.TOTAL_PAGES], color: BRAND_BLUE, size: 15 }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Page de garde : bandeau EDETEL SYSTEMS, encart objet/client/lot/périmètre (uniquement les
// lignes dont l'IA a effectivement extrait une valeur du CCTP, voir extractMetadata), puis la
// fiche "infos marché" — toujours les rubriques que l'app connaît elle-même (candidat,
// interlocuteur), les autres seulement si extraites.
function buildCoverPage(
  content: MemoireContent,
  metadata: MemoireMetadata,
  interlocuteur: string,
  corpsDeMetier: string
): (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] {
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];
  children.push(new Paragraph({ text: '', spacing: { after: 400 } }));

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: BRAND_BLUE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 400, bottom: 300, left: 300, right: 300 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: COMPANY_NAME, bold: true, color: 'FFFFFF', size: 56 })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80 },
                  children: [new TextRun({ text: COMPANY_ADDRESS, color: 'FFFFFF', size: 20 })],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  const subtitleLines: InstanceType<typeof Paragraph>[] = [];
  const objet = metadata.objet || content.title;
  if (objet) {
    subtitleLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160 },
        children: [new TextRun({ text: objet, bold: true, color: '2E5C8A', size: 24 })],
      })
    );
  }
  if (metadata.client) {
    subtitleLines.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: metadata.client, bold: true, color: BRAND_BLUE, size: 24 })] })
    );
  }
  if (metadata.lot) {
    subtitleLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [new TextRun({ text: metadata.lot.toUpperCase(), bold: true, color: '2E7D6B', size: 20 })],
      })
    );
  }
  if (metadata.perimetre) {
    subtitleLines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 160 },
        children: [new TextRun({ text: metadata.perimetre, color: ACCENT_BLUE, size: 20 })],
      })
    );
  }
  if (subtitleLines.length === 0) {
    subtitleLines.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Interlocuteur : ${interlocuteur}`, color: BRAND_BLUE, size: 22 })] })
    );
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: BRAND_BLUE_PALE },
              margins: { top: 200, bottom: 200, left: 300, right: 300 },
              children: subtitleLines,
            }),
          ],
        }),
      ],
    })
  );
  children.push(new Paragraph({ text: '', spacing: { after: 300 } }));

  const infoRows: string[][] = [];
  if (metadata.pouvoirAdjudicateur) infoRows.push(['Pouvoir adjudicateur', metadata.pouvoirAdjudicateur]);
  if (metadata.lot) infoRows.push(['Lot concerné', metadata.lot]);
  else infoRows.push(['Corps de métier concerné', corpsDeMetier]);
  if (metadata.montantMaximum) infoRows.push(['Montant maximum', metadata.montantMaximum]);
  if (metadata.perimetre) infoRows.push(['Périmètre', metadata.perimetre]);
  if (metadata.duree) infoRows.push(['Durée', metadata.duree]);
  infoRows.push(['Candidat', `${COMPANY_NAME} – ${COMPANY_ADDRESS}`]);
  infoRows.push(['Interlocuteur unique', interlocuteur]);

  children.push(buildKeyValueTable(infoRows));
  children.push(new Paragraph({ children: [new PageBreak()] }));
  return children;
}

async function buildDocx(
  content: MemoireContent,
  metadata: MemoireMetadata,
  interlocuteur: string,
  corpsDeMetier: string
): Promise<Uint8Array> {
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  children.push(...buildCoverPage(content, metadata, interlocuteur, corpsDeMetier));

  children.push(new Paragraph({ text: 'Sommaire', heading: HeadingLevel.HEADING_1 }));
  children.push(
    new TableOfContents('Sommaire (clic droit → "Mettre à jour les champs" à l’ouverture)', {
      hyperlink: true,
      headingStyleRange: '1-2',
    })
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  let sectionCounter = 0;
  let subCounter = 0;
  let calloutIndex = 0;

  for (const section of content.sections) {
    const cleanHeading = section.heading.replace(/^\d+(\.\d+)*[.)]?\s*/, '').trim();
    if (section.level <= 2) {
      sectionCounter++;
      subCounter = 0;
      calloutIndex = 0;
      children.push(buildSectionBanner(sectionCounter, cleanHeading, section.points));
      children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
      pushContentBlocks(section.content, children);
    } else if (section.level === 3) {
      subCounter++;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `${sectionCounter}.${subCounter}  ${cleanHeading}`, bold: true, color: BRAND_BLUE, size: 25 })],
          spacing: { before: 280, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE_LIGHT, space: 4 } },
        })
      );
      pushContentBlocks(section.content, children);
    } else {
      calloutIndex++;
      children.push(buildCalloutBox(cleanHeading, section.content, calloutIndex));
      children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: NUMBERED_LIST_REFERENCE,
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        },
        {
          reference: BULLET_LIST_REFERENCE,
          levels: [
            {
              level: 0,
              format: 'bullet',
              text: '▸',
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 400, hanging: 300 } } },
            },
          ],
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
        headers: { default: buildRunningHeader(metadata, corpsDeMetier) },
        footers: { default: buildFooter(metadata, corpsDeMetier) },
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

    // Ordre volontaire (demandé) : prompt système -> structure -> thématiques (les questions
    // auxquelles répondre) -> infos entreprise -> moyens humains -> mémoires de référence ->
    // documents projet. Les questions arrivent tôt pour que le modèle sache ce qu'on lui demande
    // avant d'être noyé sous le contexte, plutôt que l'inverse.
    const systemPrompt = `${config.system_prompt?.trim() || DEFAULT_SYSTEM_PROMPT}${structureSection}

${OUTPUT_FORMAT_INSTRUCTIONS}`;

    const configRecord = config as unknown as Record<string, string>;

    // On n'inclut que les rubriques réellement renseignées : afficher 15 blocs "(non renseigné)"
    // noie le prompt et pousse le modèle vers un mode "cocher les cases" plutôt qu'une rédaction
    // aussi riche que possible sur ce qui est effectivement fourni.
    const companyInfoBlocks: string[] = [];
    for (const [col, label] of COMPANY_CONFIG_FIELDS) {
      const value = configRecord[col]?.trim();
      if (value) companyInfoBlocks.push(`## ${label}\n${value}`);
    }
    const companyInfoSection = companyInfoBlocks.length
      ? companyInfoBlocks.join('\n\n')
      : "(Aucune information entreprise renseignée dans l'espace admin pour ce corps de métier.)";

    const moyensHumainsSection = moyensHumains.contenu?.trim()
      ? moyensHumains.contenu.trim()
      : `(Aucun moyen humain renseigné dans l'espace admin pour ${interlocuteur} / ${corpsDeMetier}.)`;

    const referenceSection = referenceDocs.length
      ? referenceDocs
          .map(
            (d, i) =>
              `### Exemple de référence ${i + 1} (${d.file_name})\n${truncate(d.extracted_text, 6000)}`
          )
          .join('\n\n')
      : 'Aucun mémoire de référence disponible.';

    const projectDocsSection = projectDocs
      .map((d, i) => `### Document projet ${i + 1} : ${d.name}\n${truncate(d.extractedText, 400000)}`)
      .join('\n\n---\n\n');

    const thematiquesSection = thematiques.map((t) => `- ${t}`).join('\n');

    const userPrompt = `Rédige un mémoire technique pour répondre à un appel d'offres.

Interlocuteur principal côté entreprise : ${interlocuteur}
Corps de métier concerné : ${corpsDeMetier}
Nombre de personnes affectées au chantier : ${nombrePersonnes}

# Thématiques demandées (les questions auxquelles ce mémoire doit répondre)
Structure le corps du mémoire en une section principale par thématique ci-dessous — ne pars pas sur un tout autre sujet non listé, mais tu peux librement ajouter une introduction générale en début de document et une conclusion en fin si cela renforce le mémoire :
${thematiquesSection}

# Informations sur l'entreprise (uniquement ce qui a été renseigné)

${companyInfoSection}

# Moyens humains (pour ${interlocuteur})

${moyensHumainsSection}

# Mémoires de référence de l'entreprise
(À utiliser UNIQUEMENT pour le ton, le style et la structure — ne reprends jamais leur contenu spécifique à un autre projet.)

${referenceSection}

# Documents du projet en cours
(CCTP, plans, cahier des charges... C'est le contenu sur lequel le mémoire doit être précisément basé.)

${projectDocsSection}

Rédige maintenant le mémoire technique complet, directement en Markdown (voir le format attendu dans les instructions système). Développe chaque thématique en profondeur (plusieurs paragraphes/points par section, en t'appuyant sur des passages précis du CCTP ci-dessus) — pas de section réduite à une ou deux phrases. Tu as toute la place nécessaire (aucune limite de longueur pratique) : ne t'arrête pas dès qu'un point minimal est couvert, traite chaque thématique avec le niveau de détail et d'exhaustivité que tu produirais si on te demandait, tour après tour dans une conversation, d'approfondir chaque partie une à une.`;

    const { content, metadata, usage } = await callClaude(systemPrompt, userPrompt);
    const docxBytes = await buildDocx(content, metadata, interlocuteur, corpsDeMetier);

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
