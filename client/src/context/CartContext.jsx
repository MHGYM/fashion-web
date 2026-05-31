import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from './AuthContext'

const Ctx = createContext()
export const useCart = () => useContext(Ctx)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCart = async () => {
    if (!user) { setItems([]); return }
    try {
      const r = await api.get('/cart')
      setItems(r.data)
    } catch {}
  }

  useEffect(() => { fetchCart() }, [user])

  const addToCart = async (variant_id, quantity = 1) => {
    await api.post('/cart', { variant_id, quantity })
    fetchCart()
  }

  const updateItem = async (id, quantity) => {
    await api.put(`/cart/${id}`, { quantity })
    fetchCart()
  }

  const removeItem = async (id) => {
    await api.delete(`/cart/${id}`)
    fetchCart()
  }

  const count = items.reduce((s, i) => s + i.quantity, 0)
  const total = items.reduce((s, i) => s + (i.sale_price || i.price) * i.quantity, 0)

  return <Ctx.Provider value={{ items, count, total, loading, addToCart, updateItem, removeItem, fetchCart }}>{children}</Ctx.Provider>
}
