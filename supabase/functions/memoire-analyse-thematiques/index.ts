// Edge Function "memoire-analyse-thematiques"
// Reçoit le texte du "pré-mémoire" (les questions/exigences telles que posées par l'appel
// d'offres) et demande à Claude de déterminer, parmi la liste fixe de thématiques disponibles,
// lesquelles il faut traiter pour répondre de façon optimale. Le résultat n'est qu'une
// PROPOSITION : l'utilisateur la valide/ajuste ensuite côté client avant la génération finale.

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

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const CLAUDE_MODEL = 'claude-sonnet-5';

// Doit rester synchronisé avec THEMATIQUES dans src/types/memoire.ts.
const THEMATIQUES_DISPONIBLES = [
  'Moyens humains',
  'Présentation',
  'Équipe et organigramme (qui fait quoi)',
  'Méthode de travail (comment on suit les interventions)',
  'Matériel (outils, protections)',
  'Informatique et logiciels',
  'Stock et fournisseurs (logistique)',
  'Organisation sur le chantier',
  'Environnement (déchets, énergie, mobilité)',
  'Choix des fournisseurs',
  "Insertion professionnelle (aide à l'emploi)",
  "Taille de l'entreprise et encadrement",
  'Références (chantiers déjà faits)',
  'Sécurité générale',
  'Amiante (procédure à part)',
  'Qualité et autocontrôle',
  'Relation avec les locataires',
  'Gestion des astreintes',
  'Gestion en milieu occupé',
  'Certifications',
  'RSE',
];

const analyseTool = {
  name: 'submit_thematiques',
  description: 'Soumets la liste des thématiques pertinentes pour répondre de façon optimale à cet appel d\'offres.',
  input_schema: {
    type: 'object',
    properties: {
      thematiques: {
        type: 'array',
        items: { type: 'string', enum: THEMATIQUES_DISPONIBLES },
        description: 'Sous-ensemble de la liste fournie, les thématiques réellement pertinentes pour ce pré-mémoire.',
      },
    },
    required: ['thematiques'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  let body: { preMemoireText?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corps de requête JSON invalide' }, 400);
  }

  const preMemoireText = body.preMemoireText?.trim();
  if (!preMemoireText) {
    return json({ error: 'preMemoireText requis' }, 400);
  }

  const userPrompt = `Voici le "pré-mémoire" d'un appel d'offres : le texte ci-dessous liste les questions et exigences auxquelles un mémoire technique doit répondre.

# Pré-mémoire
${preMemoireText.slice(0, 30000)}

# Thématiques disponibles
${THEMATIQUES_DISPONIBLES.map((t) => `- ${t}`).join('\n')}

Détermine quelles thématiques, parmi cette liste, doivent être traitées dans le mémoire technique pour répondre de façon optimale et complète à ce pré-mémoire. N'hésite pas à en sélectionner beaucoup si le pré-mémoire est exigeant, ou peu s'il est ciblé — l'objectif est la pertinence, pas un nombre minimal ou maximal. Réponds en appelant l'outil submit_thematiques.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        system: "Tu es un expert en réponse aux appels d'offres du bâtiment, capable d'identifier précisément quels sujets un mémoire technique doit couvrir à partir des exigences d'un pré-mémoire.",
        messages: [{ role: 'user', content: userPrompt }],
        tools: [analyseTool],
        tool_choice: { type: 'tool', name: 'submit_thematiques' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return json({ error: `Erreur API Claude (${response.status}) : ${errText}` }, 500);
    }

    const data = await response.json();
    const toolUse = data.content?.find((block: { type: string }) => block.type === 'tool_use');
    if (!toolUse) return json({ error: 'Claude n\'a pas retourné de sélection structurée' }, 500);

    const suggested = (toolUse.input?.thematiques as string[] | undefined) ?? [];
    const thematiques = suggested.filter((t) => THEMATIQUES_DISPONIBLES.includes(t));

    return json({ thematiques });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erreur inconnue' }, 500);
  }
});
