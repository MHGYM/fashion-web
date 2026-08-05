import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Check, Upload, X } from 'lucide-react'
import api from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import usePageTitle from '../hooks/usePageTitle'
import CustomizerPreview from '../customizer/CustomizerPreview'
import { PALETTE } from '../customizer/palette'
import {
  CUSTOMIZER_CONFIG, FIELD_LABELS, CUSTOM_PRODUCTS, PRICING, CONFIRM_DISCLAIMER,
} from '../customizer/config'

const hexOf = name => PALETTE.find(p => p.name === name)?.hex || null

// Herbruikbaar kleurenraster (16 kleuren). `value` = gekozen kleurnaam.
function SwatchGrid({ value, onChange, small }) {
  return (
    <div className={`cz-swatches ${small ? 'cz-swatches-sm' : ''}`}>
      {PALETTE.map(c => (
        <button
          key={c.name}
          type="button"
          className={`cz-swatch ${value === c.name ? 'selected' : ''}`}
          style={{ background: c.hex }}
          title={c.name}
          aria-label={c.name}
          aria-pressed={value === c.name}
          onClick={() => onChange(c.name)}
        >
          {value === c.name && <Check size={small ? 12 : 15} className="cz-swatch-check" />}
        </button>
      ))}
    </div>
  )
}

export default function CustomizePage() {
  usePageTitle('Customise Your Own')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { fetchCart } = useCart()

  const [productsData, setProductsData] = useState(null)   // basisprijzen/maten van de server
  const [activeProduct, setActiveProduct] = useState('gloves')
  const [glovesStyle, setGlovesStyle] = useState('gloves-velcro')
  const [colors, setColors] = useState({})                 // veld → kleurnaam
  const [name, setName] = useState({ text: '', color: '', style: 'Printed' })
  const [logo, setLogo] = useState({ url: '', style: 'Print', filename: '' })
  const [logoBusy, setLogoBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [size, setSize] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const prod      = CUSTOM_PRODUCTS[activeProduct]
  const configKey = prod.hasStyle ? glovesStyle : prod.configKey
  const config    = CUSTOMIZER_CONFIG[configKey]
  const fields    = config.fields

  const basePrice = productsData?.[prod.productKey]?.price ?? null
  const embroidered = name.text.trim() && name.style === 'Embroidered'
  const price = basePrice != null ? basePrice + (embroidered ? PRICING.nameEmbroiderySurcharge : 0) : null

  // Preview-kleuren: veld → hex (op basis van gekozen kleurnaam)
  const selections = useMemo(() => {
    const s = {}
    fields.forEach(f => { const hex = hexOf(colors[f]); if (hex) s[f] = hex })
    return s
  }, [fields, colors])

  useEffect(() => {
    api.get('/customizer/products').then(r => setProductsData(r.data)).catch(() => {})
  }, [])

  // Bij wisselen van product/stijl veranderen de velden → kleuren resetten.
  useEffect(() => { setColors({}); setError('') }, [configKey])
  // Andere maten per product → maat resetten.
  useEffect(() => { setSize('') }, [activeProduct])

  const uploadLogo = async (file) => {
    if (!file) return
    if (!user) { navigate('/login'); return }
    setLogoBusy(true); setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const r = await api.post('/customizer/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setLogo(l => ({ ...l, url: r.data.url, filename: file.name }))
    } catch (e) {
      setError(e.response?.data?.error || 'Upload mislukt.')
    }
    setLogoBusy(false)
  }

  const validate = () => {
    for (const f of fields) {
      if (!colors[f]) return `Kies een kleur voor "${FIELD_LABELS[f]}".`
    }
    if (name.text.trim() && !name.color) return 'Kies een kleur voor de naam die je hebt ingevuld.'
    if (!size) return 'Kies een maat.'
    if (!confirmed) return 'Bevestig je ontwerp via het vinkje onderaan.'
    return null
  }

  const addToCart = async () => {
    if (!user) { navigate('/login'); return }
    const problem = validate()
    if (problem) { setError(problem); return }

    const styleLabel = prod.hasStyle ? prod.styles.find(s => s.key === glovesStyle)?.label : null
    const colorMap = {}
    fields.forEach(f => { colorMap[FIELD_LABELS[f]] = colors[f] })

    const cfg = {
      product: prod.label,
      style: styleLabel,
      size,
      colors: colorMap,
      name: name.text.trim() ? { text: name.text.trim(), color: name.color, style: name.style } : null,
      logo: logo.url ? { url: logo.url, style: logo.style } : null,
      notes: notes.trim() || null,
    }

    setAdding(true); setError('')
    try {
      await api.post('/customizer/cart', { productKey: prod.productKey, size, config: cfg })
      await fetchCart()
      setAdded(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e.response?.data?.error || 'Toevoegen aan winkelwagen mislukt.')
    }
    setAdding(false)
  }

  if (added) return (
    <div className="cz-page">
      <div className="cz-success">
        <div className="cz-success-icon"><Check size={40} strokeWidth={2.5} /></div>
        <h2>Toegevoegd aan je winkelwagen!</h2>
        <p>Je custom ontwerp staat klaar. Je kunt nog een ontwerp maken of afrekenen.</p>
        <div className="cz-success-actions">
          <button className="btn btn-black btn-lg" onClick={() => navigate('/cart')}>Naar winkelwagen →</button>
          <button className="btn btn-outline btn-lg" onClick={() => { setAdded(false); setConfirmed(false) }}>Nog een ontwerp maken</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="cz-page">
      <div className="cz-header">
        <h1>Customise Your Own</h1>
        <p>Stel je eigen gear volledig samen — kies per onderdeel een kleur en zie het meteen terug in de preview.</p>
      </div>

      {/* Productkeuze */}
      <div className="cz-tabs">
        {Object.entries(CUSTOM_PRODUCTS).map(([key, p]) => (
          <button
            key={key}
            className={`cz-tab ${activeProduct === key ? 'active' : ''}`}
            onClick={() => setActiveProduct(key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="cz-layout">
        {/* Preview */}
        <div className="cz-preview-col">
          <div className="cz-preview-box">
            <CustomizerPreview config={config} selections={selections} />
          </div>
          <div className="cz-price">
            {price != null ? (
              <>
                <span className="cz-price-amount">€{price.toFixed(2)}</span>
                {embroidered && <span className="cz-price-note">incl. +€{PRICING.nameEmbroiderySurcharge} geborduurde naam</span>}
              </>
            ) : <span className="cz-price-note">Prijs laden…</span>}
          </div>
        </div>

        {/* Bediening */}
        <div className="cz-controls">
          {/* Stijl (alleen handschoenen) */}
          {prod.hasStyle && (
            <div className="cz-field">
              <div className="cz-field-label">Glove Style</div>
              <div className="cz-style-row">
                {prod.styles.map(s => (
                  <button
                    key={s.key}
                    className={`cz-style-btn ${glovesStyle === s.key ? 'active' : ''}`}
                    onClick={() => setGlovesStyle(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kleurvelden */}
          {fields.map(f => (
            <div className="cz-field" key={f}>
              <div className="cz-field-label">
                {FIELD_LABELS[f]}
                <span className="cz-field-value">{colors[f] || 'Kies een kleur'}</span>
              </div>
              <SwatchGrid value={colors[f]} onChange={c => setColors(prev => ({ ...prev, [f]: c }))} />
            </div>
          ))}

          <div className="cz-divider" />

          {/* Naam toevoegen */}
          <div className="cz-field">
            <div className="cz-field-label">Add your Name <span className="cz-optional">(optioneel)</span></div>
            <input
              className="input"
              maxLength={20}
              placeholder="Bijv. jouw naam of bijnaam"
              value={name.text}
              onChange={e => setName(n => ({ ...n, text: e.target.value }))}
            />
            {name.text.trim() && (
              <>
                <div className="cz-sub-label">Kleur van de naam</div>
                <SwatchGrid small value={name.color} onChange={c => setName(n => ({ ...n, color: c }))} />
                <div className="cz-sub-label">Stijl</div>
                <div className="cz-style-row">
                  {['Printed', 'Embroidered'].map(st => (
                    <button
                      key={st}
                      className={`cz-style-btn ${name.style === st ? 'active' : ''}`}
                      onClick={() => setName(n => ({ ...n, style: st }))}
                    >
                      {st === 'Embroidered' ? `Embroidered (+€${PRICING.nameEmbroiderySurcharge})` : 'Printed'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="cz-divider" />

          {/* Logo uploaden */}
          <div className="cz-field">
            <div className="cz-field-label">Upload Logo <span className="cz-optional">(optioneel)</span></div>
            <p className="cz-hint">Gebruik alleen materiaal waarvan je zelf de rechten hebt — geen auteursrechtelijk beschermde logo's.</p>
            {logo.url ? (
              <div className="cz-logo-preview">
                <img src={logo.url} alt="Geüpload logo" />
                <span className="cz-logo-name">{logo.filename}</span>
                <button className="cz-logo-remove" aria-label="Logo verwijderen" onClick={() => setLogo({ url: '', style: 'Print', filename: '' })}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className={`cz-upload ${logoBusy ? 'busy' : ''}`}>
                <Upload size={18} />
                {logoBusy ? 'Uploaden…' : 'Kies een afbeelding'}
                <input type="file" accept="image/*" hidden disabled={logoBusy}
                  onChange={e => uploadLogo(e.target.files?.[0])} />
              </label>
            )}
            {logo.url && (
              <>
                <div className="cz-sub-label">Stijl</div>
                <div className="cz-style-row">
                  {['Print', 'Embroidered'].map(st => (
                    <button
                      key={st}
                      className={`cz-style-btn ${logo.style === st ? 'active' : ''}`}
                      onClick={() => setLogo(l => ({ ...l, style: st }))}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="cz-divider" />

          {/* Extra opmerkingen */}
          <div className="cz-field">
            <div className="cz-field-label">Additional Notes <span className="cz-optional">(optioneel)</span></div>
            <textarea
              className="input" rows={3} maxLength={500} style={{ resize: 'vertical' }}
              placeholder="Bijzondere wensen, plaatsing van naam/logo, etc."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Maat */}
          <div className="cz-field">
            <div className="cz-field-label">Maat</div>
            <select className="input" value={size} onChange={e => setSize(e.target.value)}>
              <option value="">Kies een maat…</option>
              {prod.sizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="cz-divider" />

          {/* Bevestigen */}
          <label className="cz-confirm">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
            <span>{CONFIRM_DISCLAIMER}</span>
          </label>

          {error && <div className="cz-error">{error}</div>}

          <button className="btn btn-black btn-lg btn-full" onClick={addToCart} disabled={adding} style={{ marginTop: '1rem' }}>
            <ShoppingBag size={18} />
            {adding ? 'Bezig…' : (price != null ? `In winkelwagen · €${price.toFixed(2)}` : 'In winkelwagen')}
          </button>
          {!user && <p className="cz-hint" style={{ textAlign: 'center', marginTop: 8 }}>Je moet ingelogd zijn om te bestellen.</p>}
        </div>
      </div>
    </div>
  )
}
