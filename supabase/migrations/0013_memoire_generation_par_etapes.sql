-- Passage à une génération par étapes (une thématique = un appel Claude) pour rester sous la
-- limite de durée d'exécution des Edge Functions Supabase (150s Free / 400s Pro), qui s'applique
-- aussi aux tâches de fond (EdgeRuntime.waitUntil) et tuait silencieusement les longues générations.
-- sections_json accumule le contenu déjà rédigé section par section ; metadata_json stocke les
-- infos marché extraites du CCTP lors de la première section.

alter table memoire_generations
  add column if not exists sections_json jsonb not null default '[]'::jsonb,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;
