import { useState } from 'react'
import { Ruler, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Uitklapbaar maatadvies voor bokshandschoenen.
 * Wordt alleen getoond bij producten in de categorie "Handschoenen".
 */
const OZ_SIZES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

const KIDS = [
  ['10–15 kg', '2–3 jaar', '2 OZ'],
  ['16–26 kg', '3–5 jaar', '4 OZ'],
  ['27–32 kg', '5–9 jaar', '6 OZ'],
  ['32–40 kg', '9–11 jaar', '8 OZ'],
]
const WOMEN = [
  ['45–60 kg', '10 OZ'],
  ['60–70 kg', '12 OZ'],
  ['70–80 kg', '14 OZ'],
  ['80–100 kg', '16 OZ'],
]
const MEN = [
  ['tot 65 kg', '12 OZ'],
  ['65–80 kg', '14 OZ'],
  ['80–110 kg', '16 OZ'],
  ['vanaf 110 kg', '18 OZ'],
]

const th = { padding: '8px 10px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }
const td = { padding: '8px 10px', fontSize: '0.85rem', borderBottom: '1px solid #f3f2f0' }
const ozTd = { ...td, fontWeight: 800 }

function GuideTable({ title, headers, rows }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{headers.map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => <td key={j} style={j === r.length - 1 ? ozTd : td}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SizeGuideGloves() {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, marginBottom: '1.5rem', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '14px 16px', background: 'var(--bg2)', border: 'none', cursor: 'pointer', minHeight: 48 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem' }}>
          <Ruler size={16}/> Maatadvies bekijken
        </span>
        {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>

      {open && (
        <div style={{ padding: '1.25rem 1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Bokshandschoenen worden gemeten in <strong>OZ</strong> (ounce — 28,35 gram):
            dat is het gewicht van de handschoen. De maten lopen in stappen van 2 OZ.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1.25rem' }}>
            {OZ_SIZES.map(oz => (
              <span key={oz} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                {oz} OZ
              </span>
            ))}
          </div>

          <GuideTable title="Kinderen" headers={['Gewicht', 'Leeftijd', 'Maat']} rows={KIDS}/>
          <GuideTable title="Dames" headers={['Gewicht', 'Maat']} rows={WOMEN}/>
          <GuideTable title="Heren" headers={['Gewicht', 'Maat']} rows={MEN}/>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6, background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
            Per merk/model kan de pasvorm verschillen — twijfel je?{' '}
            <a href="mailto:info@fightmarketing.nl?subject=Maatadvies%20bokshandschoenen" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Neem contact op
            </a>{' '}voor persoonlijk maatadvies.
          </p>
        </div>
      )}
    </div>
  )
}
