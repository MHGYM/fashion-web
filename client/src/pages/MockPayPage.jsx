import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import api from '../api'

/**
 * Gesimuleerde betaalpagina (alleen actief zonder echte Mollie-sleutel).
 * Bootst de Mollie-checkout na zodat de volledige flow lokaal testbaar is.
 */
export default function MockPayPage() {
  const { paymentId } = useParams()
  const navigate = useNavigate()
  const [info, setInfo]     = useState(null)
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [bank, setBank]     = useState('ing')

  useEffect(() => {
    api.get(`/payments/mock/${paymentId}`)
      .then(r => setInfo(r.data))
      .catch(e => setError(e.response?.data?.error || 'Betaling niet gevonden.'))
  }, [paymentId])

  const complete = async (outcome) => {
    setBusy(true)
    try {
      const r = await api.post(`/payments/mock/${paymentId}/complete`, { outcome })
      navigate(`/bestelling/${r.data.order_id}/status`)
    } catch (e) {
      setError(e.response?.data?.error || 'Er ging iets mis.')
      setBusy(false)
    }
  }

  if (error) return <div style={{ textAlign: 'center', padding: '5rem', color: '#888' }}>{error}</div>
  if (!info)  return <div style={{ textAlign: 'center', padding: '5rem', color: '#aaa' }}>Laden…</div>

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7', padding: '2rem 1rem' }}>
      <div style={{ background: '#fff', borderRadius: 12, maxWidth: 420, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <div style={{ background: '#111', color: '#fff', padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CreditCard size={18}/>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Testbetaling (simulatie)</span>
        </div>
        <div style={{ padding: '1.75rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Te betalen</div>
            <div style={{ fontSize: '2rem', fontWeight: 900 }}>€{Number(info.amount).toFixed(2)}</div>
            <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: 4 }}>Bestelling #{info.order_id}</div>
          </div>

          <label className="label" style={{ fontSize: '0.75rem' }}>iDEAL — kies je bank</label>
          <select className="input" value={bank} onChange={e => setBank(e.target.value)} style={{ marginBottom: '1.25rem' }}>
            <option value="ing">ING</option>
            <option value="rabo">Rabobank</option>
            <option value="abn">ABN AMRO</option>
            <option value="bunq">bunq</option>
            <option value="sns">SNS</option>
          </select>

          <button className="btn btn-black btn-full btn-lg" disabled={busy || info.settled} onClick={() => complete('paid')} style={{ marginBottom: 10 }}>
            {busy ? 'Bezig…' : 'Betalen'}
          </button>
          <button className="btn btn-outline btn-full" disabled={busy || info.settled} onClick={() => complete('failed')}>
            Betaling annuleren
          </button>

          <p style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '1.25rem', textAlign: 'center' }}>
            Dit is een gesimuleerde betaalomgeving. Vul in .env een Mollie-sleutel in om echt via Mollie/iDEAL te betalen.
          </p>
        </div>
      </div>
    </div>
  )
}
