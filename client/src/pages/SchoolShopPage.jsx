import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Shield, Clock } from 'lucide-react'
import api from '../api'
import ProductCard from '../components/ProductCard'
import usePageTitle from '../hooks/usePageTitle'

function Countdown({ closesAt }) {
  const [left, setLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const ms = new Date(closesAt) - new Date()
      if (ms <= 0) { setLeft('Gesloten'); return }
      const d = Math.floor(ms / 86400000)
      const h = Math.floor((ms % 86400000) / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      setLeft(d > 0 ? `${d}d ${h}u ${m}m` : `${h}u ${m}m`)
    }
    tick()
    const t = setInterval(tick, 30000)
    return () => clearInterval(t)
  }, [closesAt])
  return <span>{left}</span>
}

export default function SchoolShopPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [data, setData]   = useState(null)
  const [error, setError] = useState('')
  usePageTitle(data ? `Clubshop ${data.school.name}` : 'Clubshop')

  useEffect(() => {
    setData(null); setError('')
    api.get(`/schools/${slug}`)
      .then(r => {
        setData(r.data)
        // Onthoud de school zodat de bestelling aan hen wordt toegeschreven
        localStorage.setItem('sf_school', r.data.school.slug)
        localStorage.setItem('sf_school_name', r.data.school.name)
      })
      .catch(e => setError(e.response?.data?.error || 'School niet gevonden.'))
  }, [slug])

  if (error) return (
    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>{error}</p>
      <button className="btn btn-black" onClick={() => navigate('/scholen')}>Alle scholen</button>
    </div>
  )
  if (!data) return <div style={{ textAlign: 'center', padding: '5rem', color: '#aaa' }}>Laden…</div>

  const { school, drop, products } = data
  const color = school.primary_color || '#111'
  const clubProducts    = products.filter(p => p.school_id === school.id)
  const generalProducts = products.filter(p => p.school_id !== school.id)

  return (
    <div>
      {/* Hero in clubkleuren */}
      <div style={{ position: 'relative', minHeight: 260, background: school.hero_image ? `url(${school.hero_image}) center/cover` : color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>
        <div style={{ position: 'relative', textAlign: 'center', padding: '3rem 1rem', color: '#fff' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#fff', margin: '0 auto 1rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${color}` }}>
            {school.logo_url
              ? <img src={school.logo_url} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <Shield size={34} color={color}/>}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 6 }}>Officiële clubshop</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{school.name}</h1>
          {school.tagline && <p style={{ opacity: 0.85, marginTop: 8 }}>{school.tagline}</p>}
        </div>
      </div>

      {/* Drop-banner met countdown */}
      {drop && (
        <div style={{ background: color, color: '#fff', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Clock size={16}/>
          <span style={{ fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.82rem' }}>{drop.name}</span>
          {drop.closes_at && (
            <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>
              — bestelvenster sluit over <strong><Countdown closesAt={drop.closes_at}/></strong>
            </span>
          )}
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Clubcollectie */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 4 }}>Clubcollectie</h2>
          <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1.5rem' }}>
            Exclusieve {school.name}-gear. Met elke aankoop steun je direct de school.
          </p>
          {clubProducts.length ? (
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1.5rem' }}>
              {clubProducts.map(p => <ProductCard key={p.id} product={p}/>)}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa', background: '#fafafa', borderRadius: 8, fontSize: '0.9rem' }}>
              De clubcollectie voor dit seizoen komt binnenkort online.
            </div>
          )}
        </div>

        {/* Algemeen assortiment */}
        {generalProducts.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '1.5rem' }}>Meer uit de shop</h2>
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '1.5rem' }}>
              {generalProducts.map(p => <ProductCard key={p.id} product={p}/>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
