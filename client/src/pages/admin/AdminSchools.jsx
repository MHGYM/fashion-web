import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, RefreshCw, KeyRound, ExternalLink } from 'lucide-react'
import api from '../../api'

const eur = n => `€${Number(n || 0).toFixed(2)}`

export default function AdminSchools() {
  const [schools, setSchools] = useState(null)
  const [modal, setModal]     = useState(null)   // null | 'new' | school-object
  const [loginFor, setLoginFor] = useState(null) // school-object

  const load = useCallback(() => {
    api.get('/schools/admin').then(r => setSchools(r.data)).catch(() => setSchools([]))
  }, [])
  useEffect(load, [])

  const deactivate = async (s) => {
    if (!confirm(`School "${s.name}" deactiveren? De shop is dan niet meer bereikbaar.`)) return
    await api.delete(`/schools/${s.id}`)
    load()
  }

  const hardDelete = async (s) => {
    if (!confirm(`School "${s.name}" DEFINITIEF verwijderen?\n\nDit kan alleen als de school geen bestellingen heeft. Producten worden losgekoppeld, school-logins worden gewone klantaccounts en kortingscodes verdwijnen.\n\nDit kan niet ongedaan worden gemaakt.`)) return
    try {
      await api.delete(`/schools/${s.id}?hard=1`)
      load()
    } catch (e) { alert(e.response?.data?.error || 'Verwijderen mislukt.') }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Scholen</h1>
        <button className="btn btn-black" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }} onClick={() => setModal('new')}>
          <Plus size={15}/> Nieuwe school
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {['School', 'Shop', 'Commissie %', 'Orders', 'Omzet', 'Commissie €', 'Laatste order', 'Status', 'Acties'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(schools || []).map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: s.primary_color || '#111', overflow: 'hidden', flexShrink: 0 }}>
                      {s.logo_url && <img src={s.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      {s.contact_email && <div style={{ fontSize: '0.72rem', color: '#aaa' }}>{s.contact_email}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <a href={`/s/${s.slug}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontSize: '0.8rem' }}>
                    /s/{s.slug} <ExternalLink size={11}/>
                  </a>
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{s.commission_pct}%</td>
                <td style={{ padding: '10px 14px' }}>{s.paid_orders}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{eur(s.revenue)}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>{eur(s.commission)}</td>
                <td style={{ padding: '10px 14px', color: '#888', fontSize: '0.8rem' }}>
                  {s.last_order_at ? new Date(s.last_order_at).toLocaleDateString('nl-NL') : 'nog geen'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {s.active
                    ? <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e', background: '#dcfce7', padding: '3px 8px', borderRadius: 100 }}>Actief</span>
                    : <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '3px 8px', borderRadius: 100 }}>Inactief</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <IconBtn title="Bewerken" onClick={() => setModal(s)}><Pencil size={13}/></IconBtn>
                    <IconBtn title="School-login aanmaken" onClick={() => setLoginFor(s)}><KeyRound size={13}/></IconBtn>
                    {s.active
                      ? <IconBtn title="Deactiveren" danger onClick={() => deactivate(s)}><Trash2 size={13}/></IconBtn>
                      : <IconBtn title="Definitief verwijderen (alleen zonder bestellingen)" danger onClick={() => hardDelete(s)}><X size={13}/></IconBtn>}
                  </div>
                </td>
              </tr>
            ))}
            {schools && schools.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>Nog geen scholen — voeg de eerste toe</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <SchoolModal school={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>}
      {loginFor && <LoginModal school={loginFor} onClose={() => setLoginFor(null)}/>}
    </div>
  )
}

function SchoolModal({ school, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: school?.name || '', tagline: school?.tagline || '',
    slug: school?.slug || '',
    logo_url: school?.logo_url || '', hero_image: school?.hero_image || '',
    primary_color: school?.primary_color || '#111111',
    contact_email: school?.contact_email || '',
    commission_pct: school?.commission_pct ?? 15,
    iban: school?.iban || '',
    active: school ? !!school.active : true,
    admin_email: '', admin_password: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return alert('Naam is verplicht.')
    if (form.slug && !/^[a-z0-9-]{2,80}$/.test(form.slug)) return alert('Slug mag alleen kleine letters, cijfers en streepjes bevatten.')
    setSaving(true)
    try {
      // Slug alleen meesturen als ingevuld (en bij bewerken: als gewijzigd)
      const payload = { ...form }
      if (!payload.slug || (school && payload.slug === school.slug)) delete payload.slug
      if (school) await api.put(`/schools/${school.id}`, payload)
      else        await api.post('/schools', payload)
      onSaved()
    } catch (e) { alert(e.response?.data?.error || 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={school ? 'School bewerken' : 'Nieuwe school'} onClose={onClose} onSave={save} saving={saving}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Naam *"><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="MH Gym"/></Field>
        <Field label="Contact e-mail"><input className="input" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="info@school.nl"/></Field>
      </div>
      <Field label={school ? 'Shop-slug (/s/…) — wijzigen breekt oude links' : 'Shop-slug (/s/…) — leeg = automatisch uit de naam'}>
        <input className="input" value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase())} placeholder="mh-gym"/>
      </Field>
      <Field label="Tagline"><input className="input" value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Kickboksen & MMA in Amsterdam"/></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Logo URL"><input className="input" value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="/uploads/logo.png"/></Field>
        <Field label="Hero-afbeelding URL"><input className="input" value={form.hero_image} onChange={e => set('hero_image', e.target.value)} placeholder="/uploads/hero.jpg"/></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <Field label="Clubkleur">
          <input type="color" className="input" value={form.primary_color} onChange={e => set('primary_color', e.target.value)} style={{ height: 40, padding: 4 }}/>
        </Field>
        <Field label="Commissie %"><input className="input" type="number" min="0" max="50" step="0.5" value={form.commission_pct} onChange={e => set('commission_pct', Number(e.target.value))}/></Field>
        <Field label="IBAN (uitbetaling)"><input className="input" value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="NL00BANK0123456789"/></Field>
      </div>
      {school && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 16, height: 16 }}/>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Actief (shop zichtbaar)</span>
        </label>
      )}
      {!school && (
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '1rem', marginTop: 4 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa', marginBottom: '0.75rem' }}>Direct een school-login aanmaken (optioneel)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Login e-mail"><input className="input" value={form.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="beheer@school.nl"/></Field>
            <Field label="Wachtwoord"><input className="input" type="text" value={form.admin_password} onChange={e => set('admin_password', e.target.value)} placeholder="Minimaal 8 tekens"/></Field>
          </div>
        </div>
      )}
    </Modal>
  )
}

function LoginModal({ school, onClose }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', first_name: school.name, last_name: 'Beheer' })

  const save = async () => {
    if (!form.email || !form.password) return alert('E-mail en wachtwoord zijn verplicht.')
    setSaving(true)
    try {
      await api.post(`/schools/${school.id}/login`, form)
      alert(`Login aangemaakt voor ${school.name}. Geef de inloggegevens door aan de school.`)
      onClose()
    } catch (e) { alert(e.response?.data?.error || 'Aanmaken mislukt.') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`School-login voor ${school.name}`} onClose={onClose} onSave={save} saving={saving} saveLabel="Aanmaken">
      <p style={{ fontSize: '0.82rem', color: '#888' }}>
        De school logt hiermee in en ziet het eigen dashboard: verkopen, commissie en kortingscodes.
      </p>
      <Field label="E-mail *"><input className="input" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="beheer@school.nl"/></Field>
      <Field label="Wachtwoord *"><input className="input" type="text" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Minimaal 8 tekens"/></Field>
    </Modal>
  )
}

// ── Gedeelde mini-componenten ─────────────────────────────────────────────────
export function Modal({ title, children, onClose, onSave, saving, saveLabel = 'Opslaan' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 640, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4 }}><X size={20}/></button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid #eee' }}>
          <button onClick={onClose} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>Annuleren</button>
          <button onClick={onSave} className="btn btn-black" disabled={saving} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }}/> Bezig…</> : saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="label" style={{ fontSize: '0.75rem' }}>{label}</label>
      {children}
    </div>
  )
}

export function IconBtn({ children, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title}
      style={{ padding: '6px 10px', border: `1px solid ${danger ? '#fee2e2' : '#e0e0e0'}`, borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', color: danger ? '#ef4444' : '#444' }}>
      {children}
    </button>
  )
}
