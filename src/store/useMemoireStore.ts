import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CorpsDeMetier, GenerationStatus, Interlocuteur, ProjectDocFile } from '../types/memoire';
import type { TokenUsage } from '../lib/memoire/memoireApi';

// Store dédié à la fonctionnalité "Mémoire technique", entièrement séparé du store du planning
// (pas de persist partagé : aucun risque sur les données du planning déjà sauvegardées).

export type MemoireStep = 'start' | 'premoire' | 'upload' | 'result';
export type MemoireView = 'wizard' | 'admin';

interface MemoireStoreState {
  view: MemoireView;
  step: MemoireStep;
  interlocuteur: Interlocuteur | null;
  corpsDeMetier: CorpsDeMetier | null;
  thematiques: string[];
  nombrePersonnes: number | null;
  projectDocs: ProjectDocFile[];

  generationStatus: GenerationStatus;
  generationProgress: { current: number; total: number; thematique: string } | null;
  downloadUrl: string | null;
  generationError: string | null;
  generationUsage: TokenUsage | null;

  adminUnlocked: boolean;
  adminPassword: string | null;

  setView: (view: MemoireView) => void;
  setStep: (step: MemoireStep) => void;
  setInterlocuteur: (value: Interlocuteur) => void;
  setCorpsDeMetier: (value: CorpsDeMetier) => void;
  setThematiques: (list: string[]) => void;
  setNombrePersonnes: (value: number) => void;

  addProjectDocs: (files: File[]) => string[];
  updateProjectDoc: (id: string, data: Partial<ProjectDocFile>) => void;
  removeProjectDoc: (id: string) => void;

  startGeneration: () => void;
  setGenerationProgress: (progress: { current: number; total: number; thematique: string }) => void;
  setGenerationSuccess: (downloadUrl: string, usage: TokenUsage) => void;
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
  thematiques: [],
  nombrePersonnes: null,
  projectDocs: [],

  generationStatus: 'idle',
  generationProgress: null,
  downloadUrl: null,
  generationError: null,
  generationUsage: null,

  adminUnlocked: false,
  adminPassword: null,

  setView: (view) => set({ view }),
  setStep: (step) => set({ step }),
  setInterlocuteur: (value) => set({ interlocuteur: value }),
  setCorpsDeMetier: (value) => set({ corpsDeMetier: value }),
  setThematiques: (list) => set({ thematiques: list }),
  setNombrePersonnes: (value) => set({ nombrePersonnes: value }),

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

  startGeneration: () =>
    set({
      generationStatus: 'generating',
      generationProgress: null,
      generationError: null,
      downloadUrl: null,
      generationUsage: null,
    }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
  setGenerationSuccess: (downloadUrl, usage) => set({ generationStatus: 'done', downloadUrl, generationUsage: usage }),
  setGenerationError: (message) => set({ generationStatus: 'error', generationError: message }),

  unlockAdmin: (password) => set({ adminUnlocked: true, adminPassword: password }),
  lockAdmin: () => set({ adminUnlocked: false, adminPassword: null }),

  resetWizard: () =>
    set({
      step: 'start',
      interlocuteur: null,
      corpsDeMetier: null,
      thematiques: [],
      nombrePersonnes: null,
      projectDocs: [],
      generationStatus: 'idle',
      generationProgress: null,
      downloadUrl: null,
      generationError: null,
      generationUsage: null,
    }),
}));
