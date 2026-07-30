-- Générateur de mémoire technique : schéma dédié.
-- Toutes ces tables sont fermées à la clé anon (RLS activé, aucune policy) :
-- seules les Edge Functions (clé service_role, injectée automatiquement) peuvent les lire/écrire.

create extension if not exists pgcrypto;

-- Mot de passe admin (haché). Une seule ligne (id toujours `true`).
create table if not exists memoire_admin_config (
  id boolean primary key default true,
  password_hash text not null,
  constraint memoire_admin_config_single_row check (id)
);

-- Informations générales entreprise + prompt système, éditables par l'admin. Une seule ligne.
create table if not exists memoire_company_config (
  id boolean primary key default true,
  system_prompt text not null default '',
  presentation text not null default '',
  moyens text not null default '',
  methodes text not null default '',
  certifications text not null default '',
  updated_at timestamptz not null default now(),
  constraint memoire_company_config_single_row check (id)
);

insert into memoire_company_config (id)
values (true)
on conflict (id) do nothing;

-- Mémoires techniques déjà rédigés par l'entreprise, uploadés par l'admin comme référence de style.
create table if not exists memoire_reference_docs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text not null,
  corps_de_metier text check (corps_de_metier in ('Électricité', 'Interphonie', 'Plomberie', 'Serrurerie', 'Général')),
  extracted_text text not null,
  uploaded_at timestamptz not null default now()
);

-- Historique des mémoires générés pour un projet.
create table if not exists memoire_generations (
  id uuid primary key default gen_random_uuid(),
  interlocuteur text not null check (interlocuteur in ('Vlad', 'Stéphane', 'Simon', 'Eric', 'Sébastien')),
  corps_de_metier text not null check (corps_de_metier in ('Électricité', 'Interphonie', 'Plomberie', 'Serrurerie')),
  project_doc_names text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  generated_docx_path text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table memoire_admin_config enable row level security;
alter table memoire_company_config enable row level security;
alter table memoire_reference_docs enable row level security;
alter table memoire_generations enable row level security;

-- Aucune "create policy" volontairement : ces tables sont invisibles depuis le navigateur (clé anon).
-- Tout accès passe par les Edge Functions memoire-admin / memoire-generate (clé service_role).

-- Fonction de vérification du mot de passe admin, utilisée uniquement par les Edge Functions
-- (via le client service_role). SECURITY DEFINER pour pouvoir lire memoire_admin_config
-- malgré le RLS fermé ci-dessus.
create or replace function verify_memoire_admin_password(input_password text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select password_hash = crypt(input_password, password_hash)
  from memoire_admin_config
  where id = true;
$$;

-- Dernière étape (à exécuter séparément, une fois) : choisir le mot de passe admin et l'insérer haché.
-- Remplace 'CHOISIS_TON_MOT_DE_PASSE' par le mot de passe réel avant d'exécuter :
--
-- insert into memoire_admin_config (id, password_hash)
-- values (true, crypt('CHOISIS_TON_MOT_DE_PASSE', gen_salt('bf')))
-- on conflict (id) do update set password_hash = excluded.password_hash;
