-- Sépare le champ "Moyens" en deux : moyens humains et moyens matériels.

alter table memoire_company_config
  add column if not exists moyens_humains text not null default '',
  add column if not exists moyens_materiels text not null default '';

-- Reprend le contenu déjà saisi dans "moyens" comme point de départ pour "moyens_humains".
update memoire_company_config
set moyens_humains = moyens
where moyens is not null and moyens <> '';

alter table memoire_company_config
  drop column if exists moyens;
