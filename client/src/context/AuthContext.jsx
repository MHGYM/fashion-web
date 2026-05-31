import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const Ctx = createContext()
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('sf_token')
    if (t) api.get('/auth/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('sf_token')).finally(() => setLoading(false))
    else setLoading(false)
  }, [])

  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    localStorage.setItem('sf_token', r.data.token)
    setUser(r.data.user)
    return r.data.user
  }

  const register = async (data) => {
    const r = await api.post('/auth/register', data)
    localStorage.setItem('sf_token', r.data.token)
    setUser(r.data.user)
    return r.data.user
  }

  const logout = () => { localStorage.removeItem('sf_token'); setUser(null) }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}
