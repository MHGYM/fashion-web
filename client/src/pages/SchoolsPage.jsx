import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import api from '../api'
import usePageTitle from '../hooks/usePageTitle'

export default function SchoolsPage() {
  usePageTitle('Aangesloten scholen')
  const navigate = useNavigate()
  const [schools, setSchools] = useState(null)

  useEffect(() => {
    api.get('/schools').then(r => setSchools(r.data)).catch(() => setSchools([]))
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#999', marginBottom: 8 }}>FightMarketing — Fight Gear Platform</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 10 }}>Aangesloten scholen</h1>
        <p style={{ color: 'var(--text-muted, #777)', maxWidth: 560, margin: '0 auto' }}>
          FightMarketing is hét overkoepelende platform voor vechtsportscholen in Nederland.
          Elke aangesloten school heeft een eigen clubshop met exclusieve gear — en verdient
          commissie over elke verkoop. Steun jouw school met elke aankoop.
        </p>
      </div>

      {schools === null ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }} role="status">Laden…</div>
      ) : schools.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}>Nog geen scholen aangesloten.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '1.5rem' }}>
          {schools.map(s => (
            <div key={s.id} onClick={() => navigate(`/s/${s.slug}`)}
              style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '1px solid #eee', background: '#fff', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ height: 140, background: s.hero_image ? `url(${s.hero_image}) center/cover` : (s.primary_color || '#111'), position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }}/>
                <div style={{ position: 'absolute', bottom: -26, left: 20, width: 52, height: 52, borderRadius: '50%', background: '#fff', border: '3px solid #fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <Shield size={24} color={s.primary_color || '#111'}/>}
                </div>
              </div>
              <div style={{ padding: '2.2rem 1.25rem 1.25rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{s.name}</div>
                {s.tagline && <div style={{ fontSize: '0.82rem', color: '#888', marginTop: 4 }}>{s.tagline}</div>}
                <div style={{ marginTop: 12, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: s.primary_color || '#111' }}>
                  Bekijk clubshop →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA: school aansluiten */}
      <div style={{ marginTop: '4rem', textAlign: 'center', background: '#0a0a0a', color: '#fff', borderRadius: 12, padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>Voor scholen</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 10 }}>Ook jouw school op FightMarketing?</h2>
        <p style={{ opacity: 0.75, maxWidth: 480, margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
          Eigen clubshop in jouw clubkleuren, merchandise per seizoensdrop, kortingscodes
          voor je vechters — en commissie over elke verkoop. Zonder gedoe: wij regelen
          productie, betalingen, verzending en klantenservice.
        </p>
        <a href="mailto:info@fightmarketing.nl?subject=School%20aansluiten%20bij%20FightMarketing" className="btn" style={{ background: '#fff', color: '#000', fontWeight: 700, padding: '0.75rem 1.75rem', borderRadius: 8, display: 'inline-block' }}>
          Sluit je aan → info@fightmarketing.nl
        </a>
      </div>
    </div>
  )
}
