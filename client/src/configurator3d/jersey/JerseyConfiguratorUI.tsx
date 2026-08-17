import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import ColorPicker from '../shared/ColorPicker'
import UploadBox from '../shared/UploadBox'
import LayerControls from '../shared/LayerControls'
import { loadUploadedImage, nextId } from '../shared/fileUtils'
import { DEFAULT_TRANSFORM, createEmptyZoneState } from '../shared/types'
import type { ZoneState, LogoLayer, TextLayer } from '../shared/types'
import JerseyScene from './JerseyScene'
import {
  ZONE_IDS, ZONE_LABELS, DEFAULT_ZONE_COLOR, COLOR_PRESETS, SIZES,
  calculateJerseyPrice, type ZoneId, type JerseySize,
} from './zones'

type Tab = 'voorkant' | 'achterkant' | 'kleur' | 'logo' | 'tekst'

const TABS: { id: Tab; label: string }[] = [
  { id: 'voorkant', label: 'VOORKANT' },
  { id: 'achterkant', label: 'ACHTERKANT' },
  { id: 'kleur', label: 'KLEUR' },
  { id: 'logo', label: 'LOGO' },
  { id: 'tekst', label: 'TEKST' },
]

const TEXT_COLORS = ['#ffffff', '#000000', '#e5b93c', '#c81e2c', '#1d4ed8', '#1f7a3f']
const FONT_OPTIONS = [
  { label: 'Inter (modern)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Impact (sport)', value: 'Impact, Haettenschweiler, sans-serif' },
  { label: 'Georgia (klassiek)', value: 'Georgia, serif' },
]

function makeDesignId() {
  return `FM-JRSY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

export default function JerseyConfiguratorUI() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchCart } = useCart()

  const [designId] = useState(makeDesignId)
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [tab, setTab] = useState<Tab>('voorkant')
  const [colorZone, setColorZone] = useState<ZoneId>('front')
  const [zoneStates, setZoneStates] = useState<Record<ZoneId, ZoneState>>(() => ({
    front: createEmptyZoneState(DEFAULT_ZONE_COLOR),
    back: createEmptyZoneState(DEFAULT_ZONE_COLOR),
    sleeveLeft: createEmptyZoneState(DEFAULT_ZONE_COLOR),
    sleeveRight: createEmptyZoneState(DEFAULT_ZONE_COLOR),
  }))
  const [size, setSize] = useState<JerseySize | ''>('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const selectTab = (t: Tab) => {
    setTab(t)
    if (t === 'voorkant') setSide('front')
    if (t === 'achterkant') setSide('back')
  }

  const setZoneColor = (zone: ZoneId, hex: string) => {
    setZoneStates((prev) => ({ ...prev, [zone]: { ...prev[zone], colorHex: hex } }))
  }

  // Origineel bestand apart bewaren voor productie — los van de live preview,
  // die werkt al met de lokale data-URL. Vereist login (net als /cart zelf);
  // zonder login faalt dit stil en probeert de effect hieronder het opnieuw
  // zodra de klant inlogt, zodat een upload vóór het inloggen niet alsnog
  // zonder origineel bij de bestelling terechtkomt.
  const uploadOriginal = (zone: ZoneId, layer: LogoLayer, file: File) => {
    const fd = new FormData()
    fd.append('kind', 'original')
    fd.append('zone', zone)
    fd.append('layerId', layer.id)
    fd.append('file', file)
    return api.post(`/customizer/design-asset/${designId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => {
        setZoneStates((prev) => ({
          ...prev,
          [zone]: { ...prev[zone], logos: prev[zone].logos.map((l) => (l.id === layer.id ? { ...l, originalUrl: r.data.url } : l)) },
        }))
      })
      .catch(() => {})
  }

  const addLogo = async (zone: ZoneId, file: File) => {
    setError('')
    setUploading(true)
    try {
      const { img, dataUrl, fileName } = await loadUploadedImage(file)
      const layer: LogoLayer = {
        id: nextId('logo'),
        img,
        fileName,
        originalDataUrl: dataUrl,
        transform: { ...DEFAULT_TRANSFORM },
      }
      setZoneStates((prev) => ({ ...prev, [zone]: { ...prev[zone], logos: [...prev[zone].logos, layer] } }))
      uploadOriginal(zone, layer, file)
    } catch {
      setError('Upload van logo mislukt.')
    }
    setUploading(false)
  }

  // Vangnet: logo's die zijn geüpload vóórdat de klant inlogde kregen geen
  // originalUrl (de design-asset-route vereist login). Zodra user actief
  // wordt, alsnog proberen — anders mist het productiepakket het originele
  // bestand voor die laag.
  useEffect(() => {
    if (!user) return
    ZONE_IDS.forEach((zone) => {
      zoneStates[zone].logos.forEach((logo) => {
        if (logo.originalUrl) return
        fetch(logo.originalDataUrl)
          .then((r) => r.blob())
          .then((blob) => uploadOriginal(zone, logo, new File([blob], logo.fileName, { type: blob.type })))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const updateLogoTransform = (zone: ZoneId, id: string, transform: LogoLayer['transform']) => {
    setZoneStates((prev) => ({
      ...prev,
      [zone]: { ...prev[zone], logos: prev[zone].logos.map((l) => (l.id === id ? { ...l, transform } : l)) },
    }))
  }

  const removeLogo = (zone: ZoneId, id: string) => {
    setZoneStates((prev) => ({ ...prev, [zone]: { ...prev[zone], logos: prev[zone].logos.filter((l) => l.id !== id) } }))
  }

  const addText = (zone: ZoneId) => {
    const layer: TextLayer = {
      id: nextId('text'),
      text: 'MOHAMMED',
      color: '#ffffff',
      fontFamily: FONT_OPTIONS[0].value,
      fontWeight: 800,
      transform: { ...DEFAULT_TRANSFORM },
    }
    setZoneStates((prev) => ({ ...prev, [zone]: { ...prev[zone], texts: [...prev[zone].texts, layer] } }))
  }

  const updateText = (zone: ZoneId, id: string, patch: Partial<TextLayer>) => {
    setZoneStates((prev) => ({
      ...prev,
      [zone]: { ...prev[zone], texts: prev[zone].texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) },
    }))
  }

  const removeText = (zone: ZoneId, id: string) => {
    setZoneStates((prev) => ({ ...prev, [zone]: { ...prev[zone], texts: prev[zone].texts.filter((t) => t.id !== id) } }))
  }

  const logoCount = useMemo(() => ZONE_IDS.reduce((n, z) => n + zoneStates[z].logos.length, 0), [zoneStates])
  const textCount = useMemo(() => ZONE_IDS.reduce((n, z) => n + zoneStates[z].texts.length, 0), [zoneStates])
  const price = calculateJerseyPrice({ logoCount, textCount })

  const buildConfig = () => ({
    product: 'Custom Fight Jersey',
    designId,
    size,
    zones: Object.fromEntries(
      ZONE_IDS.map((zone) => [
        zone,
        {
          colorHex: zoneStates[zone].colorHex,
          logos: zoneStates[zone].logos.map((l) => ({ id: l.id, fileName: l.fileName, originalUrl: l.originalUrl || null, transform: l.transform })),
          texts: zoneStates[zone].texts.map((t) => ({
            id: t.id, text: t.text, color: t.color, fontFamily: t.fontFamily, fontWeight: t.fontWeight, transform: t.transform,
          })),
        },
      ]),
    ),
  })

  const addToCart = async () => {
    if (!user) { navigate('/login'); return }
    if (!size) { setError('Kies een maat.'); return }
    setAdding(true)
    setError('')
    try {
      await api.post('/customizer/cart', { productKey: 'custom-jersey', size, config: buildConfig() })
      await fetchCart()
      setAdded(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Toevoegen aan winkelwagen mislukt.')
    }
    setAdding(false)
  }

  const downloadDesign = () => {
    const blob = new Blob([JSON.stringify(buildConfig(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fightmarketing-jersey-${designId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (added) {
    return (
      <div className="jersey-page__panel">
        <div className="jersey-success">
          <h2>Toegevoegd aan je winkelwagen!</h2>
          <p>Je jersey-ontwerp staat klaar. Ga naar je winkelwagen of maak nog een ontwerp.</p>
          <button className="jc-btn jc-btn--primary" onClick={() => navigate('/cart')}>Naar winkelwagen →</button>
          <button className="jc-btn jc-btn--ghost" onClick={() => setAdded(false)}>Verder ontwerpen</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="jersey-page__viewer">
        <JerseyScene zoneStates={zoneStates} side={side} />
        <div className="jersey-page__side-toggle">
          <button className={side === 'front' ? 'is-active' : ''} onClick={() => selectTab('voorkant')}>Voorkant</button>
          <button className={side === 'back' ? 'is-active' : ''} onClick={() => selectTab('achterkant')}>Achterkant</button>
        </div>
        <div className="jersey-page__hint">Sleep om te draaien · scroll om te zoomen</div>
      </div>

      <div className="jersey-page__panel">
        <div className="jc-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`jc-tab${tab === t.id ? ' is-active' : ''}`} onClick={() => selectTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="jc-panel-body">
          {(tab === 'voorkant' || tab === 'achterkant') && (
            <SideEditor
              zone={side}
              zoneState={zoneStates[side]}
              uploading={uploading}
              onColor={(hex) => setZoneColor(side, hex)}
              onAddLogo={(f) => addLogo(side, f)}
              onLogoTransform={(id, t) => updateLogoTransform(side, id, t)}
              onLogoRemove={(id) => removeLogo(side, id)}
              onAddText={() => addText(side)}
              onTextChange={(id, patch) => updateText(side, id, patch)}
              onTextRemove={(id) => removeText(side, id)}
            />
          )}

          {tab === 'kleur' && (
            <div className="jc-section">
              <div className="jc-zone-picker">
                {ZONE_IDS.map((z) => (
                  <button
                    key={z}
                    className={`jc-zone-picker__item${colorZone === z ? ' is-active' : ''}`}
                    onClick={() => setColorZone(z)}
                  >
                    <span className="jc-zone-picker__swatch" style={{ background: zoneStates[z].colorHex }} />
                    {ZONE_LABELS[z]}
                  </button>
                ))}
              </div>
              <ColorPicker value={zoneStates[colorZone].colorHex} onChange={(hex) => setZoneColor(colorZone, hex)} presets={COLOR_PRESETS} />
            </div>
          )}

          {tab === 'logo' && (
            <LogoEditor
              zone={side}
              zoneState={zoneStates[side]}
              uploading={uploading}
              onAdd={(f) => addLogo(side, f)}
              onTransform={(id, t) => updateLogoTransform(side, id, t)}
              onRemove={(id) => removeLogo(side, id)}
            />
          )}

          {tab === 'tekst' && (
            <TextEditor
              zone={side}
              zoneState={zoneStates[side]}
              onAdd={() => addText(side)}
              onChange={(id, patch) => updateText(side, id, patch)}
              onRemove={(id) => removeText(side, id)}
            />
          )}
        </div>

        <div className="jc-footer">
          <div className="jc-field">
            <div className="jc-field-label">Maat</div>
            <div className="jc-size-row">
              {SIZES.map((s) => (
                <button key={s} className={`jc-size-btn${size === s ? ' is-active' : ''}`} onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          {error && <div className="jc-error">{error}</div>}

          <div className="jc-price-row">
            <span>Prijs</span>
            <span className="jc-price-amount">{price > 0 ? `€${price.toFixed(2)}` : 'Op aanvraag'}</span>
          </div>

          <button className="jc-btn jc-btn--ghost jc-btn--full" onClick={downloadDesign}>ONTWERP DOWNLOADEN</button>
          <button className="jc-btn jc-btn--primary jc-btn--full" onClick={addToCart} disabled={adding}>
            {adding ? 'Bezig…' : 'IN WINKELWAGEN'}
          </button>
          {!user && <p className="jc-hint">Je moet ingelogd zijn om te bestellen.</p>}
          <p className="jc-attribution">
            3D-model &ldquo;Tshirt&rdquo; van{' '}
            <a href="https://sketchfab.com/Tabbuso" target="_blank" rel="noopener">Tabbuso</a>, gebruikt onder{' '}
            <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC-BY-4.0</a>.
          </p>
        </div>
      </div>
    </>
  )
}

function SideEditor(props: {
  zone: ZoneId
  zoneState: ZoneState
  uploading: boolean
  onColor: (hex: string) => void
  onAddLogo: (f: File) => void
  onLogoTransform: (id: string, t: LogoLayer['transform']) => void
  onLogoRemove: (id: string) => void
  onAddText: () => void
  onTextChange: (id: string, patch: Partial<TextLayer>) => void
  onTextRemove: (id: string) => void
}) {
  return (
    <div className="jc-section">
      <h4 className="jc-section-title">Shirtkleur</h4>
      <ColorPicker value={props.zoneState.colorHex} onChange={props.onColor} presets={COLOR_PRESETS} />
      <h4 className="jc-section-title">Logo's</h4>
      <LogoList zoneState={props.zoneState} uploading={props.uploading} onAdd={props.onAddLogo} onTransform={props.onLogoTransform} onRemove={props.onLogoRemove} />
      <h4 className="jc-section-title">Tekst</h4>
      <TextList zoneState={props.zoneState} onAdd={props.onAddText} onChange={props.onTextChange} onRemove={props.onTextRemove} />
    </div>
  )
}

function LogoEditor(props: {
  zone: ZoneId
  zoneState: ZoneState
  uploading: boolean
  onAdd: (f: File) => void
  onTransform: (id: string, t: LogoLayer['transform']) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="jc-section">
      <h4 className="jc-section-title">Logo's — {ZONE_LABELS[props.zone]}</h4>
      <LogoList zoneState={props.zoneState} uploading={props.uploading} onAdd={props.onAdd} onTransform={props.onTransform} onRemove={props.onRemove} />
    </div>
  )
}

function TextEditor(props: {
  zone: ZoneId
  zoneState: ZoneState
  onAdd: () => void
  onChange: (id: string, patch: Partial<TextLayer>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="jc-section">
      <h4 className="jc-section-title">Tekst — {ZONE_LABELS[props.zone]}</h4>
      <TextList zoneState={props.zoneState} onAdd={props.onAdd} onChange={props.onChange} onRemove={props.onRemove} />
    </div>
  )
}

function LogoList({ zoneState, uploading, onAdd, onTransform, onRemove }: {
  zoneState: ZoneState
  uploading: boolean
  onAdd: (f: File) => void
  onTransform: (id: string, t: LogoLayer['transform']) => void
  onRemove: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div className="jc-layer-list">
      {zoneState.logos.map((logo) => (
        <div key={logo.id} className="jc-layer-item">
          <button className="jc-layer-item__head" onClick={() => setExpanded(expanded === logo.id ? null : logo.id)}>
            <img src={logo.originalDataUrl} alt="" className="jc-layer-thumb" />
            <span className="jc-layer-name">{logo.fileName}</span>
          </button>
          {expanded === logo.id && (
            <LayerControls transform={logo.transform} onChange={(t) => onTransform(logo.id, t)} onRemove={() => onRemove(logo.id)} />
          )}
        </div>
      ))}
      <UploadBox label={uploading ? 'BEZIG MET UPLOADEN…' : 'UPLOAD JE EIGEN DESIGN'} onFile={onAdd} />
    </div>
  )
}

function TextList({ zoneState, onAdd, onChange, onRemove }: {
  zoneState: ZoneState
  onAdd: () => void
  onChange: (id: string, patch: Partial<TextLayer>) => void
  onRemove: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div className="jc-layer-list">
      {zoneState.texts.map((t) => (
        <div key={t.id} className="jc-layer-item">
          <button className="jc-layer-item__head" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
            <span className="jc-layer-name">{t.text || 'Tekst'}</span>
          </button>
          {expanded === t.id && (
            <div className="jc-text-editor">
              <input
                className="jc-text-input"
                maxLength={20}
                value={t.text}
                placeholder="VOEG JE NAAM TOE"
                onChange={(e) => onChange(t.id, { text: e.target.value })}
              />
              <div className="jc-swatch-row">
                {TEXT_COLORS.map((c) => (
                  <button key={c} className={`jc-swatch${t.color === c ? ' is-active' : ''}`} style={{ background: c }} onClick={() => onChange(t.id, { color: c })} />
                ))}
              </div>
              <select className="jc-select" value={t.fontFamily} onChange={(e) => onChange(t.id, { fontFamily: e.target.value })}>
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <LayerControls transform={t.transform} onChange={(tr) => onChange(t.id, { transform: tr })} onRemove={() => onRemove(t.id)} />
            </div>
          )}
        </div>
      ))}
      <button className="jc-btn jc-btn--ghost jc-btn--full" onClick={onAdd}>+ VOEG JE NAAM TOE</button>
    </div>
  )
}
