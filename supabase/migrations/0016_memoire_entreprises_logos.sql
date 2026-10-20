-- Le memoire peut etre redige au nom de deux entreprises distinctes, choisie des l ecran de depart.
-- Chacune a son nom, son adresse et son logo (page de garde + en-tete de chaque page).
-- L organigramme est une image unique, commune aux deux entreprises, inseree dans la section
-- qui traite des moyens humains.
-- Script rejouable sans erreur (if not exists / drop if exists).

create table if not exists memoire_entreprises (
  nom text primary key,
  adresse text not null default '',
  created_at timestamptz not null default now()
);

insert into memoire_entreprises (nom, adresse)
values ('Edetel Systems', '2 rue des Brosses – 37270 LARÇAY'), ('Elec Service Centre', '18 impasse du Colombier – 41300 SALBRIS')
on conflict (nom) do nothing;

alter table memoire_entreprises enable row level security;

-- Images du .docx genere. Cles : logo:<nom entreprise> et organigramme.
-- Les dimensions d origine sont conservees pour garder les proportions.
create table if not exists memoire_images (
  key text primary key,
  storage_path text not null,
  image_type text not null check (image_type in ('png', 'jpg')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  updated_at timestamptz not null default now()
);

alter table memoire_images enable row level security;
-- Aucune policy anon, comme les autres tables memoire_* : seules les Edge Functions y accedent.

alter table memoire_generations
  add column if not exists entreprise text not null default 'Edetel Systems';

-- Bucket public en lecture (apercu dans l espace admin), ecrit uniquement par l Edge Function
-- memoire-admin (cle service_role).
insert into storage.buckets (id, name, public)
values ('memoire_assets', 'memoire_assets', true)
on conflict (id) do nothing;

drop policy if exists "memoire_assets public read" on storage.objects;
create policy "memoire_assets public read"
  on storage.objects for select
  using (bucket_id = 'memoire_assets');
