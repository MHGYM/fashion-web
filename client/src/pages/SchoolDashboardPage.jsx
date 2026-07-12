import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, ExternalLink } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import usePageTitle from '../hooks/usePageTitle'

const eur = n => `€${Number(n || 0).toFixed(2)}`

export default function SchoolDashboardPage() {
  usePageTitle('Clubdashboard')
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [data, setData]   = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'school' && user.role !== 'admin'))) navigate('/')
  }, [user, authLoading])

  const load = useCallback(() => {
    api.get('/schools/dashboard/me')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Kon dashboard niet laden.'))
  }, [])

  useEffect(() => { if (user && (user.role === 'school' || user.role === 'admin')) load() }, [user])

  if (error) return <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>{error}</div>
  if (!data)  return <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>Laden…</div>

  const { school, totals, recent_orders, top_products, codes, monthly } = data
  const color = school.primary_color || '#111'

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Kop */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#999' }}>Clubdashboard</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900 }}>{school.name}</h1>
        </div>
        <a href={`/s/${school.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
          <ExternalLink size={14}/> Bekijk jouw shop
        </a>
      </div>

      {/* Statistieken */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Omzet via jouw shop', value: eur(totals.revenue),            sub: 'betaalde bestellingen' },
          { label: 'Bestellingen',        value: totals.orders,                  sub: 'betaald' },
          { label: 'Jouw commissie',      value: eur(totals.commission),         sub: `${school.commission_pct}% van omzet (ex btw)`, highlight: true },
          { label: 'Vechterscommissie',   value: eur(totals.fighter_commission), sub: 'via kortingscodes' },
        ].map(({ label, value, sub, highlight }) => (
          <div key={label} style={{ background: highlight ? color : '#fff', color: highlight ? '#fff' : '#000', border: '1px solid #eee', borderRadius: 8, padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, opacity: highlight ? 0.8 : 0.55 }}>{label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', marginTop: 4, opacity: highlight ? 0.7 : 0.45 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Per maand */}
        <Panel title="Per maand">
          <SimpleTable
            headers={['Maand', 'Orders', 'Omzet', 'Commissie']}
            rows={monthly.map(m => [m.month, m.orders, eur(m.revenue), <strong key="c">{eur(m.commission)}</strong>])}
            empty="Nog geen betaalde bestellingen"/>
        </Panel>

        {/* Best verkocht */}
        <Panel title="Best verkocht">
          <SimpleTable
            headers={['Product', 'Maat', 'Verkocht', 'Omzet']}
            rows={top_products.slice(0, 10).map(p => [p.name, p.size, p.sold, eur(p.revenue)])}
            empty="Nog geen verkopen"/>
        </Panel>
      </div>

      {/* Recente bestellingen (geanonimiseerd) */}
      <Panel title="Recente bestellingen" style={{ marginBottom: '2.5rem' }}>
        <SimpleTable
          headers={['#', 'Datum', 'Totaal', 'Code', 'Jouw commissie', 'Status']}
          rows={recent_orders.map(o => [
            `#${o.id}`,
            new Date(o.created_at).toLocaleDateString('nl-NL'),
            eur(o.total),
            o.discount_code || '—',
            <strong key="c">{eur(o.school_commission)}</strong>,
            o.status,
          ])}
          empty="Nog geen betaalde bestellingen"/>
        <p style={{ fontSize: '0.72rem', color: '#aaa', padding: '0.75rem 1.25rem' }}>
          Klantgegevens zijn niet zichtbaar (privacywetgeving) — verzending en klantenservice regelt FightMarketing.
        </p>
      </Panel>

      {/* Kortingscodes / vechters */}
      <CodesPanel codes={codes} onChanged={load}/>

      {/* Centrale catalogus: kies wat er in jouw shop staat */}
      <AssortmentPanel/>
    </div>
  )
}

const eurOrSale = (p) => p.sale_price
  ? <><span style={{ color:'#dc2626', fontWeight:700 }}>{eur(p.sale_price)}</span> <s style={{ color:'#aaa', fontSize:'0.78rem' }}>{eur(p.price)}</s></>
  : <span style={{ fontWeight:700 }}>{eur(p.price)}</span>

function AssortmentPanel() {
  const [items, setItems] = useState(null)
  const [busy, setBusy]   = useState(null)

  const load = useCallback(() => {
    api.get('/schools/assortment/me').then(r => setItems(r.data)).catch(() => setItems([]))
  }, [])
  useEffect(load, [])

  const toggle = async (p) => {
    setBusy(p.id)
    try {
      await api.put(`/schools/assortment/me/${p.id}`, { active: !p.enabled })
      await load()
    } catch (e) { alert(e.response?.data?.error || 'Aanpassen mislukt.') }
    finally { setBusy(null) }
  }

  return (
    <Panel title="Extra assortiment in jouw shop" style={{ marginTop: '2.5rem' }}>
      <p style={{ fontSize: '0.78rem', color: '#888', padding: '0.9rem 1.25rem 0', lineHeight: 1.6 }}>
        Producten uit de centrale FightMarketing-catalogus. Zet aan wat jij in jouw
        clubshop wilt verkopen — jouw eigen clubcollectie staat er altijd in.
      </p>
      {items === null ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.85rem' }} role="status">Laden…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.85rem' }}>De centrale catalogus is nog leeg.</div>
      ) : (
        <div style={{ padding: '0.5rem 0' }}>
          {items.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 1.25rem', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ width: 40, height: 50, borderRadius: 6, overflow: 'hidden', background: '#f5f5f5', flexShrink: 0 }}>
                {p.image && <img src={p.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#999' }}>{p.category_name || '—'} · {eurOrSale(p)}</div>
              </div>
              <button onClick={() => toggle(p)} disabled={busy === p.id}
                aria-pressed={!!p.enabled}
                style={{ padding: '7px 14px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', minWidth: 96,
                  border: '1.5px solid', borderColor: p.enabled ? '#16a34a' : '#ddd',
                  background: p.enabled ? '#dcfce7' : '#fff', color: p.enabled ? '#16a34a' : '#888' }}>
                {busy === p.id ? '…' : p.enabled ? '✓ In shop' : 'Niet in shop'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

function CodesPanel({ codes, onChanged }) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({ code: '', fighter_name: '', discount_pct: 10, commission_pct: 5 })

  const save = async () => {
    if (!form.code.trim()) return alert('Vul een code in.')
    setSaving(true)
    try {
      await api.post('/discounts', form)
      setForm({ code: '', fighter_name: '', discount_pct: 10, commission_pct: 5 })
      setShowForm(false)
      onChanged()
    } catch (e) { alert(e.response?.data?.error || 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }

  return (
    <Panel title="Kortingscodes van jouw vechters"
      action={
        <button className="btn btn-black" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowForm(v => !v)}>
          <Plus size={14}/> Nieuwe code
        </button>
      }>
      {showForm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0.75rem', padding: '1rem 1.25rem', background: '#fafafa', borderBottom: '1px solid #eee', alignItems: 'end' }}>
          <div>
            <label className="label" style={{ fontSize: '0.72rem' }}>Code</label>
            <input className="input" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} placeholder="MO10"/>
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.72rem' }}>Vechter</label>
            <input className="input" value={form.fighter_name} onChange={e => setForm(f => ({...f, fighter_name: e.target.value}))} placeholder="Naam vechter"/>
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.72rem' }}>Korting %</label>
            <input className="input" type="number" min="0" max="50" value={form.discount_pct} onChange={e => setForm(f => ({...f, discount_pct: Number(e.target.value)}))}/>
          </div>
          <div>
            <label className="label" style={{ fontSize: '0.72rem' }}>Commissie %</label>
            <input className="input" type="number" min="0" max="25" value={form.commission_pct} onChange={e => setForm(f => ({...f, commission_pct: Number(e.target.value)}))}/>
          </div>
          <button className="btn btn-black" disabled={saving} onClick={save} style={{ fontSize: '0.82rem' }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> : 'Opslaan'}
          </button>
        </div>
      )}
      <SimpleTable
        headers={['Code', 'Vechter', 'Korting', 'Commissie', 'Gebruikt', 'Verdiend', 'Status']}
        rows={codes.map(c => [
          <strong key="k">{c.code}</strong>,
          c.fighter_name || '—',
          `${c.discount_pct}%`,
          `${c.commission_pct}%`,
          c.times_used,
          eur(c.earned),
          c.active ? 'Actief' : 'Inactief',
        ])}
        empty="Nog geen codes — maak er één aan voor je vechters"/>
    </Panel>
  )
}

function Panel({ title, action, children, style }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', ...style }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}{action}
      </div>
      {children}
    </div>
  )
}

function SimpleTable({ headers, rows, empty }) {
  if (!rows.length) return <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aaa', fontSize: '0.85rem' }}>{empty}</div>
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #eee' }}>
          {headers.map(h => <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
            {r.map((c, j) => <td key={j} style={{ padding: '9px 14px' }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
