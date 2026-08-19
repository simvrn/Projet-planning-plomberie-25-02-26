-- Champ RSE (Responsabilité Sociétale des Entreprises), par corps de métier, en complément
-- des autres infos entreprise.

alter table memoire_company_config
  add column if not exists rse text not null default '';
