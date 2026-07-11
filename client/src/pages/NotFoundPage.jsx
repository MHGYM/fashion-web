import { Link } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Pagina niet gevonden')
  return (
    <div style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
      <div style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-0.04em', opacity: 0.12 }}>404</div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Pagina niet gevonden</h1>
      <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Deze pagina bestaat niet (meer). Check het adres of ga terug naar de shop.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="btn btn-black">Naar home</Link>
        <Link to="/scholen" className="btn btn-outline">Bekijk scholen</Link>
      </div>
    </div>
  )
}
