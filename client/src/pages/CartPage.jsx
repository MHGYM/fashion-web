import { Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, Sparkles } from 'lucide-react'
import { useCart } from '../context/CartContext'
import usePageTitle from '../hooks/usePageTitle'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '../config'
import { PALETTE } from '../customizer/palette'

const hexOf = name => PALETTE.find(p => p.name === name)?.hex || '#ccc'

// Leesbare samenvatting van een custom ontwerp in de winkelwagen.
function CustomSummary({ config }) {
  if (!config) return null
  const { style, colors, name, logo, notes, customImage, wristLogo } = config

  // Logo-thumbnails: de 3D-configurator zet customImage (Front Panel) en/of
  // wristLogo (Manchet), de oudere SVG-customizer zet logo. Toont steeds het
  // ORIGINELE geüploade bestand (nooit de upload zelf aanpassen — puur een
  // <img>-verwijzing ter weergave), met het gepositioneerde artwork als
  // terugval mocht er onverhoopt geen apart origineel zijn opgeslagen. Geen
  // van beide aanwezig → simpelweg geen Logo-rij (nette fallback).
  const logos = [
    customImage && (customImage.originalUrl || customImage.artworkUrl)
      ? { label: 'Front Panel', url: customImage.originalUrl || customImage.artworkUrl } : null,
    wristLogo && (wristLogo.originalUrl || wristLogo.artworkUrl)
      ? { label: 'Manchet', url: wristLogo.originalUrl || wristLogo.artworkUrl } : null,
    (!customImage && !wristLogo && logo?.url) ? { label: logo.style || 'Logo', url: logo.url } : null,
  ].filter(Boolean)

  return (
    <div className="cart-custom-summary">
      {style && <div className="ccs-row"><span className="ccs-key">Stijl</span><span>{style}</span></div>}
      {colors && Object.entries(colors).map(([part, colorName]) => (
        <div className="ccs-row" key={part}>
          <span className="ccs-key">{part}</span>
          <span className="ccs-color">
            <span className="ccs-swatch" style={{ background: hexOf(colorName) }} />
            {colorName}
          </span>
        </div>
      ))}
      {name && <div className="ccs-row"><span className="ccs-key">Naam</span><span>“{name.text}” · {name.color}{name.style ? ` · ${name.style}` : ''}</span></div>}
      {logos.length > 0 && (
        <div className="ccs-row">
          <span className="ccs-key">Logo</span>
          <span className="ccs-color ccs-logos">
            {logos.map((l) => (
              <span key={l.label} className="ccs-logo-item">
                <img src={l.url} alt={`${l.label}-logo`} className="ccs-logo" />
                <span className="ccs-logo-label">{l.label}</span>
              </span>
            ))}
          </span>
        </div>
      )}
      {notes && <div className="ccs-row"><span className="ccs-key">Opmerking</span><span>{notes}</span></div>}
    </div>
  )
}

export default function CartPage() {
  usePageTitle('Winkelwagen')
  const { items, total, updateItem, removeItem } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) return (
    <div className="cart-page">
      <h1 style={{ fontSize:'1.6rem', fontWeight:800, marginBottom:'2rem' }}>Winkelwagen</h1>
      <div className="empty">
        <div className="empty-icon"><ShoppingBag size={48} strokeWidth={1}/></div>
        <h3>Je winkelwagen is leeg</h3>
        <p style={{ marginBottom:'1.5rem' }}>Voeg producten toe om verder te gaan.</p>
        <Link to="/shop" className="btn btn-black">Verder winkelen</Link>
      </div>
    </div>
  )

  return (
    <div className="cart-page">
      <h1 style={{ fontSize:'1.6rem', fontWeight:800, marginBottom:'2rem' }}>Winkelwagen ({items.length})</h1>
      <div className="cart-layout">
        <div>
          {items.map(item => item.custom ? (
            /* ── Custom ontwerp ── */
            <div key={`c${item.id}`} className="cart-item">
              <div className="cart-item-img cart-item-img-custom">
                <Sparkles size={26} strokeWidth={1.5} />
              </div>
              <div>
                <div className="cart-item-name">{item.name} <span className="cart-custom-badge">Custom</span></div>
                <div className="cart-item-meta">Maat: {item.size}</div>
                <CustomSummary config={item.config} />
                <div style={{ fontWeight:700, marginTop:8 }}>€{(item.price * item.quantity).toFixed(2)}</div>
              </div>
              <button onClick={() => removeItem(item.id, true)} aria-label={`${item.name} verwijderen uit winkelwagen`} style={{ background:'none', border:'none', color:'var(--text-muted)', padding:4, cursor:'pointer' }}>
                <Trash2 size={18}/>
              </button>
            </div>
          ) : (
            /* ── Regulier product ── */
            <div key={item.id} className="cart-item">
              <div className="cart-item-img" onClick={() => navigate(`/shop/${item.slug}`)} style={{ cursor:'pointer' }}>
                {item.image
                  ? <img src={item.image} alt={item.name} />
                  : <div style={{ width:'100%', height:'100%', background:'var(--bg2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem' }}>👕</div>
                }
              </div>
              <div>
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-meta">Maat: {item.size}{item.color ? ` · ${item.color}` : ''}</div>
                <div style={{ fontWeight:700, marginBottom:8 }}>
                  €{((item.sale_price || item.price) * item.quantity).toFixed(2)}
                </div>
                <div className="qty-control">
                  <button className="qty-btn" aria-label="Aantal verlagen" onClick={() => updateItem(item.id, item.quantity - 1)}>−</button>
                  <span style={{ fontWeight:600, minWidth:24, textAlign:'center' }}>{item.quantity}</span>
                  <button className="qty-btn" aria-label="Aantal verhogen" onClick={() => updateItem(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} aria-label={`${item.name} verwijderen uit winkelwagen`} style={{ background:'none', border:'none', color:'var(--text-muted)', padding:4, cursor:'pointer' }}>
                <Trash2 size={18}/>
              </button>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h3>Overzicht</h3>
          {items.map(item => (
            <div key={item.custom ? `c${item.id}` : item.id} className="summary-row">
              <span>{item.name} ×{item.quantity}</span>
              <span>€{((item.sale_price || item.price) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="summary-row">
            <span>Verzendkosten</span>
            <span style={{ color:'var(--success)', fontWeight:600 }}>{total >= FREE_SHIPPING_THRESHOLD ? 'Gratis' : `€${SHIPPING_COST.toFixed(2).replace('.', ',')}`}</span>
          </div>
          <div className="summary-row total">
            <span>Totaal</span>
            <span>€{(total + (total >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST)).toFixed(2)}</span>
          </div>
          {total < FREE_SHIPPING_THRESHOLD && (
            <div style={{ background:'var(--accent-light)', borderRadius:8, padding:'10px 12px', fontSize:'0.82rem', color:'var(--accent)', fontWeight:600, margin:'0.75rem 0' }}>
              Nog €{(FREE_SHIPPING_THRESHOLD-total).toFixed(2)} tot gratis verzending!
            </div>
          )}
          <button className="btn btn-primary btn-full btn-lg" style={{ marginTop:'0.5rem' }} onClick={() => navigate('/checkout')}>
            Bestellen →
          </button>
          <Link to="/shop" style={{ display:'block', textAlign:'center', marginTop:'1rem', fontSize:'0.85rem', color:'var(--text-muted)' }}>
            ← Verder winkelen
          </Link>
        </div>
      </div>
    </div>
  )
}
