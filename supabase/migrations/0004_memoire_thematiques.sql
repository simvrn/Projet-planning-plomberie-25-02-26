-- Ajoute les thématiques demandées par le CCTP (choix multiple parmi une liste fixe),
-- sélectionnées à l'étape 1 et utilisées pour scoper la génération à ces seules sections.

alter table memoire_generations
  add column if not exists thematiques text[] not null default '{}';
