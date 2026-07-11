import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import usePageTitle from '../hooks/usePageTitle'

export default function AccountPage() {
  usePageTitle('Mijn account')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]       = useState('orders')
  const [orders, setOrders] = useState([])

  useEffect(() => { if (!user) navigate('/login') }, [user])
  useEffect(() => { if (user) api.get('/orders/mine').then(r => setOrders(r.data)).catch(()=>{}) }, [user])

  const statusLabel = { pending:'In behandeling', processing:'Verwerking', shipped:'Verzonden', delivered:'Afgeleverd', cancelled:'Geannuleerd' }

  if (!user) return null

  return (
    <div className="account-page">
      <h1 style={{ fontSize:'1.6rem', fontWeight:800, marginBottom:'2rem' }}>Mijn account</h1>
      <div className="account-layout">
        <nav className="account-nav">
          <a href="#" className={tab==='orders'?'active':''} onClick={e=>{e.preventDefault();setTab('orders')}}>📦 Bestellingen</a>
          <a href="#" className={tab==='profile'?'active':''} onClick={e=>{e.preventDefault();setTab('profile')}}>👤 Profiel</a>
          <a href="#" onClick={e=>{e.preventDefault();logout();navigate('/')}} style={{ color:'var(--error)' }}>Uitloggen</a>
        </nav>

        <div>
          {tab === 'orders' && (
            <div>
              <h2 style={{ fontWeight:700, marginBottom:'1.25rem' }}>Mijn bestellingen</h2>
              {orders.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📦</div>
                  <h3>Nog geen bestellingen</h3>
                  <p style={{ marginBottom:'1.5rem' }}>Je hebt nog niets besteld.</p>
                  <Link to="/shop" className="btn btn-black">Ga winkelen</Link>
                </div>
              ) : orders.map(o => (
                <div key={o.id} className="order-row">
                  <div>
                    <div style={{ fontWeight:700, marginBottom:2 }}>Bestelling #{o.id}</div>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('nl-NL')} · €{Number(o.total).toFixed(2)}</div>
                    {o.items_summary && <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:2 }}>{o.items_summary}</div>}
                  </div>
                  <span className={`order-status status-${o.status}`}>{statusLabel[o.status] || o.status}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'profile' && (
            <div>
              <h2 style={{ fontWeight:700, marginBottom:'1.25rem' }}>Profiel</h2>
              <p style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>
                <strong>{user.first_name} {user.last_name}</strong><br/>{user.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
