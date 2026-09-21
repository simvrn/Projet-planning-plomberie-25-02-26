-- Accumule, section par section, les points d'attention que l'IA remonte (info manquante à
-- vérifier, document à joindre au dossier...) pour produire un second fichier très simple,
-- téléchargeable en plus du .docx du mémoire (voir action "finalize" de l'Edge Function
-- memoire-generate).

alter table memoire_generations
  add column if not exists points_attention_json jsonb not null default '[]'::jsonb,
  add column if not exists attention_docx_path text;
