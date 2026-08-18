-- Chaque corps de métier a sa propre base entreprise (infos générales + prompt système),
-- entièrement séparée des autres. memoire_company_config passe d'une ligne unique partagée
-- à une ligne par corps de métier.

create table memoire_company_config_new (
  corps_de_metier text primary key check (corps_de_metier in ('Électricité', 'Interphonie', 'Plomberie', 'Serrurerie')),
  system_prompt text not null default '',
  presentation text not null default '',
  moyens text not null default '',
  methodes text not null default '',
  certifications text not null default '',
  updated_at timestamptz not null default now()
);

-- Reprend le contenu déjà saisi (le cas échéant) comme point de départ pour les 4 métiers.
insert into memoire_company_config_new (corps_de_metier, system_prompt, presentation, moyens, methodes, certifications, updated_at)
select metier, old.system_prompt, old.presentation, old.moyens, old.methodes, old.certifications, now()
from memoire_company_config old, unnest(array['Électricité', 'Interphonie', 'Plomberie', 'Serrurerie']) as metier
where old.id = true
on conflict (corps_de_metier) do nothing;

-- Si la table précédente était vide, on s'assure que les 4 lignes existent quand même.
insert into memoire_company_config_new (corps_de_metier)
values ('Électricité'), ('Interphonie'), ('Plomberie'), ('Serrurerie')
on conflict (corps_de_metier) do nothing;

drop table memoire_company_config;
alter table memoire_company_config_new rename to memoire_company_config;
alter table memoire_company_config enable row level security;
-- Aucune policy anon, comme les autres tables memoire_* : seules les Edge Functions y accèdent.

-- Les mémoires de référence sont désormais strictement rattachés à un seul corps de métier
-- (suppression de la valeur "Général" partagée entre métiers).
alter table memoire_reference_docs
  drop constraint if exists memoire_reference_docs_corps_de_metier_check;

alter table memoire_reference_docs
  alter column corps_de_metier set not null,
  add constraint memoire_reference_docs_corps_de_metier_check
    check (corps_de_metier in ('Électricité', 'Interphonie', 'Plomberie', 'Serrurerie'));
