import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, X, Clock } from 'lucide-react'
import api from '../api'

/**
 * Retourpagina na betaling. Pollt de betaalstatus (en synct server-side met
 * Mollie) tot de betaling definitief is.
 */
export default function PaymentReturnPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading' })
  const tries = useRef(0)

  useEffect(() => {
    let stop = false
    const poll = async () => {
      try {
        const r = await api.get(`/payments/status/${id}`)
        if (stop) return
        if (r.data.paid) { setState({ status: 'paid', total: r.data.total }); return }
        if (r.data.status === 'cancelled') { setState({ status: 'cancelled' }); return }
        tries.current += 1
        if (tries.current > 20) { setState({ status: 'waiting' }); return }
        setState({ status: 'checking' })
        setTimeout(poll, 2000)
      } catch (e) {
        if (!stop) setState({ status: 'error', error: e.response?.data?.error || 'Kon status niet ophalen.' })
      }
    }
    poll()
    return () => { stop = true }
  }, [id])

  const Wrap = ({ children }) => (
    <div style={{ maxWidth: 520, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>{children}</div>
  )
  const Circle = ({ bg, children }) => (
    <div style={{ width: 72, height: 72, background: bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>{children}</div>
  )

  if (state.status === 'paid') {
    localStorage.removeItem('sf_school'); localStorage.removeItem('sf_school_name')
    return (
      <Wrap>
        <Circle bg="#d1fae5"><Check size={36} color="#16a34a" strokeWidth={2.5}/></Circle>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Betaling geslaagd!</h1>
        <p style={{ color: '#777', marginBottom: '0.5rem' }}>Bestelling <strong>#{id}</strong> · €{Number(state.total).toFixed(2)}</p>
        <p style={{ color: '#777', marginBottom: '2rem' }}>Je ontvangt een bevestiging per e-mail. Bedankt voor je bestelling!</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-black btn-lg" onClick={() => navigate('/shop')}>Verder winkelen</button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/account')}>Mijn bestellingen</button>
        </div>
      </Wrap>
    )
  }

  if (state.status === 'cancelled') return (
    <Wrap>
      <Circle bg="#fee2e2"><X size={36} color="#dc2626" strokeWidth={2.5}/></Circle>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Betaling niet gelukt</h1>
      <p style={{ color: '#777', marginBottom: '2rem' }}>De betaling is geannuleerd of mislukt. Je bestelling is niet doorgegaan en de voorraad is vrijgegeven.</p>
      <button className="btn btn-black btn-lg" onClick={() => navigate('/cart')}>Terug naar winkelwagen</button>
    </Wrap>
  )

  if (state.status === 'waiting') return (
    <Wrap>
      <Circle bg="#fef3c7"><Clock size={36} color="#d97706" strokeWidth={2.5}/></Circle>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Betaling in verwerking</h1>
      <p style={{ color: '#777', marginBottom: '2rem' }}>We hebben nog geen definitieve bevestiging ontvangen. Zodra de betaling binnen is, zie je de bestelling bij je account.</p>
      <button className="btn btn-black btn-lg" onClick={() => navigate('/account')}>Naar mijn account</button>
    </Wrap>
  )

  if (state.status === 'error') return <Wrap><p style={{ color: '#888' }}>{state.error}</p></Wrap>

  return (
    <Wrap>
      <Circle bg="#f3f4f6"><Clock size={36} color="#6b7280" strokeWidth={2.5}/></Circle>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Betaling controleren…</h1>
      <p style={{ color: '#999', marginTop: 8 }}>Een moment geduld.</p>
    </Wrap>
  )
}
