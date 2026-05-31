import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Package, ShoppingBag, Users, TrendingUp } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const STATUS_OPTS = ['pending','processing','shipped','delivered','cancelled']
const STATUS_NL   = { pending:'In behandeling', processing:'Verwerking', shipped:'Verzonden', delivered:'Afgeleverd', cancelled:'Geannuleerd' }

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]           = useState('dashboard')
  const [products, setProducts] = useState([])
  const [orders, setOrders]     = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats]       = useState(null)
  const [editProduct, setEditProduct] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { if (user && user.role !== 'admin') navigate('/') }, [user])

  useEffect(() => {
    api.get('/products?active=all').then(r => setProducts(r.data)).catch(()=>{})
    api.get('/products/categories').then(r => setCategories(r.data)).catch(()=>{})
    api.get('/orders/admin').then(r => setOrders(r.data)).catch(()=>{})
  }, [])

  useEffect(() => {
    if (orders.length) {
      const revenue = orders.filter(o => o.status !== 'cancelled').reduce((s,o) => s + Number(o.total), 0)
      setStats({ orders: orders.length, revenue, pending: orders.filter(o=>o.status==='pending').length })
    }
  }, [orders])

  const updateStatus = async (id, status) => {
    await api.put(`/orders/admin/${id}/status`, { status })
    setOrders(o => o.map(x => x.id===id ? {...x, status} : x))
  }

  const deleteProduct = async (id) => {
    if (!confirm('Product verwijderen?')) return
    await api.delete(`/products/${id}`)
    setProducts(p => p.filter(x => x.id !== id))
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="admin-page">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.6rem', fontWeight:800 }}>Admin — SummerFits</h1>
      </div>

      <div className="admin-tabs">
        {[['dashboard','📊 Dashboard'],['products','👕 Producten'],['orders','📦 Bestellingen']].map(([k,l]) => (
          <button key={k} className={`admin-tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Dashboard */}
      {tab === 'dashboard' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
            {[
              { icon:<TrendingUp size={24}/>, label:'Omzet', value: stats ? `€${stats.revenue.toFixed(2)}` : '—', color:'#FF6B35' },
              { icon:<ShoppingBag size={24}/>, label:'Bestellingen', value: orders.length, color:'#3b82f6' },
              { icon:<Package size={24}/>, label:'Openstaand', value: stats?.pending ?? 0, color:'#f59e0b' },
              { icon:<Users size={24}/>, label:'Producten', value: products.length, color:'#22c55e' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ background:'var(--bg2)', borderRadius:12, padding:'1.25rem', border:'1px solid var(--border)' }}>
                <div style={{ color, marginBottom:8 }}>{icon}</div>
                <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:'1.5rem', fontWeight:800 }}>{value}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontWeight:700, marginBottom:'1rem' }}>Laatste bestellingen</h3>
          <OrdersTable orders={orders.slice(0,5)} onStatus={updateStatus}/>
        </div>
      )}

      {/* Producten */}
      {tab === 'products' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
            <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowForm(true) }}>
              <Plus size={16}/> Nieuw product
            </button>
          </div>
          {showForm && (
            <ProductForm
              initial={editProduct}
              categories={categories}
              onSave={async (data) => {
                try {
                  if (editProduct) {
                    await api.put(`/products/${editProduct.id}`, data)
                    setProducts(p => p.map(x => x.id===editProduct.id ? {...x,...data} : x))
                  } else {
                    const r = await api.post('/products', data)
                    const refreshed = await api.get('/products')
                    setProducts(refreshed.data)
                  }
                  setShowForm(false); setEditProduct(null)
                } catch(e) { alert(e.response?.data?.error || 'Fout.') }
              }}
              onClose={() => { setShowForm(false); setEditProduct(null) }}
            />
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Categorie</th><th>Prijs</th><th>Sale</th><th>Acties</th></tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:600 }}>{p.name}</td>
                    <td style={{ color:'var(--text-muted)' }}>{p.category_name || '—'}</td>
                    <td>€{Number(p.price).toFixed(2)}</td>
                    <td>{p.sale_price ? <span style={{ color:'#dc2626', fontWeight:600 }}>€{Number(p.sale_price).toFixed(2)}</span> : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => { setEditProduct(p); setShowForm(true) }}><Edit2 size={14}/></button>
                        <button className="btn btn-sm" style={{ background:'#fee2e2', color:'#dc2626', border:'none' }} onClick={() => deleteProduct(p.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bestellingen */}
      {tab === 'orders' && <OrdersTable orders={orders} onStatus={updateStatus} full />}
    </div>
  )
}

function OrdersTable({ orders, onStatus, full }) {
  if (!orders.length) return <p style={{ color:'var(--text-muted)' }}>Geen bestellingen.</p>
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>Klant</th><th>Totaal</th><th>Datum</th><th>Status</th></tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td style={{ fontWeight:700 }}>#{o.id}</td>
              <td>{o.customer_name || o.shipping_name}<br/><span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{o.shipping_email}</span></td>
              <td style={{ fontWeight:600 }}>€{Number(o.total).toFixed(2)}</td>
              <td style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('nl-NL')}</td>
              <td>
                <select value={o.status} onChange={e => onStatus(o.id, e.target.value)}
                  style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--border)', fontSize:'0.82rem', cursor:'pointer' }}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_NL[s]}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProductForm({ initial, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name || '', description: initial?.description || '',
    price: initial?.price || '', sale_price: initial?.sale_price || '',
    category_id: initial?.category_id || '', gender: initial?.gender || 'unisex',
    featured: initial?.featured ? true : false,
    images: [], variants: [{ size:'S', color:'', stock:10 },{ size:'M', color:'', stock:10 },{ size:'L', color:'', stock:10 },{ size:'XL', color:'', stock:5 }]
  })
  const set = (k,v) => setForm(f => ({...f,[k]:v}))

  return (
    <div style={{ background:'var(--bg2)', borderRadius:12, padding:'1.5rem', marginBottom:'1.5rem', border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1.25rem' }}>
        <h3 style={{ fontWeight:700 }}>{initial ? 'Product bewerken' : 'Nieuw product'}</h3>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
      </div>
      <div className="form-row" style={{ marginBottom:'1rem' }}>
        <div>
          <label className="label">Naam *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bijv. Zomer T-shirt"/>
        </div>
        <div>
          <label className="label">Categorie</label>
          <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">Geen categorie</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Omschrijving</label>
        <textarea className="input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Productomschrijving…" style={{ resize:'vertical' }}/>
      </div>
      <div className="form-row" style={{ marginBottom:'1rem' }}>
        <div>
          <label className="label">Prijs (€) *</label>
          <input className="input" type="number" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="29.99"/>
        </div>
        <div>
          <label className="label">Saleprijs (€)</label>
          <input className="input" type="number" step="0.01" value={form.sale_price} onChange={e => set('sale_price', e.target.value)} placeholder="Leeg = geen sale"/>
        </div>
      </div>
      <div className="form-row" style={{ marginBottom:'1rem' }}>
        <div>
          <label className="label">Geslacht</label>
          <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
            <option value="unisex">Unisex</option>
            <option value="men">Heren</option>
            <option value="women">Dames</option>
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:24 }}>
          <input type="checkbox" id="featured" checked={form.featured} onChange={e => set('featured', e.target.checked)} style={{ width:18, height:18 }}/>
          <label htmlFor="featured" style={{ fontWeight:600, cursor:'pointer' }}>Uitlichten op homepage</label>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Afbeelding URL(s) (komma-gescheiden)</label>
        <input className="input" placeholder="https://... , https://..." onChange={e => set('images', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}/>
      </div>
      {!initial && (
        <div>
          <label className="label">Maten & voorraad</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'0.75rem' }}>
            {form.variants.map((v,i) => (
              <div key={i} style={{ display:'flex', gap:4, alignItems:'center', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px' }}>
                <span style={{ fontWeight:600, fontSize:'0.85rem' }}>{v.size}</span>
                <input type="number" value={v.stock} min={0} style={{ width:52, padding:'2px 6px', border:'1px solid var(--border)', borderRadius:4, fontSize:'0.82rem' }}
                  onChange={e => { const vv=[...form.variants]; vv[i]={...vv[i],stock:parseInt(e.target.value)||0}; set('variants',vv) }}/>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-primary" onClick={() => onSave(form)}>Opslaan</button>
        <button className="btn btn-outline" onClick={onClose}>Annuleren</button>
      </div>
    </div>
  )
}
