import { useState, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'
import api from '../../api'
import { IconBtn } from './AdminSchools'

const eur = n => `€${Number(n || 0).toFixed(2)}`
const thisMonth = () => new Date().toISOString().slice(0, 7)

/** Download een CSV via axios (met auth-header) en trigger een browser-download. */
async function downloadCsv(month, schoolId) {
  const params = new URLSearchParams({ month })
  if (schoolId) params.set('school_id', schoolId)
  const r = await api.get(`/schools/admin/payouts/export?${params}`, { responseType: 'blob' })
  const url = URL.createObjectURL(r.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `uitbetalingen-${month}${schoolId ? `-school-${schoolId}` : ''}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function AdminPayouts() {
  const [month, setMonth] = useState(thisMonth())
  const [data, setData]   = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setData(null); setError('')
    api.get(`/schools/admin/payouts?month=${month}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Kon uitbetalingen niet laden.'))
  }, [month])
  useEffect(load, [month])

  const rows = data?.rows || []
  const totals = rows.reduce((t, r) => ({
    orders: t.orders + Number(r.orders),
    revenue: t.revenue + Number(r.revenue),
    school: t.school + Number(r.school_commission),
    fighter: t.fighter + Number(r.fighter_commission),
  }), { orders: 0, revenue: 0, school: 0, fighter: 0 })

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 900 }}>Uitbetalingen</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ fontSize: '0.85rem', width: 170 }} aria-label="Maand"/>
          <button className="btn btn-black" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
            onClick={() => downloadCsv(month).catch(() => alert('Export mislukt.'))}>
            <Download size={14}/> Alles exporteren (CSV)
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1.25rem' }}>
        Commissies over betaalde bestellingen in de gekozen maand (op basis van betaaldatum;
        geannuleerde bestellingen tellen niet mee). Uit te betalen = schoolcommissie + vechterscommissie.
      </p>

      {error && <div style={{ padding: '1rem', color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>}
      {!data && !error && <div style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }} role="status">Laden…</div>}

      {data && (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                {['School', 'IBAN', 'Orders', 'Omzet', 'Schoolcommissie', 'Vechterscommissie', 'Uit te betalen', 'Export'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.school_id} style={{ borderBottom: '1px solid #f5f5f5', opacity: r.active ? 1 : 0.5 }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.school_name}{!r.active && <span style={{ fontSize: '0.68rem', color: '#aaa' }}> (inactief)</span>}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: r.iban ? '#444' : '#dc2626' }}>{r.iban || 'IBAN ontbreekt'}</td>
                  <td style={{ padding: '10px 14px' }}>{r.orders}</td>
                  <td style={{ padding: '10px 14px' }}>{eur(r.revenue)}</td>
                  <td style={{ padding: '10px 14px' }}>{eur(r.school_commission)}</td>
                  <td style={{ padding: '10px 14px' }}>{eur(r.fighter_commission)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#16a34a' }}>{eur(Number(r.school_commission) + Number(r.fighter_commission))}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <IconBtn title={`CSV voor ${r.school_name}`} onClick={() => downloadCsv(month, r.school_id).catch(() => alert('Export mislukt.'))}>
                      <Download size={13}/>
                    </IconBtn>
                  </td>
                </tr>
              ))}
              {rows.length > 0 && (
                <tr style={{ background: '#fafafa', fontWeight: 800 }}>
                  <td style={{ padding: '10px 14px' }}>Totaal</td>
                  <td/>
                  <td style={{ padding: '10px 14px' }}>{totals.orders}</td>
                  <td style={{ padding: '10px 14px' }}>{eur(totals.revenue)}</td>
                  <td style={{ padding: '10px 14px' }}>{eur(totals.school)}</td>
                  <td style={{ padding: '10px 14px' }}>{eur(totals.fighter)}</td>
                  <td style={{ padding: '10px 14px', color: '#16a34a' }}>{eur(totals.school + totals.fighter)}</td>
                  <td/>
                </tr>
              )}
              {rows.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#aaa' }}>Geen scholen gevonden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
