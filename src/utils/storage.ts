const STORAGE_KEY = 'edetel-planning-data';

export interface StorageData {
  interventions: Record<string, unknown>;
  technicians: Record<string, unknown>;
  taskKeywords: Record<string, unknown>;
}

export function loadFromStorage(): StorageData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return null;
}

export function saveToStorage(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}
