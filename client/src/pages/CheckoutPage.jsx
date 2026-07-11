import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, X } from 'lucide-react'
import api from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import usePageTitle from '../hooks/usePageTitle'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '../config'

export default function CheckoutPage() {
  usePageTitle('Bestellen')
  const { items, total, fetchCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const schoolSlug = localStorage.getItem('sf_school') || null
  const schoolName = localStorage.getItem('sf_school_name') || null

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
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState('')

  // Kortingscode
  const [codeInput, setCodeInput] = useState('')
  const [code, setCode]           = useState(null)   // { code, discount_pct, fighter_name }
  const [codeBusy, setCodeBusy]   = useState(false)
  const [codeError, setCodeError] = useState('')

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const discount   = code ? Math.round(total * (code.discount_pct / 100) * 100) / 100 : 0
  const shipping   = total - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const orderTotal = total - discount + shipping

  const applyCode = async () => {
    if (!codeInput.trim()) return
    setCodeBusy(true); setCodeError('')
    try {
      const r = await api.post('/discounts/validate', { code: codeInput })
      setCode(r.data); setCodeInput('')
    } catch (e) {
      setCodeError(e.response?.data?.error || 'Ongeldige code.')
    }
    setCodeBusy(false)
  }

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      const r = await api.post('/orders', {
        ...form,
        school_slug:   schoolSlug,
        discount_code: code?.code || null,
      })
      fetchCart()
      // Door naar de betaalomgeving (Mollie of mock)
      if (r.data.checkout_url) {
        if (r.data.mock) navigate(r.data.checkout_url)
        else window.location.href = r.data.checkout_url
      } else {
        navigate(`/bestelling/${r.data.order_id}/status`)
      }
      return
    } catch(e) {
      setError(e.response?.data?.error || 'Fout bij plaatsen bestelling.')
    }
    setLoading(false)
  }

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
            <p style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>
              Je rekent veilig af via iDEAL. Na het plaatsen van je bestelling word je doorgestuurd naar de betaalomgeving.
            </p>
          </div>
        </div>

        {/* Samenvatting */}
        <div>
          <div className="cart-summary">
            <h3>Jouw bestelling</h3>
            {schoolName && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:6, fontSize:'0.8rem', color:'#0369a1', marginBottom:'0.75rem' }}>
                Je bestelt via <strong>{schoolName}</strong> — zij verdienen mee aan deze bestelling 💪
              </div>
            )}
            {items.map(item => (
              <div key={item.id} className="summary-row">
                <span style={{ fontSize:'0.85rem' }}>{item.name} ({item.size}) ×{item.quantity}</span>
                <span style={{ fontWeight:600 }}>€{((item.sale_price||item.price)*item.quantity).toFixed(2)}</span>
              </div>
            ))}

            {/* Kortingscode */}
            {code ? (
              <div className="summary-row" style={{ color:'#16a34a' }}>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Tag size={14}/> {code.code} (−{code.discount_pct}%)
                  <button onClick={() => setCode(null)} title="Verwijder code" aria-label="Kortingscode verwijderen" style={{ background:'none', border:'none', cursor:'pointer', color:'#999', display:'flex' }}><X size={13}/></button>
                </span>
                <span style={{ fontWeight:600 }}>−€{discount.toFixed(2)}</span>
              </div>
            ) : (
              <div style={{ margin:'0.5rem 0' }}>
                <div style={{ display:'flex', gap:6 }}>
                  <input className="input" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
                    placeholder="Kortingscode" style={{ fontSize:'0.82rem' }}
                    onKeyDown={e => e.key === 'Enter' && applyCode()}/>
                  <button className="btn btn-outline" onClick={applyCode} disabled={codeBusy} style={{ fontSize:'0.8rem', whiteSpace:'nowrap' }}>
                    {codeBusy ? '…' : 'Toepassen'}
                  </button>
                </div>
                {codeError && <p style={{ color:'var(--error, #dc2626)', fontSize:'0.75rem', marginTop:4 }}>{codeError}</p>}
              </div>
            )}

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
              {loading ? 'Bezig…' : `Afrekenen · €${orderTotal.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
