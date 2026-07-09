import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Printer } from 'lucide-react'
import api from '../../api'
import { Modal, Field, IconBtn } from './AdminSchools'

const fmtDate = d => d ? new Date(d).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
// datetime-local input value <-> ISO
const toLocal = d => d ? new Date(new Date(d).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''

export default function AdminDrops() {
  const [drops, setDrops] = useState(null)
  const [modal, setModal] = useState(null)      // null | 'new' | drop
  const [production, setProduction] = useState(null) // { drop, rows }

  const load = useCallback(() => {
    api.get('/drops').then(r => setDrops(r.data)).catch(() => setDrops([]))
  }, [])
  useEffect(load, [])

  const remove = async (d) => {
    if (!confirm(`Drop "${d.name}" verwijderen? Producten worden losgekoppeld.`)) return
    await api.delete(`/drops/${d.id}`)
    load()
  }

  const showProduction = async (d) => {
    const r = await api.get(`/drops/${d.id}/production`)
    setProduction({ drop: d, rows: r.data })
  }

  const isOpen = d => {
    const now = new Date()
    if (!d.active) return false
    if (d.opens_at  && new Date(d.opens_at)  > now) return false
    if (d.closes_at && new Date(d.closes_at) < now) return false
    return true
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Drops (seizoenscollecties)</h1>
        <button className="btn btn-black" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }} onClick={() => setModal('new')}>
          <Plus size={15}/> Nieuwe drop
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {['Drop', 'Seizoen', 'Opent', 'Sluit', 'Producten', 'Betaalde orders', 'Status', 'Acties'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(drops || []).map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{d.name}</td>
                <td style={{ padding: '10px 14px', color: '#888' }}>{d.season || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: '0.8rem' }}>{fmtDate(d.opens_at)}</td>
                <td style={{ padding: '10px 14px', fontSize: '0.8rem' }}>{fmtDate(d.closes_at)}</td>
                <td style={{ padding: '10px 14px' }}>{d.product_count}</td>
                <td style={{ padding: '10px 14px' }}>{d.paid_orders}</td>
                <td style={{ padding: '10px 14px' }}>
                  {isOpen(d)
                    ? <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e', background: '#dcfce7', padding: '3px 8px', borderRadius: 100 }}>Open</span>
                    : <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 100 }}>Gesloten</span>}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <IconBtn title="Productielijst" onClick={() => showProduction(d)}><Printer size={13}/></IconBtn>
                    <IconBtn title="Bewerken" onClick={() => setModal(d)}><Pencil size={13}/></IconBtn>
                    <IconBtn title="Verwijderen" danger onClick={() => remove(d)}><Trash2 size={13}/></IconBtn>
                  </div>
                </td>
              </tr>
            ))}
            {drops && drops.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>Nog geen drops — maak de eerste seizoenscollectie aan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <DropModal drop={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>}

      {production && (
        <Modal title={`Productielijst — ${production.drop.name}`} onClose={() => setProduction(null)} onSave={() => window.print()} saveLabel="Afdrukken">
          <p style={{ fontSize: '0.8rem', color: '#888' }}>Aantallen per product/maat uit betaalde bestellingen. Dit is wat er geproduceerd moet worden.</p>
          {production.rows.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  {['Product', 'Maat', 'School', 'Aantal'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {production.rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '8px 10px' }}>{r.size}</td>
                    <td style={{ padding: '8px 10px', color: '#888' }}>{r.school_name || '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 800 }}>{r.quantity}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#aaa', fontSize: '0.85rem' }}>Nog geen betaalde bestellingen in deze drop.</p>}
        </Modal>
      )}
    </div>
  )
}

function DropModal({ drop, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: drop?.name || '', season: drop?.season || '',
    opens_at: toLocal(drop?.opens_at), closes_at: toLocal(drop?.closes_at),
    active: drop ? !!drop.active : true,
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return alert('Naam is verplicht.')
    setSaving(true)
    const payload = {
      ...form,
      opens_at:  form.opens_at  ? new Date(form.opens_at).toISOString()  : null,
      closes_at: form.closes_at ? new Date(form.closes_at).toISOString() : null,
    }
    try {
      if (drop) await api.put(`/drops/${drop.id}`, payload)
      else      await api.post('/drops', payload)
      onSaved()
    } catch (e) { alert(e.response?.data?.error || 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={drop ? 'Drop bewerken' : 'Nieuwe drop'} onClose={onClose} onSave={save} saving={saving}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Naam *"><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Herfstdrop 2026"/></Field>
        <Field label="Seizoen"><input className="input" value={form.season} onChange={e => set('season', e.target.value)} placeholder="Herfst 2026"/></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Bestelvenster opent"><input className="input" type="datetime-local" value={form.opens_at} onChange={e => set('opens_at', e.target.value)}/></Field>
        <Field label="Bestelvenster sluit"><input className="input" type="datetime-local" value={form.closes_at} onChange={e => set('closes_at', e.target.value)}/></Field>
      </div>
      {drop && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} style={{ width: 16, height: 16 }}/>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Actief</span>
        </label>
      )}
      <p style={{ fontSize: '0.75rem', color: '#aaa' }}>
        Koppel producten aan deze drop via Producten → product bewerken. De countdown verschijnt automatisch op alle clubshops.
      </p>
    </Modal>
  )
}
