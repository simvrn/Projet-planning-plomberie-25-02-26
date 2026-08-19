-- 3 nouveaux champs entreprise, en complément de l'existant (Présentation, Moyens humains,
-- Moyens matériels, Méthodes, Certifications restent inchangés).

alter table memoire_company_config
  add column if not exists organisation_chantier text not null default '',
  add column if not exists gestion_astreintes text not null default '',
  add column if not exists gestion_milieu_occupe text not null default '';
