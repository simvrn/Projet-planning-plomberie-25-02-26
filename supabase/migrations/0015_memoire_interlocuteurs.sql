-- La liste des interlocuteurs (Vlad, Stéphane, Simon, Eric, Sébastien) devient une liste gérée en
-- base plutôt qu'une liste figée dans le code : on peut désormais ajouter n'importe quelle
-- personne, avec un prénom ET un nom, pour que "Interlocuteur unique" dans le mémoire généré
-- affiche le nom complet (et non plus seulement le prénom).

create table memoire_interlocuteurs (
  prenom text primary key,
  nom text not null default '',
  created_at timestamptz not null default now()
);

insert into memoire_interlocuteurs (prenom)
values ('Vlad'), ('Stéphane'), ('Simon'), ('Eric'), ('Sébastien')
on conflict (prenom) do nothing;

alter table memoire_interlocuteurs enable row level security;
-- Aucune policy anon, comme les autres tables memoire_* : seules les Edge Functions y accèdent.

-- La liste n'étant plus figée, on retire les contraintes CHECK qui limitaient "interlocuteur" aux
-- 5 noms d'origine : la validité est désormais vérifiée côté Edge Function via memoire_interlocuteurs.
alter table memoire_moyens_humains drop constraint if exists memoire_moyens_humains_interlocuteur_check;
alter table memoire_generations drop constraint if exists memoire_generations_interlocuteur_check;
