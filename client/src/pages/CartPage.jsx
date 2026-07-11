import { Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import usePageTitle from '../hooks/usePageTitle'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '../config'

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
          {items.map(item => (
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
            <div key={item.id} className="summary-row">
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
