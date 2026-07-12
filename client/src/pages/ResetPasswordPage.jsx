import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import usePageTitle from '../hooks/usePageTitle'

export default function ResetPasswordPage() {
  usePageTitle('Nieuw wachtwoord instellen')
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8)   return setError('Wachtwoord moet minimaal 8 tekens zijn.')
    if (password !== confirm)  return setError('Wachtwoorden komen niet overeen.')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Er ging iets mis. Probeer het opnieuw.')
    } finally { setLoading(false) }
  }

  if (!token) return (
    <div className="auth-page">
      <div className="auth-box">
        <h2>Link ongeldig</h2>
        <p>Deze pagina werkt alleen via de resetlink uit je e-mail.</p>
        <Link to="/login" className="btn btn-black btn-full">Naar inloggen</Link>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-box">
        {done ? (
          <>
            <h2>Wachtwoord gewijzigd ✓</h2>
            <p>Je kunt nu inloggen met je nieuwe wachtwoord.</p>
            <Link to="/login" className="btn btn-black btn-full">Inloggen</Link>
          </>
        ) : (
          <>
            <h2>Nieuw wachtwoord</h2>
            <p>Kies een nieuw wachtwoord van minimaal 8 tekens.</p>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="label" htmlFor="pw">Nieuw wachtwoord</label>
                <input id="pw" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoFocus/>
              </div>
              <div className="form-group">
                <label className="label" htmlFor="pw2">Herhaal wachtwoord</label>
                <input id="pw2" className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}/>
              </div>
              {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
              <button className="btn btn-black btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Bezig…' : 'Wachtwoord opslaan'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
