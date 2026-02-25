// Generate time slots from 07:00 to 18:00 in 30-minute increments
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 7; hour <= 18; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 18) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
}

export const TIME_SLOTS = generateTimeSlots();

// Parse time string to minutes since midnight
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to time string
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Round time to nearest 30 minutes
export function roundToHalfHour(time: string): string {
  const minutes = timeToMinutes(time);
  const rounded = Math.round(minutes / 30) * 30;
  // Clamp between 07:00 and 18:00
  const clamped = Math.min(Math.max(rounded, 7 * 60), 18 * 60);
  return minutesToTime(clamped);
}

// Validate time range
export function isValidTimeRange(start: string, end: string): boolean {
  return timeToMinutes(end) > timeToMinutes(start);
}

// Format time for display
export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

// Get slot index for positioning
export function getSlotIndex(time: string): number {
  const minutes = timeToMinutes(time);
  const startMinutes = 7 * 60; // 07:00
  return (minutes - startMinutes) / 30;
}

// Calculate event height in slots
export function getEventHeight(start: string, end: string): number {
  return getSlotIndex(end) - getSlotIndex(start);
}
