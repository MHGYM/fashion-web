// Gedeelde types voor alle 3D-configurators (jersey, en later shorts/rashguards/hoodies).

export interface Transform {
  x: number;        // -0.5..0.5, relatief aan canvasbreedte, 0 = midden
  y: number;         // -0.5..0.5, relatief aan canvashoogte, 0 = midden
  scale: number;      // 1 = standaardgrootte
  rotation: number;   // graden
}

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

export interface LogoLayer {
  id: string;
  img: HTMLImageElement;
  fileName: string;
  originalDataUrl: string;   // lokale data-URL — direct bruikbaar voor de live preview
  originalUrl?: string;      // server-URL van het bewaarde originele bestand (productie), gezet zodra de achtergrond-upload klaar is
  transform: Transform;
}

export interface TextLayer {
  id: string;
  text: string;
  color: string;
  fontFamily: string;
  fontWeight: number;
  transform: Transform;
}

export interface ZoneState {
  colorHex: string;
  logos: LogoLayer[];
  texts: TextLayer[];
}

export function createEmptyZoneState(colorHex = '#101114'): ZoneState {
  return { colorHex, logos: [], texts: [] };
}
