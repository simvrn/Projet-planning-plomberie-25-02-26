export type Interlocuteur = 'Vlad' | 'Stéphane' | 'Simon' | 'Eric' | 'Sébastien';

export type CorpsDeMetier = 'Électricité' | 'Interphonie' | 'Plomberie' | 'Serrurerie';

export const INTERLOCUTEURS: Interlocuteur[] = ['Vlad', 'Stéphane', 'Simon', 'Eric', 'Sébastien'];

export const CORPS_DE_METIER: CorpsDeMetier[] = ['Électricité', 'Interphonie', 'Plomberie', 'Serrurerie'];

export type Thematique =
  | 'Moyens humains'
  | 'Moyens matériel'
  | 'Organisation sur le chantier'
  | 'Gestion des astreintes'
  | 'Gestion en milieu occupé';

export const THEMATIQUES: Thematique[] = [
  'Moyens humains',
  'Moyens matériel',
  'Organisation sur le chantier',
  'Gestion des astreintes',
  'Gestion en milieu occupé',
];

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
  moyens_humains: string;
  moyens_materiels: string;
  organisation_chantier: string;
  gestion_astreintes: string;
  gestion_milieu_occupe: string;
  methodes: string;
  certifications: string;
  updated_at: string;
}

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';
