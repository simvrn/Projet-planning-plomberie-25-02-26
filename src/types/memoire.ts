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
  corps_de_metier: string | null;
  uploaded_at: string;
}

export interface CompanyConfig {
  system_prompt: string;
  presentation: string;
  moyens: string;
  methodes: string;
  certifications: string;
  updated_at: string;
}

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error';
