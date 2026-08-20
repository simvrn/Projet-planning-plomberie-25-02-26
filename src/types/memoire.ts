export type Interlocuteur = 'Vlad' | 'Stéphane' | 'Simon' | 'Eric' | 'Sébastien';

export type CorpsDeMetier = 'Électricité' | 'Interphonie' | 'Plomberie' | 'Serrurerie';

export const INTERLOCUTEURS: Interlocuteur[] = ['Vlad', 'Stéphane', 'Simon', 'Eric', 'Sébastien'];

export const CORPS_DE_METIER: CorpsDeMetier[] = ['Électricité', 'Interphonie', 'Plomberie', 'Serrurerie'];

// Aligné sur les champs de l'espace admin (Infos entreprise) + Moyens humains (géré à part,
// par interlocuteur). Utilisé pour la sélection manuelle et par l'analyse IA du pré-mémoire.
export const THEMATIQUES = [
  'Moyens humains',
  'Présentation',
  'Équipe et organigramme (qui fait quoi)',
  'Méthode de travail (comment on suit les interventions)',
  'Matériel (outils, protections)',
  'Informatique et logiciels',
  'Stock et fournisseurs (logistique)',
  'Organisation sur le chantier',
  'Environnement (déchets, énergie, mobilité)',
  'Choix des fournisseurs',
  "Insertion professionnelle (aide à l'emploi)",
  "Taille de l'entreprise et encadrement",
  'Références (chantiers déjà faits)',
  'Sécurité générale',
  'Amiante (procédure à part)',
  'Qualité et autocontrôle',
  'Relation avec les locataires',
  'Gestion des astreintes',
  'Gestion en milieu occupé',
  'Certifications',
  'RSE',
] as const;

export type Thematique = (typeof THEMATIQUES)[number];

export interface ProjectDocFile {
  id: string;
  name: string;
  file: File;
  extractedText: string | null;
  status: 'extracting' | 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  storagePath?: string;
}

export interface ReferenceDoc {
  id: string;
  file_name: string;
  storage_path: string;
  corps_de_metier: CorpsDeMetier;
  uploaded_at: string;
}

export interface CompanyConfig {
  corps_de_metier: CorpsDeMetier;
  system_prompt: string;
  structure_prompt: string;
  presentation: string;
  equipe_organigramme: string;
  methodes: string;
  moyens_materiels: string;
  informatique_logiciels: string;
  stock_fournisseurs: string;
  organisation_chantier: string;
  environnement: string;
  choix_fournisseurs: string;
  insertion_professionnelle: string;
  taille_entreprise_encadrement: string;
  references_chantiers: string;
  securite_generale: string;
  amiante: string;
  qualite_autocontrole: string;
  relation_locataires: string;
  gestion_astreintes: string;
  gestion_milieu_occupe: string;
  certifications: string;
  rse: string;
  updated_at: string;
}

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';
