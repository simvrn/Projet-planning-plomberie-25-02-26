import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Intervention, Technician, TaskKeyword, EquipmentKeyword, CalendarView, PanelState, AppTab } from '../types';
import { getAutoColor, isValidPaletteColor, TECHNICIAN_COLORS } from '../utils/colors';

// Default task keywords for better first-use experience
const DEFAULT_TASK_KEYWORDS: TaskKeyword[] = [
  { id: 'default-1', text: 'Installation chauffe-eau', shortcut: 'ICE', usageCount: 0, isDefault: true },
  { id: 'default-2', text: 'Réparation fuite', shortcut: 'RF', usageCount: 0, isDefault: true },
  { id: 'default-3', text: 'Entretien chaudière', shortcut: 'EC', usageCount: 0, isDefault: true },
  { id: 'default-4', text: 'Débouchage canalisation', shortcut: 'DC', usageCount: 0, isDefault: true },
  { id: 'default-5', text: 'Installation radiateur', shortcut: 'IR', usageCount: 0, isDefault: true },
  { id: 'default-6', text: 'Remplacement robinetterie', shortcut: 'RR', usageCount: 0, isDefault: true },
  { id: 'default-7', text: 'Diagnostic panne', shortcut: 'DP', usageCount: 0, isDefault: true },
  { id: 'default-8', text: 'Mise en service', shortcut: 'MES', usageCount: 0, isDefault: true },
];

// Default equipment keywords
const DEFAULT_EQUIPMENT_KEYWORDS: EquipmentKeyword[] = [
  { id: 'equip-1', text: 'Chauffe-eau', shortcut: 'CE', usageCount: 0, isDefault: true },
  { id: 'equip-2', text: 'Radiateur', shortcut: 'RAD', usageCount: 0, isDefault: true },
  { id: 'equip-3', text: 'Robinet', shortcut: 'ROB', usageCount: 0, isDefault: true },
  { id: 'equip-4', text: 'Tuyauterie', shortcut: 'TUY', usageCount: 0, isDefault: true },
  { id: 'equip-5', text: 'Joints', shortcut: 'JT', usageCount: 0, isDefault: true },
  { id: 'equip-6', text: 'Pompe', shortcut: 'PMP', usageCount: 0, isDefault: true },
  { id: 'equip-7', text: 'Outillage standard', shortcut: 'OUT', usageCount: 0, isDefault: true },
  { id: 'equip-8', text: 'Déboucheur', shortcut: 'DEB', usageCount: 0, isDefault: true },
];

const defaultTaskKeywordsMap = DEFAULT_TASK_KEYWORDS.reduce((acc, kw) => {
  acc[kw.id] = kw;
  return acc;
}, {} as Record<string, TaskKeyword>);

const defaultEquipmentKeywordsMap = DEFAULT_EQUIPMENT_KEYWORDS.reduce((acc, kw) => {
  acc[kw.id] = kw;
  return acc;
}, {} as Record<string, EquipmentKeyword>);

interface DayRecapState {
  isOpen: boolean;
  date: string | null;
}

interface StoreState {
  // Data
  interventions: Record<string, Intervention>;
  technicians: Record<string, Technician>;
  taskKeywords: Record<string, TaskKeyword>;
  equipmentKeywords: Record<string, EquipmentKeyword>;

  // UI State
  currentTab: AppTab;
  currentView: CalendarView;
  currentDate: Date;
  panel: PanelState;
  dayRecap: DayRecapState;
  selectedTechnicianFilters: string[];

  // Actions - Tab
  setTab: (tab: AppTab) => void;

  // Actions - View
  setView: (view: CalendarView) => void;
  setCurrentDate: (date: Date) => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  goToToday: () => void;

  // Actions - Panel
  openCreatePanel: (date: string, time?: string) => void;
  openEditPanel: (intervention: Intervention) => void;
  closePanel: () => void;

  // Actions - Day Recap
  openDayRecap: (date: string) => void;
  closeDayRecap: () => void;

  // Actions - Technician Filters
  setTechnicianFilters: (ids: string[]) => void;
  toggleTechnicianFilter: (id: string) => void;
  clearTechnicianFilters: () => void;

  // Actions - Interventions
  createIntervention: (data: Omit<Intervention, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateIntervention: (id: string, data: Partial<Intervention>) => void;
  deleteIntervention: (id: string) => void;
  getInterventionsByDate: (date: string) => Intervention[];
  getFilteredInterventionsByDate: (date: string) => Intervention[];

  // Actions - Technicians
  addTechnician: (name: string, color: string) => Technician;
  updateTechnician: (id: string, data: Partial<Pick<Technician, 'name' | 'color'>>) => void;
  deactivateTechnician: (id: string) => void;
  reactivateTechnician: (id: string) => void;
  getOrCreateTechnician: (name: string) => Technician;
  getTechnicianById: (id: string) => Technician | undefined;
  getActiveTechnicians: () => Technician[];
  getTopTechnicians: (limit?: number) => Technician[];
  searchTechnicians: (query: string) => Technician[];
  incrementTechnicianUsage: (id: string) => void;
  getNextAutoColor: () => string;

  // Actions - Task Keywords
  addTaskKeyword: (text: string, shortcut?: string) => TaskKeyword;
  updateTaskKeyword: (id: string, data: Partial<Pick<TaskKeyword, 'text' | 'shortcut'>>) => void;
  deleteTaskKeyword: (id: string) => void;
  getOrCreateTaskKeyword: (text: string, shortcut?: string) => TaskKeyword;
  getAllTaskKeywords: () => TaskKeyword[];
  getTopTaskKeywords: (limit?: number) => TaskKeyword[];
  searchTaskKeywords: (query: string) => TaskKeyword[];
  incrementTaskKeywordUsage: (id: string) => void;

  // Actions - Equipment Keywords
  addEquipmentKeyword: (text: string, shortcut?: string) => EquipmentKeyword;
  updateEquipmentKeyword: (id: string, data: Partial<Pick<EquipmentKeyword, 'text' | 'shortcut'>>) => void;
  deleteEquipmentKeyword: (id: string) => void;
  getOrCreateEquipmentKeyword: (text: string, shortcut?: string) => EquipmentKeyword;
  getAllEquipmentKeywords: () => EquipmentKeyword[];
  getTopEquipmentKeywords: (limit?: number) => EquipmentKeyword[];
  searchEquipmentKeywords: (query: string) => EquipmentKeyword[];
  incrementEquipmentKeywordUsage: (id: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      interventions: {},
      technicians: {},
      taskKeywords: defaultTaskKeywordsMap,
      equipmentKeywords: defaultEquipmentKeywordsMap,
      currentTab: 'calendar',
      currentView: 'week',
      currentDate: new Date(),
      panel: {
        isOpen: false,
        mode: 'create',
        selectedDate: null,
        selectedTime: null,
        editingIntervention: null,
      },
      dayRecap: {
        isOpen: false,
        date: null,
      },
      selectedTechnicianFilters: [],

      // Tab actions
      setTab: (tab) => set({ currentTab: tab }),

      // View actions
      setView: (view) => set({ currentView: view }),

      setCurrentDate: (date) => set({ currentDate: date }),

      navigatePrev: () => set((state) => {
        const newDate = new Date(state.currentDate);
        if (state.currentView === 'week') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setMonth(newDate.getMonth() - 1);
        }
        return { currentDate: newDate };
      }),

      navigateNext: () => set((state) => {
        const newDate = new Date(state.currentDate);
        if (state.currentView === 'week') {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
        return { currentDate: newDate };
      }),

      goToToday: () => set({ currentDate: new Date() }),

      // Panel actions
      openCreatePanel: (date, time) => set({
        panel: {
          isOpen: true,
          mode: 'create',
          selectedDate: date,
          selectedTime: time || '08:00',
          editingIntervention: null,
        }
      }),

      openEditPanel: (intervention) => set({
        panel: {
          isOpen: true,
          mode: 'edit',
          selectedDate: intervention.date,
          selectedTime: intervention.startTime,
          editingIntervention: intervention,
        }
      }),

      closePanel: () => set({
        panel: {
          isOpen: false,
          mode: 'create',
          selectedDate: null,
          selectedTime: null,
          editingIntervention: null,
        }
      }),

      // Day Recap actions
      openDayRecap: (date) => set({
        dayRecap: {
          isOpen: true,
          date,
        }
      }),

      closeDayRecap: () => set({
        dayRecap: {
          isOpen: false,
          date: null,
        }
      }),

      // Technician filter actions
      setTechnicianFilters: (ids) => set({ selectedTechnicianFilters: ids }),

      toggleTechnicianFilter: (id) => set((state) => {
        const current = state.selectedTechnicianFilters;
        if (current.includes(id)) {
          return { selectedTechnicianFilters: current.filter((tid) => tid !== id) };
        }
        return { selectedTechnicianFilters: [...current, id] };
      }),

      clearTechnicianFilters: () => set({ selectedTechnicianFilters: [] }),

      // Intervention actions
      createIntervention: (data) => {
        // Validate max 4 technicians
        if (data.technicianIds.length > 4) {
          console.error('Maximum 4 techniciens par intervention');
          return;
        }

        const id = uuidv4();
        const now = Date.now();
        const intervention: Intervention = {
          ...data,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          interventions: {
            ...state.interventions,
            [id]: intervention,
          }
        }));

        // Increment usage counts
        data.technicianIds.forEach((techId) => {
          get().incrementTechnicianUsage(techId);
        });

        if (data.taskText) {
          const keyword = get().getOrCreateTaskKeyword(data.taskText);
          get().incrementTaskKeywordUsage(keyword.id);
        }

        if (data.equipment) {
          const equipKeyword = get().getOrCreateEquipmentKeyword(data.equipment);
          get().incrementEquipmentKeywordUsage(equipKeyword.id);
        }
      },

      updateIntervention: (id, data) => {
        // Validate max 4 technicians
        if (data.technicianIds && data.technicianIds.length > 4) {
          console.error('Maximum 4 techniciens par intervention');
          return;
        }

        set((state) => {
          const existing = state.interventions[id];
          if (!existing) return state;

          return {
            interventions: {
              ...state.interventions,
              [id]: {
                ...existing,
                ...data,
                updatedAt: Date.now(),
              }
            }
          };
        });
      },

      deleteIntervention: (id) => set((state) => {
        const { [id]: _, ...rest } = state.interventions;
        return { interventions: rest };
      }),

      getInterventionsByDate: (date) => {
        const state = get();
        return Object.values(state.interventions)
          .filter((i) => i.date === date)
          .sort((a, b) => {
            const startCompare = a.startTime.localeCompare(b.startTime);
            if (startCompare !== 0) return startCompare;
            const endCompare = a.endTime.localeCompare(b.endTime);
            if (endCompare !== 0) return endCompare;
            return (a.taskText || '').localeCompare(b.taskText || '');
          });
      },

      getFilteredInterventionsByDate: (date) => {
        const state = get();
        const filters = state.selectedTechnicianFilters;
        const interventions = state.getInterventionsByDate(date);

        if (filters.length === 0) return interventions;

        return interventions.filter((intervention) =>
          intervention.technicianIds.some((techId) => filters.includes(techId))
        );
      },

      // Technician actions
      getNextAutoColor: () => {
        const state = get();
        const existingColors = Object.values(state.technicians).map((t) => t.color);
        const usedColorCounts = TECHNICIAN_COLORS.map((c) => ({
          color: c.hex,
          count: existingColors.filter((ec) => ec === c.hex).length,
        }));
        usedColorCounts.sort((a, b) => a.count - b.count);
        return usedColorCounts[0]?.color || getAutoColor(0);
      },

      addTechnician: (name, color) => {
        const state = get();
        const normalized = name.trim().toLowerCase();

        const existing = Object.values(state.technicians).find(
          (t) => t.name.toLowerCase() === normalized
        );
        if (existing) return existing;

        if (!isValidPaletteColor(color)) {
          color = state.getNextAutoColor();
        }

        const id = uuidv4();
        const now = Date.now();
        const technician: Technician = {
          id,
          name: name.trim(),
          color,
          isActive: true,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({
          technicians: {
            ...s.technicians,
            [id]: technician,
          }
        }));

        return technician;
      },

      updateTechnician: (id, data) => set((state) => {
        const tech = state.technicians[id];
        if (!tech) return state;

        if (data.color && !isValidPaletteColor(data.color)) {
          return state;
        }

        return {
          technicians: {
            ...state.technicians,
            [id]: {
              ...tech,
              ...data,
              updatedAt: Date.now(),
            }
          }
        };
      }),

      deactivateTechnician: (id) => set((state) => {
        const tech = state.technicians[id];
        if (!tech) return state;

        return {
          technicians: {
            ...state.technicians,
            [id]: {
              ...tech,
              isActive: false,
              updatedAt: Date.now(),
            }
          },
          selectedTechnicianFilters: state.selectedTechnicianFilters.filter((tid) => tid !== id),
        };
      }),

      reactivateTechnician: (id) => set((state) => {
        const tech = state.technicians[id];
        if (!tech) return state;

        return {
          technicians: {
            ...state.technicians,
            [id]: {
              ...tech,
              isActive: true,
              updatedAt: Date.now(),
            }
          }
        };
      }),

      getOrCreateTechnician: (name) => {
        const state = get();
        const normalized = name.trim().toLowerCase();

        const existing = Object.values(state.technicians).find(
          (t) => t.name.toLowerCase() === normalized
        );
        if (existing) return existing;

        const color = state.getNextAutoColor();
        return state.addTechnician(name, color);
      },

      getTechnicianById: (id) => get().technicians[id],

      getActiveTechnicians: () => {
        return Object.values(get().technicians)
          .filter((t) => t.isActive)
          .sort((a, b) => b.usageCount - a.usageCount);
      },

      getTopTechnicians: (limit = 5) => {
        return Object.values(get().technicians)
          .filter((t) => t.isActive)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      },

      searchTechnicians: (query) => {
        const normalized = query.toLowerCase().trim();
        if (!normalized) return get().getTopTechnicians();

        return Object.values(get().technicians)
          .filter((t) => t.isActive && t.name.toLowerCase().includes(normalized))
          .sort((a, b) => b.usageCount - a.usageCount);
      },

      incrementTechnicianUsage: (id) => set((state) => {
        const tech = state.technicians[id];
        if (!tech) return state;

        return {
          technicians: {
            ...state.technicians,
            [id]: {
              ...tech,
              usageCount: tech.usageCount + 1,
            }
          }
        };
      }),

      // Task keyword actions
      addTaskKeyword: (text, shortcut) => {
        const state = get();
        const normalized = text.trim().toLowerCase();

        const existing = Object.values(state.taskKeywords).find(
          (t) => t.text.toLowerCase() === normalized
        );
        if (existing) return existing;

        const id = uuidv4();
        const keyword: TaskKeyword = {
          id,
          text: text.trim(),
          shortcut: shortcut?.trim().toUpperCase(),
          usageCount: 0,
          isDefault: false,
        };

        set((s) => ({
          taskKeywords: {
            ...s.taskKeywords,
            [id]: keyword,
          }
        }));

        return keyword;
      },

      updateTaskKeyword: (id, data) => set((state) => {
        const keyword = state.taskKeywords[id];
        if (!keyword) return state;

        return {
          taskKeywords: {
            ...state.taskKeywords,
            [id]: {
              ...keyword,
              ...data,
              shortcut: data.shortcut?.trim().toUpperCase() || keyword.shortcut,
            }
          }
        };
      }),

      deleteTaskKeyword: (id) => set((state) => {
        const { [id]: _, ...rest } = state.taskKeywords;
        return { taskKeywords: rest };
      }),

      getOrCreateTaskKeyword: (text, shortcut) => {
        const state = get();
        const normalized = text.trim().toLowerCase();

        const existing = Object.values(state.taskKeywords).find(
          (t) => t.text.toLowerCase() === normalized
        );
        if (existing) return existing;

        return state.addTaskKeyword(text, shortcut);
      },

      getAllTaskKeywords: () => {
        return Object.values(get().taskKeywords)
          .sort((a, b) => b.usageCount - a.usageCount);
      },

      getTopTaskKeywords: (limit = 10) => {
        return Object.values(get().taskKeywords)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      },

      searchTaskKeywords: (query) => {
        const normalized = query.toLowerCase().trim();
        if (!normalized) return get().getTopTaskKeywords();

        return Object.values(get().taskKeywords)
          .filter((t) =>
            t.text.toLowerCase().includes(normalized) ||
            (t.shortcut && t.shortcut.toLowerCase().startsWith(normalized))
          )
          .sort((a, b) => {
            const aShortcut = a.shortcut?.toLowerCase().startsWith(normalized) ? 1 : 0;
            const bShortcut = b.shortcut?.toLowerCase().startsWith(normalized) ? 1 : 0;
            if (aShortcut !== bShortcut) return bShortcut - aShortcut;
            return b.usageCount - a.usageCount;
          });
      },

      incrementTaskKeywordUsage: (id) => set((state) => {
        const keyword = state.taskKeywords[id];
        if (!keyword) return state;

        return {
          taskKeywords: {
            ...state.taskKeywords,
            [id]: {
              ...keyword,
              usageCount: keyword.usageCount + 1,
            }
          }
        };
      }),

      // Equipment keyword actions
      addEquipmentKeyword: (text, shortcut) => {
        const state = get();
        const normalized = text.trim().toLowerCase();

        const existing = Object.values(state.equipmentKeywords).find(
          (t) => t.text.toLowerCase() === normalized
        );
        if (existing) return existing;

        const id = uuidv4();
        const keyword: EquipmentKeyword = {
          id,
          text: text.trim(),
          shortcut: shortcut?.trim().toUpperCase(),
          usageCount: 0,
          isDefault: false,
        };

        set((s) => ({
          equipmentKeywords: {
            ...s.equipmentKeywords,
            [id]: keyword,
          }
        }));

        return keyword;
      },

      updateEquipmentKeyword: (id, data) => set((state) => {
        const keyword = state.equipmentKeywords[id];
        if (!keyword) return state;

        return {
          equipmentKeywords: {
            ...state.equipmentKeywords,
            [id]: {
              ...keyword,
              ...data,
              shortcut: data.shortcut?.trim().toUpperCase() || keyword.shortcut,
            }
          }
        };
      }),

      deleteEquipmentKeyword: (id) => set((state) => {
        const { [id]: _, ...rest } = state.equipmentKeywords;
        return { equipmentKeywords: rest };
      }),

      getOrCreateEquipmentKeyword: (text, shortcut) => {
        const state = get();
        const normalized = text.trim().toLowerCase();

        const existing = Object.values(state.equipmentKeywords).find(
          (t) => t.text.toLowerCase() === normalized
        );
        if (existing) return existing;

        return state.addEquipmentKeyword(text, shortcut);
      },

      getAllEquipmentKeywords: () => {
        return Object.values(get().equipmentKeywords)
          .sort((a, b) => b.usageCount - a.usageCount);
      },

      getTopEquipmentKeywords: (limit = 10) => {
        return Object.values(get().equipmentKeywords)
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      },

      searchEquipmentKeywords: (query) => {
        const normalized = query.toLowerCase().trim();
        if (!normalized) return get().getTopEquipmentKeywords();

        return Object.values(get().equipmentKeywords)
          .filter((t) =>
            t.text.toLowerCase().includes(normalized) ||
            (t.shortcut && t.shortcut.toLowerCase().startsWith(normalized))
          )
          .sort((a, b) => {
            const aShortcut = a.shortcut?.toLowerCase().startsWith(normalized) ? 1 : 0;
            const bShortcut = b.shortcut?.toLowerCase().startsWith(normalized) ? 1 : 0;
            if (aShortcut !== bShortcut) return bShortcut - aShortcut;
            return b.usageCount - a.usageCount;
          });
      },

      incrementEquipmentKeywordUsage: (id) => set((state) => {
        const keyword = state.equipmentKeywords[id];
        if (!keyword) return state;

        return {
          equipmentKeywords: {
            ...state.equipmentKeywords,
            [id]: {
              ...keyword,
              usageCount: keyword.usageCount + 1,
            }
          }
        };
      }),
    }),
    {
      name: 'edetel-planning',
      partialize: (state) => ({
        interventions: state.interventions,
        technicians: state.technicians,
        taskKeywords: state.taskKeywords,
        equipmentKeywords: state.equipmentKeywords,
        selectedTechnicianFilters: state.selectedTechnicianFilters,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<StoreState>;

        // Migrate existing technicians
        let technicians = persistedState.technicians || {};
        let index = 0;
        for (const id in technicians) {
          const tech = technicians[id];
          if (!tech.color || !isValidPaletteColor(tech.color)) {
            tech.color = getAutoColor(index);
          }
          if (tech.isActive === undefined) {
            tech.isActive = true;
          }
          if (tech.createdAt === undefined) {
            tech.createdAt = Date.now();
          }
          if (tech.updatedAt === undefined) {
            tech.updatedAt = Date.now();
          }
          index++;
        }

        return {
          ...current,
          ...persistedState,
          technicians,
          // Merge default keywords with persisted ones
          taskKeywords: {
            ...defaultTaskKeywordsMap,
            ...(persistedState.taskKeywords || {}),
          },
          equipmentKeywords: {
            ...defaultEquipmentKeywordsMap,
            ...(persistedState.equipmentKeywords || {}),
          },
        };
      },
    }
  )
);
