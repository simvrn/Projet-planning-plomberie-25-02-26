export interface Intervention {
  id: string;
  date: string; // "2025-01-31"
  startTime: string; // "08:00"
  endTime: string; // "10:30"
  technicianIds: string[]; // max 4
  taskText: string;
  equipment?: string; // Matériel à prendre
  notes?: string; // Description / notes optionnelles
  address?: string;
  tenantName?: string;
  phone?: string;
  pdfUrl?: string; // URL publique Supabase Storage
  pdfName?: string; // Nom du fichier PDF d'origine
  createdAt: number;
  updatedAt: number;
}

export interface Technician {
  id: string;
  name: string;
  color: string; // hex color from palette
  isActive: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

export type AppTab = 'settings' | 'calendar';

export interface TaskKeyword {
  id: string;
  text: string;
  shortcut?: string; // "ICE" → "Installation chauffe-eau"
  usageCount: number;
  isDefault?: boolean; // Pour identifier les keywords par défaut
}

export interface EquipmentKeyword {
  id: string;
  text: string;
  shortcut?: string; // "CE" → "Chauffe-eau"
  usageCount: number;
  isDefault?: boolean;
}

export type CalendarView = 'month' | 'week' | 'techweek';

export interface PanelState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  selectedDate: string | null;
  selectedTime: string | null;
  editingIntervention: Intervention | null;
  prefilledTechnicianIds?: string[];
  duplicatingFrom?: Intervention;
}
