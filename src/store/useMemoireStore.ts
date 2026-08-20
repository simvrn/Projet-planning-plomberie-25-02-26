import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CorpsDeMetier,
  GenerationStatus,
  Interlocuteur,
  ProjectDocFile,
  Thematique,
} from '../types/memoire';

// Store dédié à la fonctionnalité "Mémoire technique", entièrement séparé du store du planning
// (pas de persist partagé : aucun risque sur les données du planning déjà sauvegardées).

export type MemoireStep = 'start' | 'premoire' | 'upload' | 'result';
export type MemoireView = 'wizard' | 'admin';
export type AnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error';

interface MemoireStoreState {
  view: MemoireView;
  step: MemoireStep;
  interlocuteur: Interlocuteur | null;
  corpsDeMetier: CorpsDeMetier | null;
  thematiques: string[];
  nombrePersonnes: number | null;
  projectDocs: ProjectDocFile[];

  preMemoireFileName: string | null;
  preMemoireText: string | null;
  analysisStatus: AnalysisStatus;
  analysisError: string | null;

  generationStatus: GenerationStatus;
  downloadUrl: string | null;
  generationError: string | null;

  adminUnlocked: boolean;
  adminPassword: string | null;

  setView: (view: MemoireView) => void;
  setStep: (step: MemoireStep) => void;
  setInterlocuteur: (value: Interlocuteur) => void;
  setCorpsDeMetier: (value: CorpsDeMetier) => void;
  toggleThematique: (value: Thematique) => void;
  addCustomThematique: (text: string) => void;
  removeCustomThematique: (text: string) => void;
  setNombrePersonnes: (value: number) => void;

  setPreMemoire: (fileName: string, text: string) => void;
  startAnalysis: () => void;
  setAnalysisSuggestions: (thematiques: string[]) => void;
  setAnalysisError: (message: string) => void;

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
  thematiques: [],
  nombrePersonnes: null,
  projectDocs: [],

  preMemoireFileName: null,
  preMemoireText: null,
  analysisStatus: 'idle',
  analysisError: null,

  generationStatus: 'idle',
  downloadUrl: null,
  generationError: null,

  adminUnlocked: false,
  adminPassword: null,

  setView: (view) => set({ view }),
  setStep: (step) => set({ step }),
  setInterlocuteur: (value) => set({ interlocuteur: value }),
  setCorpsDeMetier: (value) => set({ corpsDeMetier: value }),
  toggleThematique: (value) => {
    const current = get().thematiques;
    set({
      thematiques: current.includes(value)
        ? current.filter((t) => t !== value)
        : [...current, value],
    });
  },
  addCustomThematique: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const current = get().thematiques;
    if (current.includes(trimmed)) return;
    set({ thematiques: [...current, trimmed] });
  },
  removeCustomThematique: (text) => {
    set({ thematiques: get().thematiques.filter((t) => t !== text) });
  },
  setNombrePersonnes: (value) => set({ nombrePersonnes: value }),

  setPreMemoire: (fileName, text) =>
    set({ preMemoireFileName: fileName, preMemoireText: text, analysisStatus: 'idle', analysisError: null }),
  startAnalysis: () => set({ analysisStatus: 'analyzing', analysisError: null }),
  setAnalysisSuggestions: (thematiques) => set({ analysisStatus: 'done', thematiques }),
  setAnalysisError: (message) => set({ analysisStatus: 'error', analysisError: message }),

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
      thematiques: [],
      nombrePersonnes: null,
      projectDocs: [],
      preMemoireFileName: null,
      preMemoireText: null,
      analysisStatus: 'idle',
      analysisError: null,
      generationStatus: 'idle',
      downloadUrl: null,
      generationError: null,
    }),
}));
