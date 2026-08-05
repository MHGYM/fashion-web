import { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Renderer-abstractie voor de live-preview.
//
// `renderPreview(config, selections)` (hier de <CustomizerPreview>-component)
// kijkt naar config.renderType en kiest de juiste renderer. Nu bestaat alleen
// de SVG-renderer; wil je later foto-realistische previews met een masker, dan
// voeg je een 'canvas-mask'-tak toe ZONDER dat de velden, validatie of cart
// hoeven te veranderen — die kennen alleen `selections` (veld → hex-kleur).
// ─────────────────────────────────────────────────────────────────────────────

// camelCase-veldnaam → kebab CSS-variabele.  gloveTop → --glove-top
const toCssVar = field => '--' + field.replace(/[A-Z]/g, m => '-' + m.toLowerCase())

// { gloveTop: '#D32F2F', palm: '#1A1A1A' }  →  { '--glove-top': '#D32F2F', … }
function toStyleVars(selections) {
  const style = {}
  for (const [field, hex] of Object.entries(selections || {})) {
    if (hex) style[toCssVar(field)] = hex
  }
  return style
}

/**
 * SVG-renderer: haalt de template op en zet 'm inline in de DOM. Omdat CSS
 * custom properties door de DOM erven, kleuren we simpelweg de wrapper-div in;
 * de `fill: var(--glove-top)`-regels in de SVG pikken die vanzelf op — één set
 * variabelen kleurt zo zowel de voor- als achterkant (die dezelfde class delen).
 */
function SvgPreview({ asset, selections }) {
  const [svg, setSvg] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setSvg(''); setFailed(false)
    fetch(asset)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.text() })
      .then(text => { if (alive) setSvg(text) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [asset])

  if (failed) return <div className="cz-preview-msg">Preview-afbeelding niet gevonden.</div>
  if (!svg)   return <div className="cz-preview-msg">Preview laden…</div>

  return (
    <div
      className="cz-preview-svg"
      style={toStyleVars(selections)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

export default function CustomizerPreview({ config, selections }) {
  if (!config) return null
  switch (config.renderType) {
    case 'svg':
      return <SvgPreview asset={config.asset} selections={selections} />
    // case 'canvas-mask': return <CanvasMaskPreview ... />   // later
    default:
      return <div className="cz-preview-msg">Onbekend preview-type.</div>
  }
}
