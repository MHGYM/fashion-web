import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

/** Wachtwoord-vergeten mini-formulier */
function ForgotForm({ onBack }) {
  const [mail, setMail]     = useState('')
  const [done, setDone]     = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await api.post('/auth/forgot-password', { email: mail }) } catch {}
    setDone(true); setLoading(false)
  }

  return (
    <>
      <h2>Wachtwoord vergeten</h2>
      {done ? (
        <>
          <p>Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een resetlink. Check ook je spam-map.</p>
          <button className="btn btn-black btn-full" onClick={onBack}>Terug naar inloggen</button>
        </>
      ) : (
        <>
          <p>Vul je e-mailadres in — je ontvangt een link om een nieuw wachtwoord in te stellen.</p>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="label" htmlFor="forgot-mail">E-mailadres</label>
              <input id="forgot-mail" className="input" type="email" value={mail} onChange={e => setMail(e.target.value)} required autoFocus/>
            </div>
            <button className="btn btn-black btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? 'Bezig…' : 'Stuur resetlink'}
            </button>
          </form>
          <div className="auth-footer">
            <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontWeight:600, fontSize:'0.85rem' }}>← Terug naar inloggen</button>
          </div>
        </>
      )}
    </>
  )
}

export default function AuthPage({ mode }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const isLogin = mode === 'login'

  const [form, setForm] = useState({ email:'', password:'', first_name:'', last_name:'', phone:'' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [forgot,  setForgot]  = useState(false)
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

  if (isLogin && forgot) return (
    <div className="auth-page">
      <div className="auth-box">
        <ForgotForm onBack={() => setForgot(false)}/>
      </div>
    </div>
  )

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
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <label className="label">Wachtwoord</label>
              {isLogin && (
                <button type="button" onClick={() => setForgot(true)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:'0.8rem', fontWeight:600, padding:0 }}>
                  Wachtwoord vergeten?
                </button>
              )}
            </div>
            <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={isLogin ? 6 : 8}/>
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
