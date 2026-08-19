-- "Moyens humains" devient spécifique à chaque interlocuteur (Vlad, Stéphane, Simon, Eric,
-- Sébastien), pour un même corps de métier — chaque interlocuteur gère des ressources différentes.

create table memoire_moyens_humains (
  corps_de_metier text not null check (corps_de_metier in ('Électricité', 'Interphonie', 'Plomberie', 'Serrurerie')),
  interlocuteur text not null check (interlocuteur in ('Vlad', 'Stéphane', 'Simon', 'Eric', 'Sébastien')),
  contenu text not null default '',
  updated_at timestamptz not null default now(),
  primary key (corps_de_metier, interlocuteur)
);

-- Reprend le contenu déjà saisi dans memoire_company_config.moyens_humains comme point de
-- départ pour les 5 interlocuteurs de chaque métier.
insert into memoire_moyens_humains (corps_de_metier, interlocuteur, contenu)
select c.corps_de_metier, i.interlocuteur, coalesce(c.moyens_humains, '')
from memoire_company_config c
cross join unnest(array['Vlad', 'Stéphane', 'Simon', 'Eric', 'Sébastien']) as i(interlocuteur)
on conflict (corps_de_metier, interlocuteur) do nothing;

alter table memoire_company_config
  drop column if exists moyens_humains;

alter table memoire_moyens_humains enable row level security;
-- Aucune policy anon, comme les autres tables memoire_* : seules les Edge Functions y accèdent.
