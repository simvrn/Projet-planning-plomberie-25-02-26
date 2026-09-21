-- Liste structurée des techniciens par interlocuteur (en plus du texte libre "contenu"), dans
-- l'ordre de priorité : permet de sélectionner de façon fiable et déterministe "les N premiers
-- techniciens" (le 1er étant le chef de chantier) selon le nombre de personnes affectées au
-- chantier, sans dépendre de l'IA pour extraire des noms d'un texte libre (source d'incohérences
-- entre sections générées séparément). L'interlocuteur n'est pas compté parmi eux : il gère le
-- chantier (autocontrôle, respect des règles) sans y être présent physiquement.

alter table memoire_moyens_humains
  add column if not exists techniciens jsonb not null default '[]'::jsonb;
