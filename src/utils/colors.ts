// Palette de 10 couleurs distinctes pour les techniciens
export const TECHNICIAN_COLORS = [
  { hex: '#E53935', name: 'Rouge' },
  { hex: '#D81B60', name: 'Rose' },
  { hex: '#8E24AA', name: 'Violet' },
  { hex: '#3949AB', name: 'Indigo' },
  { hex: '#1E88E5', name: 'Bleu' },
  { hex: '#00897B', name: 'Teal' },
  { hex: '#43A047', name: 'Vert' },
  { hex: '#FDD835', name: 'Jaune' },
  { hex: '#FB8C00', name: 'Orange' },
  { hex: '#6D4C41', name: 'Marron' },
] as const;

export type TechnicianColor = typeof TECHNICIAN_COLORS[number]['hex'];

// Calculer la luminance relative d'une couleur
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Convertir hex en RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Déterminer si le texte doit être noir ou blanc pour une lisibilité optimale
export function getContrastTextColor(bgColor: string): 'white' | 'black' {
  const luminance = getLuminance(bgColor);
  return luminance > 0.4 ? 'black' : 'white';
}

// Obtenir une couleur automatique basée sur l'index
export function getAutoColor(index: number): string {
  return TECHNICIAN_COLORS[index % TECHNICIAN_COLORS.length].hex;
}

// Vérifier si une couleur est dans la palette
export function isValidPaletteColor(color: string): boolean {
  return TECHNICIAN_COLORS.some((c) => c.hex === color);
}

// Générer une version plus claire d'une couleur (pour les backgrounds)
export function getLighterColor(hex: string, factor: number = 0.85): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const lighter = {
    r: Math.round(rgb.r + (255 - rgb.r) * factor),
    g: Math.round(rgb.g + (255 - rgb.g) * factor),
    b: Math.round(rgb.b + (255 - rgb.b) * factor),
  };

  return `#${lighter.r.toString(16).padStart(2, '0')}${lighter.g.toString(16).padStart(2, '0')}${lighter.b.toString(16).padStart(2, '0')}`;
}
