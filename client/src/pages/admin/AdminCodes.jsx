import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import api from '../../api'
import { Modal, Field, IconBtn } from './AdminSchools'

const eur = n => `€${Number(n || 0).toFixed(2)}`

export default function AdminCodes() {
  const [codes, setCodes]     = useState(null)
  const [schools, setSchools] = useState([])
  const [modal, setModal]     = useState(null)

  const load = useCallback(() => {
    api.get('/discounts').then(r => setCodes(r.data)).catch(() => setCodes([]))
    api.get('/schools/admin').then(r => setSchools(r.data)).catch(() => {})
  }, [])
  useEffect(load, [])

  const deactivate = async (c) => {
    if (!confirm(`Code "${c.code}" deactiveren?`)) return
    await api.delete(`/discounts/${c.id}`)
    load()
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Kortingscodes</h1>
        <button className="btn btn-black" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }} onClick={() => setModal('new')}>
          <Plus size={15}/> Nieuwe code
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {['Code', 'School', 'Vechter', 'Korting', 'Commissie', 'Gebruikt', 'Verdiend', 'Status', 'Acties'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(codes || []).map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '10px 14px', fontWeight: 800 }}>{c.code}</td>
                <td style={{ padding: '10px 14px' }}>{c.school_name || '—'}</td>
                <td style={{ padding: '10px 14px' }}>{c.fighter_name || '—'}</td>
                <td style={{ padding: '10px 14px' }}>{c.discount_pct}%</td>
                <td style={{ padding: '10px 14px' }}>{c.commission_pct}%</td>
                <td style={{ padding: '10px 14px' }}>{c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>{eur(c.earned)}</td>
                <td style={{ padding: '10px 14px' }}>
                  {c.active
                    ? <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e', background: '#dcfce7', padding: '3px 8px', borderRadius: 100 }}>Actief</span>
                    : <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '3px 8px', borderRadius: 100 }}>Inactief</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <IconBtn title="Bewerken" onClick={() => setModal(c)}><Pencil size={13}/></IconBtn>
                    <IconBtn title="Deactiveren" danger onClick={() => deactivate(c)}><Trash2 size={13}/></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {codes && codes.length === 0 && (
              <tr><td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>Nog geen kortingscodes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <CodeModal code={modal === 'new' ? null : modal} schools={schools} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>}
    </div>
  )
}

function CodeModal({ code, schools, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: code?.code || '', school_id: code?.school_id || '',
    fighter_name: code?.fighter_name || '',
    discount_pct: code?.discount_pct ?? 10, commission_pct: code?.commission_pct ?? 5,
    max_uses: code?.max_uses || '', active: code ? !!code.active : true,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    const payload = { ...form, max_uses: form.max_uses ? Number(form.max_uses) : null }
    try {
      if (code) await api.put(`/discounts/${code.id}`, payload)
      else      await api.post('/discounts', payload)
      onSaved()
    } catch (e) { alert(e.response?.data?.error || 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={code ? `Code ${code.code} bewerken` : 'Nieuwe kortingscode'} onClose={onClose} onSave={save} saving={saving}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Code *">
          <input className="input" value={form.code} disabled={!!code}
            onChange={e => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))} placeholder="MO10"/>
        </Field>
        <Field label="School *">
          <select className="input" value={form.school_id} onChange={e => set('school_id', e.target.value)}>
            <option value="">Kies school…</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Vechter / ambassadeur"><input className="input" value={form.fighter_name} onChange={e => set('fighter_name', e.target.value)} placeholder="Naam vechter"/></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <Field label="Korting % (klant)"><input className="input" type="number" min="0" max="50" value={form.discount_pct} onChange={e => set('discount_pct', Number(e.target.value))}/></Field>
        <Field label="Commissie % (vechter)"><input className="input" type="number" min="0" max="25" value={form.commission_pct} onChange={e => set('commission_pct', Number(e.target.value))}/></Field>
        <Field label="Max. gebruik (leeg = onbeperkt)"><input className="input" type="number" min="0" value={form.max_uses} onChange={e => set('max_uses', e.target.value)}/></Field>
      </div>
      {code && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 16, height: 16 }}/>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Actief</span>
        </label>
      )}
    </Modal>
  )
}
