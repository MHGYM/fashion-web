export type ZoneId = 'front' | 'back' | 'sleeveLeft' | 'sleeveRight'

export const ZONE_IDS: ZoneId[] = ['front', 'back', 'sleeveLeft', 'sleeveRight']

export const ZONE_LABELS: Record<ZoneId, string> = {
  front: 'Voorkant',
  back: 'Achterkant',
  sleeveLeft: 'Mouw links',
  sleeveRight: 'Mouw rechts',
}

// Zones met een eigen logo/tekst-editor (mouwen zijn kleur-only, zoals gevraagd).
export const DESIGNABLE_ZONE_IDS: ZoneId[] = ['front', 'back']

export const DEFAULT_ZONE_COLOR = '#101114'

export const COLOR_PRESETS = [
  { name: 'Zwart', hex: '#101114' },
  { name: 'Wit', hex: '#f5f5f5' },
  { name: 'Grijs', hex: '#6b7280' },
  { name: 'Rood', hex: '#c81e2c' },
  { name: 'Oranje', hex: '#e8622c' },
  { name: 'Goud', hex: '#c8a35a' },
  { name: 'Geel', hex: '#e6c229' },
  { name: 'Groen', hex: '#1f7a3f' },
  { name: 'Blauw', hex: '#1d4ed8' },
  { name: 'Navy', hex: '#141a35' },
  { name: 'Paars', hex: '#5b21b6' },
  { name: 'Roze', hex: '#db2777' },
]

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const
export type JerseySize = (typeof SIZES)[number]

// Prijsstructuur — bedragen bewust nog op 0: de klant vult dit later zelf in.
// Berekening staat al klaar zodat het activeren straks alleen deze constanten
// invullen is (zelfde constanten worden server-side hergebruikt, zie
// src/controllers/customizerController.js — nooit los van elkaar aanpassen).
export const JERSEY_PRICING = {
  base: 0,
  perLogo: 0,
  perTextLayer: 0,
}

export function calculateJerseyPrice(config: { logoCount: number; textCount: number }): number {
  const { logoCount, textCount } = config
  return (
    JERSEY_PRICING.base +
    logoCount * JERSEY_PRICING.perLogo +
    textCount * JERSEY_PRICING.perTextLayer
  )
}
