import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Trash2, Pencil } from 'lucide-react'
import api from '../../api'
import { Modal, Field, IconBtn } from './AdminSchools'

const ROLE_NL = { admin: 'Platform-admin', school: 'School-admin' }

export default function AdminUsers() {
  const [users, setUsers]     = useState(null)
  const [schools, setSchools] = useState([])
  const [modal, setModal]     = useState(null) // user-object

  const load = useCallback(() => {
    api.get('/users/admin').then(r => setUsers(r.data)).catch(() => setUsers([]))
    api.get('/schools/admin').then(r => setSchools(r.data)).catch(() => {})
  }, [])
  useEffect(load, [])

  const remove = async (u) => {
    if (!confirm(`School-login "${u.email}" verwijderen? De school kan dan niet meer inloggen.`)) return
    try {
      await api.delete(`/users/admin/${u.id}`)
      load()
    } catch (e) { alert(e.response?.data?.error || 'Verwijderen mislukt.') }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Gebruikers</h1>
      </div>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1.25rem' }}>
        Alle school-logins en platform-admins. Nieuwe school-logins maak je aan via
        Scholen → sleutel-icoon. Platform-admins zijn hier niet aanpasbaar (veiligheid).
      </p>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              {['Gebruiker', 'Rol', 'School', 'Aangemaakt', 'Acties'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users || []).map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700 }}>{u.first_name} {u.last_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{u.email}</div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 100,
                    background: u.role === 'admin' ? '#111' : '#dbeafe', color: u.role === 'admin' ? '#fff' : '#1d4ed8' }}>
                    {ROLE_NL[u.role] || u.role}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>{u.school_name || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#888', fontSize: '0.8rem' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('nl-NL') : '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  {u.role === 'school' ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <IconBtn title="Bewerken / wachtwoord resetten" onClick={() => setModal(u)}><Pencil size={13}/></IconBtn>
                      <IconBtn title="School-login verwijderen" danger onClick={() => remove(u)}><Trash2 size={13}/></IconBtn>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#bbb' }}>beschermd</span>
                  )}
                </td>
              </tr>
            ))}
            {users && users.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>Nog geen beheerdersaccounts</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <UserModal user={modal} schools={schools} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }}/>}
    </div>
  )
}

function UserModal({ user, schools, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    role: user.role, school_id: user.school_id || '', password: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const generate = () => set('password', Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8).toUpperCase())

  const save = async () => {
    if (form.password && form.password.length < 8) return alert('Wachtwoord moet minimaal 8 tekens zijn.')
    if (form.role === 'school' && !form.school_id) return alert('Kies een school.')
    setSaving(true)
    try {
      const payload = { role: form.role, school_id: form.school_id ? Number(form.school_id) : null }
      if (form.password) payload.password = form.password
      await api.put(`/users/admin/${user.id}`, payload)
      if (form.password) alert(`Nieuw wachtwoord voor ${user.email}:\n\n${form.password}\n\nGeef dit door aan de school.`)
      onSaved()
    } catch (e) { alert(e.response?.data?.error || 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`${user.email} beheren`} onClose={onClose} onSave={save} saving={saving}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Field label="Rol">
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="school">School-admin</option>
            <option value="customer">Klant (rol intrekken)</option>
          </select>
        </Field>
        <Field label="School">
          <select className="input" value={form.school_id} onChange={e => set('school_id', e.target.value)} disabled={form.role !== 'school'}>
            <option value="">Kies school…</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Nieuw wachtwoord (leeg = niet wijzigen)">
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" type="text" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimaal 8 tekens"/>
          <button type="button" className="btn btn-outline" onClick={generate} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <KeyRound size={13}/> Genereer
          </button>
        </div>
      </Field>
      {form.role === 'customer' && (
        <p style={{ fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px' }}>
          Let op: dit account verliest de dashboard-toegang en wordt een gewoon klantaccount.
        </p>
      )}
    </Modal>
  )
}
