-- Liste complète des thématiques entreprise demandées, en complément de l'existant.
-- "Méthodes" et "Moyens matériels" existent déjà (renommés côté UI en "Méthode de travail" et
-- "Matériel") : pas de nouvelle colonne pour ces deux-là, seulement les 12 vraiment nouvelles.

alter table memoire_company_config
  add column if not exists equipe_organigramme text not null default '',
  add column if not exists informatique_logiciels text not null default '',
  add column if not exists stock_fournisseurs text not null default '',
  add column if not exists environnement text not null default '',
  add column if not exists choix_fournisseurs text not null default '',
  add column if not exists insertion_professionnelle text not null default '',
  add column if not exists taille_entreprise_encadrement text not null default '',
  add column if not exists references_chantiers text not null default '',
  add column if not exists securite_generale text not null default '',
  add column if not exists amiante text not null default '',
  add column if not exists qualite_autocontrole text not null default '',
  add column if not exists relation_locataires text not null default '';
