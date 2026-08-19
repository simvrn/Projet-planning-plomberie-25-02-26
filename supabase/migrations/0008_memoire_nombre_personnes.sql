-- Nombre de personnes affectées au chantier, renseigné à l'étape 1 et injecté dans le prompt
-- (utile notamment pour la section "Moyens humains").

alter table memoire_generations
  add column if not exists nombre_personnes integer check (nombre_personnes between 1 and 8);
