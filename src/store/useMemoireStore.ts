import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CorpsDeMetier,
  GenerationStatus,
  Interlocuteur,
  ProjectDocFile,
} from '../types/memoire';

// Store dédié à la fonctionnalité "Mémoire technique", entièrement séparé du store du planning
// (pas de persist partagé : aucun risque sur les données du planning déjà sauvegardées).

export type MemoireStep = 'start' | 'upload' | 'result';
export type MemoireView = 'wizard' | 'admin';

interface MemoireStoreState {
  view: MemoireView;
  step: MemoireStep;
  interlocuteur: Interlocuteur | null;
  corpsDeMetier: CorpsDeMetier | null;
  projectDocs: ProjectDocFile[];

  generationStatus: GenerationStatus;
  downloadUrl: string | null;
  generationError: string | null;

  adminUnlocked: boolean;
  adminPassword: string | null;

  setView: (view: MemoireView) => void;
  setStep: (step: MemoireStep) => void;
  setInterlocuteur: (value: Interlocuteur) => void;
  setCorpsDeMetier: (value: CorpsDeMetier) => void;

  addProjectDocs: (files: File[]) => string[];
  updateProjectDoc: (id: string, data: Partial<ProjectDocFile>) => void;
  removeProjectDoc: (id: string) => void;

  startGeneration: () => void;
  setGenerationSuccess: (downloadUrl: string) => void;
  setGenerationError: (message: string) => void;

  unlockAdmin: (password: string) => void;
  lockAdmin: () => void;

  resetWizard: () => void;
}

export const useMemoireStore = create<MemoireStoreState>((set, get) => ({
  view: 'wizard',
  step: 'start',
  interlocuteur: null,
  corpsDeMetier: null,
  projectDocs: [],

  generationStatus: 'idle',
  downloadUrl: null,
  generationError: null,

  adminUnlocked: false,
  adminPassword: null,

  setView: (view) => set({ view }),
  setStep: (step) => set({ step }),
  setInterlocuteur: (value) => set({ interlocuteur: value }),
  setCorpsDeMetier: (value) => set({ corpsDeMetier: value }),

  addProjectDocs: (files) => {
    const newDocs: ProjectDocFile[] = files.map((file) => ({
      id: uuidv4(),
      name: file.name,
      file,
      extractedText: null,
      status: 'extracting',
    }));
    set({ projectDocs: [...get().projectDocs, ...newDocs] });
    return newDocs.map((d) => d.id);
  },

  updateProjectDoc: (id, data) => {
    set({
      projectDocs: get().projectDocs.map((doc) => (doc.id === id ? { ...doc, ...data } : doc)),
    });
  },

  removeProjectDoc: (id) => {
    set({ projectDocs: get().projectDocs.filter((doc) => doc.id !== id) });
  },

  startGeneration: () => set({ generationStatus: 'generating', generationError: null, downloadUrl: null }),
  setGenerationSuccess: (downloadUrl) => set({ generationStatus: 'done', downloadUrl }),
  setGenerationError: (message) => set({ generationStatus: 'error', generationError: message }),

  unlockAdmin: (password) => set({ adminUnlocked: true, adminPassword: password }),
  lockAdmin: () => set({ adminUnlocked: false, adminPassword: null }),

  resetWizard: () =>
    set({
      step: 'start',
      interlocuteur: null,
      corpsDeMetier: null,
      projectDocs: [],
      generationStatus: 'idle',
      downloadUrl: null,
      generationError: null,
    }),
}));
