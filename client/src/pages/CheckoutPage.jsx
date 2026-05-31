import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import api from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function CheckoutPage() {
  const { items, total, fetchCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    shipping_name:    user ? `${user.first_name} ${user.last_name}` : '',
    shipping_email:   user?.email || '',
    shipping_phone:   '',
    shipping_address: '',
    shipping_city:    '',
    shipping_postal:  '',
    shipping_country: 'NL',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(null)

  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const shipping = total >= 50 ? 0 : 4.95
  const orderTotal = total + shipping

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      const r = await api.post('/orders', form)
      setDone(r.data)
      fetchCart()
    } catch(e) {
      setError(e.response?.data?.error || 'Fout bij plaatsen bestelling.')
    }
    setLoading(false)
  }

  if (done) return (
    <div style={{ maxWidth:520, margin:'4rem auto', padding:'2rem', textAlign:'center' }}>
      <div style={{ width:72, height:72, background:'#d1fae5', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem' }}>
        <Check size={36} color="#16a34a" strokeWidth={2.5}/>
      </div>
      <h1 style={{ fontSize:'1.6rem', fontWeight:800, marginBottom:'0.5rem' }}>Bestelling geplaatst!</h1>
      <p style={{ color:'var(--text-muted)', marginBottom:'0.5rem' }}>Bestelnummer <strong>#{done.order_id}</strong></p>
      <p style={{ color:'var(--text-muted)', marginBottom:'2rem' }}>We sturen een bevestiging naar <strong>{form.shipping_email}</strong>.</p>
      <button className="btn btn-black btn-lg" onClick={() => navigate('/shop')}>Verder winkelen</button>
    </div>
  )

  if (!items.length) { navigate('/cart'); return null }

  return (
    <div className="checkout-page">
      <h1 style={{ fontSize:'1.6rem', fontWeight:800, marginBottom:'2rem' }}>Bestellen</h1>
      <div className="checkout-layout">
        {/* Formulier */}
        <div>
          <div className="checkout-section">
            <h3>Bezorggegevens</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Naam *</label>
                <input className="input" value={form.shipping_name} onChange={e => set('shipping_name', e.target.value)} placeholder="Voor- en achternaam"/>
              </div>
              <div className="form-group">
                <label className="label">E-mail *</label>
                <input className="input" type="email" value={form.shipping_email} onChange={e => set('shipping_email', e.target.value)} placeholder="jouw@email.nl"/>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Telefoonnummer</label>
              <input className="input" value={form.shipping_phone} onChange={e => set('shipping_phone', e.target.value)} placeholder="06 12345678"/>
            </div>
            <div className="form-group">
              <label className="label">Adres *</label>
              <input className="input" value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} placeholder="Straatnaam 12"/>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Postcode *</label>
                <input className="input" value={form.shipping_postal} onChange={e => set('shipping_postal', e.target.value)} placeholder="1234 AB"/>
              </div>
              <div className="form-group">
                <label className="label">Stad *</label>
                <input className="input" value={form.shipping_city} onChange={e => set('shipping_city', e.target.value)} placeholder="Amsterdam"/>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Opmerking (optioneel)</label>
              <textarea className="input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Bezorginstructies, etc." style={{ resize:'vertical' }}/>
            </div>
          </div>

          <div className="checkout-section">
            <h3>Betaling</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>Betaalopties worden binnenkort toegevoegd. Je ontvangt een betaallink per e-mail.</p>
          </div>
        </div>

        {/* Samenvatting */}
        <div>
          <div className="cart-summary">
            <h3>Jouw bestelling</h3>
            {items.map(item => (
              <div key={item.id} className="summary-row">
                <span style={{ fontSize:'0.85rem' }}>{item.name} ({item.size}) ×{item.quantity}</span>
                <span style={{ fontWeight:600 }}>€{((item.sale_price||item.price)*item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="summary-row">
              <span>Verzending</span>
              <span style={{ color: shipping===0 ? 'var(--success)' : 'inherit', fontWeight:600 }}>{shipping===0 ? 'Gratis' : `€${shipping.toFixed(2)}`}</span>
            </div>
            <div className="summary-row total">
              <span>Totaal</span>
              <span>€{orderTotal.toFixed(2)}</span>
            </div>
            {error && <p style={{ color:'var(--error)', fontSize:'0.85rem', marginTop:'0.75rem' }}>{error}</p>}
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop:'1rem' }} onClick={submit} disabled={loading}>
              {loading ? 'Bezig…' : `Bestelling plaatsen · €${orderTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
