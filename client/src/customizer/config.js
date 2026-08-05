// ─────────────────────────────────────────────────────────────────────────────
// Configurator-config — VERVANGBARE ASSETS
// Elke variant verwijst via `asset` naar een SVG in /public/assets/customizer/.
// Wil je de preview-tekening vervangen? Zet een nieuw bestand op datzelfde pad
// (of pas alleen `asset` aan). De logica hieronder verandert niet.
//
// Later foto-based? Zet `renderType` op 'canvas-mask' — de renderer-abstractie
// (renderPreview.jsx) schakelt dan om zonder dat velden/validatie/cart wijzigen.
// ─────────────────────────────────────────────────────────────────────────────
export const CUSTOMIZER_CONFIG = {
  'gloves-velcro': {
    renderType: 'svg',
    asset: '/assets/customizer/mhgym-glove-velcro-template.svg',
    fields: ['gloveTop', 'palm', 'outerThumb', 'innerThumb', 'wrist', 'trim', 'logo'],
  },
  'gloves-laceup': {
    renderType: 'svg',
    asset: '/assets/customizer/mhgym-glove-laceup-template.svg',
    fields: ['gloveTop', 'palm', 'outerThumb', 'innerThumb', 'laces', 'trim', 'logo'],
  },
  'shinguards': {
    renderType: 'svg',
    asset: '/assets/customizer/mhgym-shinguard-template.svg',
    fields: ['shinPad', 'footGuard', 'strap', 'trim', 'logo'],
  },
}

// Leesbare labels per kleurveld (wat de klant in de UI ziet).
export const FIELD_LABELS = {
  gloveTop: 'Glove Top', palm: 'Palm', outerThumb: 'Outer Thumb', innerThumb: 'Inner Thumb',
  wrist: 'Wrist / Strap', laces: 'Laces', trim: 'Trim', logo: 'Logo',
  shinPad: 'Shin Pad', footGuard: 'Foot Guard', strap: 'Strap',
}

// De twee producten in de configurator. `productKey` = de slug van het geseede
// product in de database (custom-gloves / custom-shinguards).
export const CUSTOM_PRODUCTS = {
  gloves: {
    label: 'Custom Gloves',
    productKey: 'custom-gloves',
    hasStyle: true,
    styles: [
      { key: 'gloves-velcro', label: 'Velcro' },
      { key: 'gloves-laceup', label: 'Lace-Up' },
    ],
    sizes: ['8oz', '10oz', '12oz', '14oz', '16oz'],
  },
  shinguards: {
    label: 'Custom Shin Guards',
    productKey: 'custom-shinguards',
    hasStyle: false,
    configKey: 'shinguards',
    sizes: ['S', 'M', 'L', 'XL'],
  },
}

// Prijsopslagen (de basisprijs staat op het geseede product; de server rekent
// de definitieve prijs uit — dit is voor de weergave in de UI).
export const PRICING = {
  nameEmbroiderySurcharge: 10, // Embroidered naam = +€10
}

// Verplichte disclaimer bij "Confirm Design".
export const CONFIRM_DISCLAIMER =
  'Ik begrijp dat mijn custom gear ongeveer 4-6 weken duurt om te maken en te ' +
  'verzenden. Zodra mijn ontwerp is ingediend kan het niet meer worden gewijzigd, ' +
  'terugbetaald of geretourneerd, tenzij er een fout is gemaakt van onze kant. ' +
  'Een track & trace wordt verstuurd zodra je bestelling klaar is.'
