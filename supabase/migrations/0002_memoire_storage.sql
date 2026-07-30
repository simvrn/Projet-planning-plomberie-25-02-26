-- Buckets Storage pour le générateur de mémoire technique.
-- Même logique que le bucket existant "interventions_pdfs" : buckets publics en lecture.
-- Seul "memoire_project_docs" autorise l'upload direct depuis le navigateur (clé anon) ;
-- les deux autres ne sont écrits que par les Edge Functions (clé service_role, qui bypass RLS
-- de toute façon — les policies ci-dessous ne servent qu'à ouvrir la lecture publique).

insert into storage.buckets (id, name, public)
values
  ('memoire_project_docs', 'memoire_project_docs', true),
  ('memoire_reference_docs', 'memoire_reference_docs', true),
  ('memoire_generated', 'memoire_generated', true)
on conflict (id) do nothing;

-- Lecture publique sur les 3 buckets
create policy "memoire_project_docs public read"
  on storage.objects for select
  using (bucket_id = 'memoire_project_docs');

create policy "memoire_reference_docs public read"
  on storage.objects for select
  using (bucket_id = 'memoire_reference_docs');

create policy "memoire_generated public read"
  on storage.objects for select
  using (bucket_id = 'memoire_generated');

-- Upload direct anon uniquement pour les documents projet (étape 3, non protégée par mot de passe)
create policy "memoire_project_docs anon upload"
  on storage.objects for insert
  with check (bucket_id = 'memoire_project_docs');

-- Pas de policy insert/update/delete pour memoire_reference_docs et memoire_generated :
-- seule la clé service_role (Edge Functions) peut y écrire.
