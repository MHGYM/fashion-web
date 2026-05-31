import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthPage({ mode }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const isLogin = mode === 'login'

  const [form, setForm] = useState({ email:'', password:'', first_name:'', last_name:'', phone:'' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (isLogin) await login(form.email, form.password)
      else await register(form)
      navigate('/')
    } catch(e) {
      setError(e.response?.data?.error || 'Er is iets misgegaan.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2>{isLogin ? 'Welkom terug' : 'Account aanmaken'}</h2>
        <p>{isLogin ? 'Log in om je bestellingen te bekijken.' : 'Maak een account voor sneller bestellen.'}</p>
        <form onSubmit={submit}>
          {!isLogin && (
            <div className="form-row" style={{ marginBottom:'1rem' }}>
              <div>
                <label className="label">Voornaam</label>
                <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required/>
              </div>
              <div>
                <label className="label">Achternaam</label>
                <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required/>
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="label">E-mailadres</label>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} required/>
          </div>
          <div className="form-group">
            <label className="label">Wachtwoord</label>
            <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6}/>
          </div>
          {error && <p style={{ color:'var(--error)', fontSize:'0.85rem', marginBottom:'1rem' }}>{error}</p>}
          <button className="btn btn-black btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? 'Bezig…' : isLogin ? 'Inloggen' : 'Account aanmaken'}
          </button>
        </form>
        <div className="auth-footer">
          {isLogin ? <>Nog geen account? <Link to="/register">Registreren</Link></> : <>Al een account? <Link to="/login">Inloggen</Link></>}
        </div>
      </div>
    </div>
  )
}
