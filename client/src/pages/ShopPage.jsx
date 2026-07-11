import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import api from '../api'
import ProductCard from '../components/ProductCard'
import usePageTitle from '../hooks/usePageTitle'

export default function ShopPage() {
  usePageTitle('Shop')
  const [params, setParams] = useSearchParams()
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')

  const category = params.get('category') || ''
  const gender   = params.get('gender')   || ''
  const sale     = params.get('sale')     || ''

  useEffect(() => { api.get('/products/categories').then(r => setCategories(r.data)).catch(()=>{}) }, [])

  useEffect(() => {
    setLoading(true)
    const q = new URLSearchParams()
    if (category) q.set('category', category)
    if (gender)   q.set('gender', gender)
    if (sale)     q.set('sale', '1')
    if (search)   q.set('search', search)
    api.get(`/products?${q}`).then(r => setProducts(r.data)).catch(()=>{}).finally(() => setLoading(false))
  }, [category, gender, sale, search])

  const setFilter = (key, val) => {
    const p = new URLSearchParams(params)
    if (val) p.set(key, val); else p.delete(key)
    setParams(p)
  }
  const clearFilters = () => { setParams({}); setSearch('') }

  const hasFilter = category || gender || sale || search

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem' }}>
      <h1 style={{ fontSize:'1.8rem', fontWeight:800, marginBottom:'1.5rem' }}>
        {sale ? 'Sale 🔥' : gender === 'men' ? 'Heren' : gender === 'women' ? 'Dames' : 'Shop'}
      </h1>

      {/* Zoekbalk */}
      <div style={{ position:'relative', marginBottom:'1.25rem' }}>
        <Search size={18} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
        <input className="input" placeholder="Zoek een product…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 44 }}/>
      </div>

      {/* Categorie chips */}
      <div className="categories-strip" style={{ marginBottom:'1.5rem', padding:0 }}>
        <button className={`cat-chip ${!category ? 'active' : ''}`} onClick={() => setFilter('category','')}>Alles</button>
        {categories.map(c => (
          <button key={c.id} className={`cat-chip ${category===c.slug ? 'active' : ''}`} onClick={() => setFilter('category', c.slug)}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Geslacht filter */}
      <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap' }}>
        {[['','Alles'],['men','Heren'],['women','Dames'],['unisex','Unisex']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter('gender',v)}
            style={{ padding:'6px 14px', borderRadius:100, border:'1.5px solid', fontSize:'0.83rem', fontWeight:600, cursor:'pointer',
              borderColor: gender===v ? 'var(--text)' : 'var(--border)',
              background: gender===v ? 'var(--text)' : 'var(--bg)',
              color: gender===v ? '#fff' : 'var(--text-2)' }}>
            {l}
          </button>
        ))}
        <button onClick={() => setFilter('sale', sale ? '' : '1')}
          style={{ padding:'6px 14px', borderRadius:100, border:'1.5px solid', fontSize:'0.83rem', fontWeight:600, cursor:'pointer',
            borderColor: sale ? '#dc2626' : 'var(--border)',
            background: sale ? '#fee2e2' : 'var(--bg)',
            color: sale ? '#dc2626' : 'var(--text-2)' }}>
          Sale 🔥
        </button>
        {hasFilter && (
          <button onClick={clearFilters}
            style={{ padding:'6px 14px', borderRadius:100, border:'1.5px solid var(--border)', fontSize:'0.83rem', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:'var(--text-muted)' }}>
            <X size={14}/> Reset
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Laden…</div>
      ) : products.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <h3>Geen producten gevonden</h3>
          <p>Probeer andere filters of zoekterm.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginBottom:'1rem' }}>{products.length} product{products.length!==1?'en':''}</p>
          <div className="product-grid">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  )
}
