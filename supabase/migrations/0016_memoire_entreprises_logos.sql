-- Le mémoire peut désormais être rédigé au nom de deux entreprises distinctes (choisie dès l'écran
-- de départ) : chacune a son propre nom/adresse (bandeau, en-tête, pied de page) et son propre logo
-- (page de garde + en-tête de chaque page). L'organigramme, lui, est une image unique, commune aux
-- deux entreprises, insérée automatiquement dans la section qui traite des moyens humains.

create table memoire_entreprises (
  nom text primary key,
  adresse text not null default '',
  created_at timestamptz not null default now()
);

insert into memoire_entreprises (nom, adresse)
values ('Edetel Systems', '2 rue des Brosses – 37270 LARÇAY'), ('Elec Service Centre', '')
on conflict (nom) do nothing;

alter table memoire_entreprises enable row level security;

-- Images utilisées dans le .docx généré. Clés : 'logo:<nom entreprise>' et 'organigramme'.
-- Les dimensions d'origine sont conservées pour garder les proportions à l'insertion.
create table memoire_images (
  key text primary key,
  storage_path text not null,
  image_type text not null check (image_type in ('png', 'jpg')),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  updated_at timestamptz not null default now()
);

alter table memoire_images enable row level security;
-- Aucune policy anon, comme les autres tables memoire_* : seules les Edge Functions y accèdent.

alter table memoire_generations
  add column if not exists entreprise text not null default 'Edetel Systems';

-- Bucket public en lecture (aperçu dans l'espace admin), écrit uniquement par l'Edge Function
-- memoire-admin (clé service_role).
insert into storage.buckets (id, name, public)
values ('memoire_assets', 'memoire_assets', true)
on conflict (id) do nothing;

create policy "memoire_assets public read"
  on storage.objects for select
  using (bucket_id = 'memoire_assets');
