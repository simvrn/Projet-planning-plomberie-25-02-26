-- Liste structurée des techniciens par interlocuteur (en plus du texte libre "contenu"), dans
-- l'ordre de priorité : permet de sélectionner de façon fiable et déterministe "les N premières
-- personnes" (interlocuteur + techniciens) selon le nombre de personnes affectées au chantier,
-- sans dépendre de l'IA pour extraire des noms d'un texte libre (source d'incohérences entre
-- sections générées séparément).

alter table memoire_moyens_humains
  add column if not exists techniciens jsonb not null default '[]'::jsonb;
