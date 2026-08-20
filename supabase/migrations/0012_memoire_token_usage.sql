-- Suivi de la consommation de tokens par génération (affiché côté client + historique).

alter table memoire_generations
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer;
