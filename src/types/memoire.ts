export type Interlocuteur = 'Vlad' | 'Stéphane' | 'Simon' | 'Eric' | 'Sébastien';

export type CorpsDeMetier = 'Électricité' | 'Interphonie' | 'Plomberie' | 'Serrurerie';

export const INTERLOCUTEURS: Interlocuteur[] = ['Vlad', 'Stéphane', 'Simon', 'Eric', 'Sébastien'];

export const CORPS_DE_METIER: CorpsDeMetier[] = ['Électricité', 'Interphonie', 'Plomberie', 'Serrurerie'];

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
