import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Home, Image as ImageIcon,
  Plus, Pencil, Trash2, X, Upload, ChevronDown, ChevronUp,
  ArrowLeft, Eye, EyeOff, Search, RefreshCw, Star, Shield, CalendarClock, Percent,
  Euro, Users
} from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import AdminSchools from './admin/AdminSchools'
import AdminDrops   from './admin/AdminDrops'
import AdminCodes   from './admin/AdminCodes'
import AdminPayouts from './admin/AdminPayouts'
import AdminUsers   from './admin/AdminUsers'

// ── Constants ─────────────────────────────────────────────────────────────────
// Maattypes per soort fightgear. `defaults` = maten die bij een nieuw product
// alvast aan staan.
const SIZE_TYPES = {
  kleding:           { label: '👕 Kleding (XS–XXL)',        sizes: ['XS','S','M','L','XL','XXL'], defaults: ['S','M','L','XL'] },
  handschoenen:      { label: '🥊 Handschoenen (2–20 OZ)',  sizes: ['2 OZ','4 OZ','6 OZ','8 OZ','10 OZ','12 OZ','14 OZ','16 OZ','18 OZ','20 OZ'], defaults: ['8 OZ','10 OZ','12 OZ','14 OZ','16 OZ'] },
  scheenbeschermers: { label: '🦵 Scheenbeschermers (S–XL)', sizes: ['S','M','L','XL'], defaults: ['S','M','L','XL'] },
  bitjes:            { label: '🦷 Bitjes',                  sizes: ['Junior','Senior'], defaults: ['Junior','Senior'] },
  headgear:          { label: '🪖 Headgear (S/M/L)',        sizes: ['S','M','L'], defaults: ['S','M','L'] },
  bandage:           { label: '🧵 Bandage (2.5–4.5m)',      sizes: ['2.5m','3m','4.5m'], defaults: ['2.5m','3m','4.5m'] },
  schoenen:          { label: '👟 Schoenen (36–46)',        sizes: ['36','37','38','39','40','41','42','43','44','45','46'], defaults: [] },
}

/**
 * Herkent het maattype van een bestaand product aan zijn varianten.
 * Lettermaten vallen terug op 'kleding' (het oude gedrag) — de beheerder kan
 * het type daarna zelf omzetten naar bijv. scheenbeschermers of headgear.
 */
function detectSizeType(variants = []) {
  const sizes = variants.map(v => String(v.size))
  if (!sizes.length) return 'kleding'
  if (sizes.some(s => /oz/i.test(s)))                 return 'handschoenen'
  if (sizes.some(s => /^\d+([.,]\d+)?m$/i.test(s)))   return 'bandage'
  if (sizes.some(s => /^(junior|senior)$/i.test(s)))  return 'bitjes'
  if (sizes.every(s => /^\d+$/.test(s)))              return 'schoenen'
  return 'kleding'
}

const STATUS_OPTS  = ['awaiting_payment','pending','processing','shipped','delivered','cancelled']
const STATUS_NL    = { awaiting_payment:'Wacht op betaling', pending:'In behandeling', processing:'Verwerkt', shipped:'Verzonden', delivered:'Afgeleverd', cancelled:'Geannuleerd' }
const STATUS_COLOR = { awaiting_payment:'#9ca3af', pending:'#f59e0b', processing:'#3b82f6', shipped:'#8b5cf6', delivered:'#22c55e', cancelled:'#ef4444' }

function statusStyle(s) {
  return { display:'inline-block', padding:'3px 10px', borderRadius:100, fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.04em', background: STATUS_COLOR[s]+'22', color: STATUS_COLOR[s] }
}

// ── Root component ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [tab, setTab]             = useState('dashboard')
  const [products, setProducts]   = useState([])
  const [orders, setOrders]       = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { if (user && user.role !== 'admin') navigate('/') }, [user])

  const loadAll = useCallback(async () => {
    setLoading(true)
    // Promise.allSettled: elke request faalt onafhankelijk, één fout blokkeert de rest niet
    const [p, o, c, s] = await Promise.allSettled([
      api.get('/products?active=all'),
      api.get('/orders/admin'),
      api.get('/products/categories'),
      api.get('/products/admin/stats'),
    ])
    if (p.status === 'fulfilled') setProducts(p.value.data)
    if (o.status === 'fulfilled') setOrders(o.value.data)
    if (c.status === 'fulfilled') setCategories(c.value.data)
    if (s.status === 'fulfilled') setStats(s.value.data)
    setLoading(false)
  }, [])

  // Lichte categorie-refresh zonder global loading-flash
  const refreshCategories = useCallback(async () => {
    try {
      const r = await api.get('/products/categories')
      setCategories(r.data)
    } catch (_) {}
  }, [])

  useEffect(() => { if (user?.role === 'admin') loadAll() }, [user])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="admin-shell" style={{ display:'flex', minHeight:'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar" style={{ width:220, background:'#0a0a0a', borderRight:'1px solid #1a1a1a', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'1.5rem 1.25rem 1rem', borderBottom:'1px solid #1a1a1a' }}>
          <div style={{ fontSize:'0.65rem', letterSpacing:'0.2em', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginBottom:4 }}>Beheer</div>
          <div style={{ fontSize:'1rem', fontWeight:900, color:'#fff', letterSpacing:'0.06em', textTransform:'uppercase' }}>FightMarketing</div>
        </div>
        <nav className="admin-nav" style={{ padding:'0.75rem 0', flex:1 }}>
          {[
            { key:'dashboard', icon:<LayoutDashboard size={16}/>, label:'Dashboard' },
            { key:'products',  icon:<Package size={16}/>,         label:'Producten' },
            { key:'categories',icon:<Tag size={16}/>,             label:'Categorieën' },
            { key:'orders',    icon:<ShoppingBag size={16}/>,     label:'Bestellingen' },
            { key:'schools',   icon:<Shield size={16}/>,          label:'Scholen' },
            { key:'payouts',   icon:<Euro size={16}/>,            label:'Uitbetalingen' },
            { key:'users',     icon:<Users size={16}/>,           label:'Gebruikers' },
            { key:'drops',     icon:<CalendarClock size={16}/>,   label:'Drops' },
            { key:'codes',     icon:<Percent size={16}/>,         label:'Kortingscodes' },
            { key:'homepage',  icon:<Home size={16}/>,            label:'Homepage' },
          ].map(({ key, icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 1.25rem', background: tab===key ? '#fff' : 'none', border:'none', cursor:'pointer', color: tab===key ? '#000' : 'rgba(255,255,255,0.55)', fontSize:'0.82rem', fontWeight: tab===key ? 700 : 500, textAlign:'left', transition:'all 0.15s' }}>
              {icon}{label}
            </button>
          ))}
        </nav>
        <div style={{ padding:'1rem 1.25rem', borderTop:'1px solid #1a1a1a' }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', letterSpacing:'0.06em' }}>
            <ArrowLeft size={13}/> Naar shop
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex:1, background:'#f9f9f9', overflow:'auto' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#888', fontSize:'0.9rem' }}>
            Laden…
          </div>
        ) : (
          <>
            {tab === 'dashboard'  && <DashboardTab stats={stats} orders={orders} products={products} onStatusChange={async (id,s) => { await api.put(`/orders/admin/${id}/status`,{status:s}); loadAll() }}/>}
            {tab === 'products'   && <ProductsTab  products={products} categories={categories} onRefresh={loadAll}/>}
            {tab === 'categories' && <CategoriesTab categories={categories} onRefresh={refreshCategories}/>}
            {tab === 'orders'     && <OrdersTab orders={orders} onStatusChange={async (id,s) => { await api.put(`/orders/admin/${id}/status`,{status:s}); loadAll() }} onRefresh={loadAll}/>}
            {tab === 'schools'    && <AdminSchools/>}
            {tab === 'payouts'    && <AdminPayouts/>}
            {tab === 'users'      && <AdminUsers/>}
            {tab === 'drops'      && <AdminDrops/>}
            {tab === 'codes'      && <AdminCodes/>}
            {tab === 'homepage'   && <HomepageSection/>}
          </>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab({ stats, orders, products, onStatusChange }) {
  return (
    <div style={{ padding:'2rem' }}>
      <PageHeader title="Dashboard" />

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem', marginBottom:'2.5rem' }}>
        {[
          { label:'Omzet',       value: stats ? `€${Number(stats.revenue).toFixed(2)}` : '—', sub:'betaalde bestellingen', color:'#000' },
          { label:'Bestellingen',value: stats?.orders ?? '—',   sub:'totaal',            color:'#3b82f6' },
          { label:'Producten',   value: stats?.products ?? '—', sub:'actief',             color:'#22c55e' },
          { label:'Klanten',     value: stats?.users ?? '—',    sub:'geregistreerd',      color:'#8b5cf6' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, padding:'1.25rem' }}>
            <div style={{ fontSize:'0.7rem', color:'#888', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:'1.75rem', fontWeight:900, color, lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:'0.72rem', color:'#aaa', marginTop:4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
        {/* Recente bestellingen */}
        <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
          <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #eee', fontWeight:700, fontSize:'0.85rem' }}>Recente bestellingen</div>
          <OrderTable orders={orders.slice(0,6)} onStatus={onStatusChange} compact />
        </div>
        {/* Lage voorraad */}
        <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
          <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #eee', fontWeight:700, fontSize:'0.85rem' }}>Lage voorraad</div>
          <div style={{ padding:'0.5rem 0' }}>
            {products.filter(p => p.active && (p.total_stock || 0) < 20).slice(0,8).map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 1.25rem', borderBottom:'1px solid #f5f5f5' }}>
                <span style={{ fontSize:'0.85rem', fontWeight:600 }}>{p.name}</span>
                <span style={{ fontSize:'0.8rem', fontWeight:700, color: (p.total_stock||0) === 0 ? '#ef4444' : '#f59e0b' }}>{p.total_stock||0} stuks</span>
              </div>
            ))}
            {products.filter(p => p.active && (p.total_stock||0) < 20).length === 0 && (
              <div style={{ padding:'1rem 1.25rem', fontSize:'0.85rem', color:'#aaa' }}>Alle voorraad OK ✓</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Products tab ──────────────────────────────────────────────────────────────
function ProductsTab({ products, categories, onRefresh }) {
  const [search, setSearch]     = useState('')
  const [modalOpen, setModal]   = useState(false)
  const [editId, setEditId]     = useState(null)

  const openNew  = () => { setEditId(null); setModal(true) }
  const openEdit = (id) => { setEditId(id);  setModal(true) }
  const close    = () => { setModal(false); setEditId(null) }
  const saved    = () => { close(); onRefresh() }

  const deactivateProduct = async (p) => {
    setMenuFor(null)
    if (!confirm(`"${p.name}" deactiveren? Het product is dan niet meer zichtbaar in de shop, maar blijft bewaard.`)) return
    try {
      await api.delete(`/products/${p.id}`)
      onRefresh()
    } catch(e) {
      alert('Deactiveren mislukt: ' + (e.response?.data?.error || e.message))
    }
  }

  const hardDeleteProduct = async (p) => {
    setMenuFor(null)
    if (!confirm(`"${p.name}" permanent verwijderen?\n\nDit kan niet ongedaan worden gemaakt — weet je het zeker?`)) return
    try {
      const r = await api.delete(`/products/${p.id}?hard=1`)
      if (r.data.deactivated) alert(r.data.message) // zat in bestellingen → soft-delete
      onRefresh()
    } catch(e) {
      alert('Verwijderen mislukt: ' + (e.response?.data?.error || e.message))
    }
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding:'2rem' }}>
      <PageHeader title="Producten">
        <button onClick={openNew} className="btn btn-black" style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.82rem' }}>
          <Plus size={15}/> Nieuw product
        </button>
      </PageHeader>

      {/* Zoekbalk */}
      <div style={{ position:'relative', marginBottom:'1.25rem', maxWidth:320 }}>
        <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#aaa' }}/>
        <input className="input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Zoek product…" style={{ paddingLeft:34, fontSize:'0.85rem' }}/>
      </div>

      {/* Tabel */}
      <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #eee' }}>
              {['Foto','Product','Categorie','Prijs','Sale','Voorraad','Status','Acties'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#888', letterSpacing:'0.08em', textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
                <td style={{ padding:'10px 14px' }}>
                  {p.image
                    ? <img src={p.image} alt="" style={{ width:44, height:56, objectFit:'cover', borderRadius:4, background:'#f5f5f5' }}/>
                    : <div style={{ width:44, height:56, background:'#f0f0f0', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', fontSize:'1.2rem' }}>▫</div>
                  }
                </td>
                <td style={{ padding:'10px 14px', fontWeight:600 }}>{p.name}</td>
                <td style={{ padding:'10px 14px', color:'#888' }}>{p.category_name || '—'}</td>
                <td style={{ padding:'10px 14px', fontWeight:600 }}>€{Number(p.price).toFixed(2)}</td>
                <td style={{ padding:'10px 14px', color:'#ef4444', fontWeight:600 }}>{p.sale_price ? `€${Number(p.sale_price).toFixed(2)}` : '—'}</td>
                <td style={{ padding:'10px 14px' }}>
                  <span style={{ fontWeight:700, color:(p.total_stock||0)<5?'#ef4444':(p.total_stock||0)<20?'#f59e0b':'#22c55e' }}>
                    {p.total_stock||0}
                  </span>
                </td>
                <td style={{ padding:'10px 14px' }}>
                  {p.active
                    ? <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#22c55e', background:'#dcfce7', padding:'3px 8px', borderRadius:100 }}>Actief</span>
                    : <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#ef4444', background:'#fee2e2', padding:'3px 8px', borderRadius:100 }}>Inactief</span>
                  }
                </td>
                <td style={{ padding:'10px 14px' }}>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button onClick={() => openEdit(p.id)} title="Bewerken"
                      style={{ padding:'6px 10px', border:'1px solid #e0e0e0', borderRadius:6, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:'#444', fontSize:'0.75rem', fontWeight:600 }}>
                      <Pencil size={13}/> Bewerken
                    </button>
                    {p.active && (
                      <button onClick={() => deactivateProduct(p)} title="Deactiveren — product blijft bewaard, maar niet zichtbaar in de shop"
                        style={{ padding:'6px 10px', border:'1px solid #e0e0e0', borderRadius:6, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:'#b45309', fontSize:'0.75rem', fontWeight:600 }}>
                        <EyeOff size={13}/> Deactiveren
                      </button>
                    )}
                    <button onClick={() => hardDeleteProduct(p)} title="Permanent verwijderen — kan niet ongedaan worden gemaakt"
                      style={{ padding:'6px 10px', border:'1px solid #fee2e2', borderRadius:6, background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:'#ef4444', fontSize:'0.75rem', fontWeight:600 }}>
                      <Trash2 size={13}/> Verwijderen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ padding:'2rem', textAlign:'center', color:'#aaa', fontSize:'0.85rem' }}>Geen producten gevonden</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <ProductModal productId={editId} categories={categories} onClose={close} onSaved={saved}/>
      )}
    </div>
  )
}

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ productId, categories, onClose, onSaved }) {
  const fileRef = useRef()
  const [loading, setLoading]     = useState(!!productId)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    name:'', description:'', price:'', sale_price:'',
    category_id:'', gender:'unisex', featured:false, active:true,
    school_id:'', drop_id:''
  })
  const [images,   setImages]   = useState([])
  const [sizeType, setSizeType] = useState('kleding')
  const [variants, setVariants] = useState([])
  const [schools,  setSchools]  = useState([])
  const [drops,    setDrops]    = useState([])

  useEffect(() => {
    api.get('/schools/admin').then(r => setSchools(r.data)).catch(() => {})
    api.get('/drops').then(r => setDrops(r.data)).catch(() => {})
  }, [])

  // Initialiseer varianten op basis van sizeType
  const initVariants = (type) => {
    const cfg = SIZE_TYPES[type]
    return cfg.sizes.map(s => ({ size:s, stock:10, active: cfg.defaults.includes(s) }))
  }

  useEffect(() => {
    if (productId) {
      api.get(`/products/admin-detail/${productId}`).then(r => {
        const p = r.data
        setForm({ name:p.name, description:p.description||'', price:p.price, sale_price:p.sale_price||'', category_id:p.category_id||'', gender:p.gender||'unisex', featured:!!p.featured, active:p.active!==0, school_id:p.school_id||'', drop_id:p.drop_id||'' })
        setImages(p.images || [])
        // Detecteer maattype van bestaande varianten
        const type = detectSizeType(p.variants)
        setSizeType(type)
        // Grid = maten van het type + eventuele afwijkende bestaande maten
        // (zoals 'One size') achteraan — zo gaat er nooit voorraad verloren
        const base  = SIZE_TYPES[type].sizes
        const extra = (p.variants || []).map(v => v.size).filter(s => !base.includes(s))
        setVariants([...base, ...extra].map(s => {
          const found = p.variants?.find(v => v.size === s)
          return { size:s, stock: found ? found.stock : 0, active: !!found }
        }))
        setLoading(false)
      }).catch(() => onClose())
    } else {
      setVariants(initVariants('kleding'))
    }
  }, [productId])

  const changeSizeType = (type) => {
    if (type === sizeType) return
    if (productId) {
      if (!confirm('Let op: het wijzigen van het maattype wist alle bestaande maten en voorraad. Doorgaan?')) return
    }
    setSizeType(type)
    setVariants(initVariants(type))
  }
  const toggleSize     = (size) => setVariants(v => v.map(x => x.size===size ? {...x, active:!x.active} : x))
  const setStock       = (size, val) => setVariants(v => v.map(x => x.size===size ? {...x, stock:parseInt(val)||0} : x))
  const setAllStock    = (val) => setVariants(v => v.map(x => x.active ? {...x, stock:parseInt(val)||0} : x))

  const uploadImage = async (file) => {
    setUploading(true)
    const fd = new FormData()
    fd.append('image', file)
    try {
      const r = await api.post('/upload', fd, { headers:{ 'Content-Type':'multipart/form-data' } })
      setImages(imgs => [...imgs, { url: r.data.url }])
    } catch(e) { alert('Upload mislukt: ' + (e.response?.data?.error || e.message)) }
    finally { setUploading(false) }
  }

  const removeImage  = (idx) => setImages(imgs => imgs.filter((_,i) => i !== idx))
  const makeMainImage = (idx) => setImages(imgs => { const copy = [...imgs]; const [main] = copy.splice(idx,1); return [main, ...copy] })

  const save = async () => {
    if (!form.name.trim() || !form.price) return alert('Naam en prijs zijn verplicht.')
    setSaving(true)
    const payload = { ...form, price: parseFloat(form.price), sale_price: form.sale_price ? parseFloat(form.sale_price) : null, category_id: form.category_id || null, school_id: form.school_id || null, drop_id: form.drop_id || null }
    const activeVariants = variants.filter(v => v.active).map(v => ({ size:v.size, stock:v.stock, color:null }))
    const imgUrls        = images.map(i => i.url)
    try {
      if (productId) {
        await api.put(`/products/${productId}`, payload)
        await api.put(`/products/${productId}/variants`, { variants: activeVariants })
        await api.put(`/products/${productId}/images`,   { images: imgUrls })
      } else {
        await api.post('/products', { ...payload, variants: activeVariants, images: imgUrls })
      }
      onSaved()
    } catch(e) { alert(e.response?.data?.error || 'Opslaan mislukt.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'2rem 1rem', overflowY:'auto' }}
      onClick={onClose}>
      <div className="stack-mobile" style={{ background:'#fff', borderRadius:10, width:'100%', maxWidth:780, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.25rem 1.5rem', borderBottom:'1px solid #eee' }}>
          <h2 style={{ fontSize:'1rem', fontWeight:800 }}>{productId ? 'Product bewerken' : 'Nieuw product'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#666', padding:4 }}><X size={20}/></button>
        </div>

        {loading ? (
          <div style={{ padding:'3rem', textAlign:'center', color:'#aaa' }}>Laden…</div>
        ) : (
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

            {/* Sectie: Basisinfo */}
            <Section title="Basisinfo">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <FormGroup label="Naam *">
                  <input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Bijv. Cargo Jogger"/>
                </FormGroup>
                <FormGroup label="Categorie">
                  <select className="input" value={form.category_id} onChange={e => setForm(f=>({...f,category_id:e.target.value}))}>
                    <option value="">Geen</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormGroup>
              </div>
              <FormGroup label="Omschrijving">
                <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Productomschrijving…" style={{ resize:'vertical' }}/>
              </FormGroup>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <FormGroup label="School (clubcollectie)">
                  <select className="input" value={form.school_id} onChange={e => setForm(f=>({...f,school_id:e.target.value}))}>
                    <option value="">Centrale catalogus — scholen kiezen zelf of dit in hun shop staat</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Drop (seizoenscollectie)">
                  <select className="input" value={form.drop_id} onChange={e => setForm(f=>({...f,drop_id:e.target.value}))}>
                    <option value="">Geen drop</option>
                    {drops.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </FormGroup>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem' }}>
                <FormGroup label="Geslacht">
                  <select className="input" value={form.gender} onChange={e => setForm(f=>({...f,gender:e.target.value}))}>
                    <option value="unisex">Unisex</option>
                    <option value="men">Heren</option>
                    <option value="women">Dames</option>
                  </select>
                </FormGroup>
                <FormGroup label=" ">
                  <label style={{ display:'flex', alignItems:'center', gap:8, paddingTop:12, cursor:'pointer' }}>
                    <input type="checkbox" checked={form.featured} onChange={e => setForm(f=>({...f,featured:e.target.checked}))} style={{ width:16, height:16 }}/>
                    <span style={{ fontSize:'0.85rem', fontWeight:600 }}>Uitlichten op home</span>
                  </label>
                </FormGroup>
                <FormGroup label=" ">
                  <label style={{ display:'flex', alignItems:'center', gap:8, paddingTop:12, cursor:'pointer' }}>
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} style={{ width:16, height:16 }}/>
                    <span style={{ fontSize:'0.85rem', fontWeight:600 }}>Actief (zichtbaar)</span>
                  </label>
                </FormGroup>
              </div>
            </Section>

            {/* Sectie: Prijs */}
            <Section title="Prijs">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <FormGroup label="Prijs (€) *">
                  <input className="input" type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} placeholder="49.99"/>
                </FormGroup>
                <FormGroup label="Saleprijs (€) — leeg = geen sale">
                  <input className="input" type="number" step="0.01" min="0" value={form.sale_price} onChange={e => setForm(f=>({...f,sale_price:e.target.value}))} placeholder="29.99"/>
                </FormGroup>
              </div>
            </Section>

            {/* Sectie: Foto's */}
            <Section title="Foto's">
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.75rem', marginBottom:'0.75rem' }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position:'relative', width:90, height:116, borderRadius:6, overflow:'hidden', border: i===0 ? '2px solid #000' : '1px solid #eee' }}>
                    <img src={img.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    <button onClick={() => removeImage(i)}
                      style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,0.6)', border:'none', borderRadius:'50%', width:22, height:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
                      <X size={11}/>
                    </button>
                    {i === 0
                      ? <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'#000', color:'#fff', fontSize:'0.6rem', textAlign:'center', padding:'3px 0', fontWeight:700, letterSpacing:'0.06em', display:'flex', alignItems:'center', justifyContent:'center', gap:3 }}><Star size={9} fill="#fff"/> HOOFD</div>
                      : <button onClick={() => makeMainImage(i)} title="Maak hoofdfoto"
                          style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.65)', color:'#fff', border:'none', fontSize:'0.58rem', padding:'3px 0', cursor:'pointer', fontWeight:700, letterSpacing:'0.04em' }}>
                          ★ MAAK HOOFD
                        </button>
                    }
                  </div>
                ))}
                {/* Upload knop */}
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ width:90, height:116, border:'2px dashed #ddd', borderRadius:6, background:'#fafafa', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, color:'#999', fontSize:'0.7rem' }}>
                  {uploading ? <RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }}/> : <Upload size={18}/>}
                  {uploading ? 'Uploaden…' : 'Upload foto'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value='' }}/>
              </div>
              <p style={{ fontSize:'0.72rem', color:'#aaa' }}>Eerste foto is de hoofdfoto. Max 8MB per afbeelding.</p>
            </Section>

            {/* Sectie: Maten & Voorraad */}
            <Section title="Maten & Voorraad">
              {/* Type toggle */}
              <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap', alignItems:'center' }}>
                {Object.entries(SIZE_TYPES).map(([type, cfg]) => (
                  <button key={type} onClick={() => changeSizeType(type)}
                    style={{ padding:'7px 14px', border:'1.5px solid', borderColor: sizeType===type ? '#000' : '#ddd', borderRadius:6, background: sizeType===type ? '#000' : '#fff', color: sizeType===type ? '#fff' : '#666', fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
                    {cfg.label}
                  </button>
                ))}
              </div>
              {productId && <p style={{ fontSize:'0.7rem', color:'#f59e0b', margin:'-0.75rem 0 1rem' }}>⚠ Type wijzigen wist bestaande maten en voorraad van dit product</p>}

              {/* Snel alles instellen */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem', padding:'10px 14px', background:'#f9f9f9', borderRadius:6 }}>
                <span style={{ fontSize:'0.8rem', color:'#666', fontWeight:600 }}>Alle actieve maten instellen op:</span>
                <input type="number" min="0" defaultValue="" placeholder="bv. 10"
                  style={{ width:80, padding:'5px 8px', border:'1px solid #ddd', borderRadius:5, fontSize:'0.82rem' }}
                  onBlur={e => { if (e.target.value) setAllStock(e.target.value) }}/>
                <span style={{ fontSize:'0.72rem', color:'#aaa' }}>stuks</span>
              </div>

              {/* Maatgrid */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                {variants.map(v => (
                  <div key={v.size} onClick={() => toggleSize(v.size)}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'8px 12px', border:'1.5px solid', borderColor: v.active ? '#000' : '#e0e0e0', borderRadius:8, background: v.active ? '#000' : '#fff', cursor:'pointer', minWidth:64, transition:'all 0.15s' }}>
                    <span style={{ fontSize:'0.85rem', fontWeight:700, color: v.active ? '#fff' : '#999' }}>{v.size}</span>
                    <input type="number" min="0" value={v.stock}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setStock(v.size, e.target.value)}
                      style={{ width:52, padding:'3px 5px', border:'1px solid', borderColor: v.active ? 'rgba(255,255,255,0.3)' : '#ddd', borderRadius:4, fontSize:'0.78rem', textAlign:'center', background: v.active ? 'rgba(255,255,255,0.1)' : '#f9f9f9', color: v.active ? '#fff' : '#999', outline:'none' }}/>
                    <span style={{ fontSize:'0.6rem', color: v.active ? 'rgba(255,255,255,0.6)' : '#ccc' }}>stuks</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:'0.72rem', color:'#aaa', marginTop:'0.75rem' }}>Klik op een maat om te activeren/deactiveren</p>
            </Section>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'1rem 1.5rem', borderTop:'1px solid #eee' }}>
            <button onClick={onClose} className="btn btn-outline" style={{ fontSize:'0.85rem' }}>Annuleren</button>
            <button onClick={save} className="btn btn-black" disabled={saving} style={{ fontSize:'0.85rem', display:'flex', alignItems:'center', gap:6 }}>
              {saving ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Opslaan…</> : 'Opslaan'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Categories tab ────────────────────────────────────────────────────────────
function CategoriesTab({ categories, onRefresh }) {
  const fileRefs           = useRef({})
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingFor, setUploadingFor] = useState(null)

  const add = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.post('/products/categories', { name: name.trim() })
      setName('')
      await onRefresh()
    } catch(e) { alert(e.response?.data?.error || 'Fout bij toevoegen') }
    finally { setSaving(false) }
  }

  const del = async (cat) => {
    if (!confirm(`Categorie "${cat.name}" verwijderen? Producten in deze categorie worden losgekoppeld.`)) return
    try {
      await api.delete(`/products/categories/${cat.id}`)
      await onRefresh()
    } catch(e) {
      alert('Verwijderen mislukt: ' + (e.response?.data?.error || e.message))
    }
  }

  const uploadCatImage = async (catId, file) => {
    setUploadingFor(catId)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      await api.put(`/products/categories/${catId}/image`, { image_url: r.data.url })
      await onRefresh()
    } catch(e) { alert('Upload mislukt: ' + (e.response?.data?.error || e.message)) }
    finally { setUploadingFor(null) }
  }

  return (
    <div style={{ padding:'2rem' }}>
      <PageHeader title="Categorieën" />

      {/* Nieuwe categorie toevoegen */}
      <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, padding:'1.25rem', marginBottom:'1.5rem', display:'flex', gap:10 }}>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nieuwe categorie naam…" style={{ maxWidth:300, fontSize:'0.85rem' }}
          onKeyDown={e => e.key === 'Enter' && add()}/>
        <button onClick={add} disabled={saving} className="btn btn-black" style={{ fontSize:'0.82rem', display:'flex', alignItems:'center', gap:6 }}>
          {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> : <Plus size={14}/>}
          {saving ? 'Bezig…' : 'Toevoegen'}
        </button>
      </div>

      {/* Lijst */}
      <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
        {categories.map((cat, i) => (
          <div key={cat.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 1.25rem', borderBottom: i < categories.length-1 ? '1px solid #f5f5f5' : 'none' }}>

            {/* Foto + naam */}
            <div style={{ display:'flex', alignItems:'center', gap:'0.9rem' }}>
              {/* Klikbaar foto-blok */}
              <div
                onClick={() => fileRefs.current[cat.id]?.click()}
                title="Klik om foto te wijzigen"
                style={{ position:'relative', width:54, height:54, borderRadius:6, overflow:'hidden', background:'#f0f0f0', flexShrink:0, cursor:'pointer', border:'1px solid #e5e5e5' }}
              >
                {cat.image_url
                  ? <img src={cat.image_url} alt={cat.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc' }}><ImageIcon size={20}/></div>
                }
                {uploadingFor === cat.id && (
                  <div style={{ position:'absolute', inset:0, background:'rgba(255,255,255,0.8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <RefreshCw size={14} style={{ animation:'spin 1s linear infinite', color:'#000' }}/>
                  </div>
                )}
                {/* Hover overlay */}
                <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                  <Upload size={14} style={{ color:'#fff' }}/>
                </div>
              </div>
              {/* Hidden file input */}
              <input type="file" accept="image/*" style={{ display:'none' }}
                ref={el => fileRefs.current[cat.id] = el}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCatImage(cat.id, f); e.target.value = '' }}/>

              <div>
                <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{cat.name}</div>
                <div style={{ fontSize:'0.72rem', color:'#aaa' }}>/{cat.slug} · klik foto om te wijzigen</div>
              </div>
            </div>

            <button onClick={() => del(cat)}
              style={{ padding:'5px 10px', border:'1px solid #fee2e2', borderRadius:6, background:'#fff', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center', gap:4, fontSize:'0.78rem', flexShrink:0 }}>
              <Trash2 size={13}/> Verwijder
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <div style={{ padding:'2rem', textAlign:'center', color:'#aaa', fontSize:'0.85rem' }}>Nog geen categorieën</div>
        )}
      </div>
    </div>
  )
}

// ── Orders tab ────────────────────────────────────────────────────────────────
function OrdersTab({ orders, onStatusChange, onRefresh }) {
  const [filter,      setFilter]  = useState('all')
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [detailOrder, setDetail]  = useState(null)
  const [loadingDetail, setLD]    = useState(false)

  const deleteOrder = async (o) => {
    if (!confirm(`Bestelling #${o.id} definitief verwijderen?${o.paid_at ? '' : '\nDe gereserveerde voorraad wordt teruggegeven.'}`)) return
    try {
      await api.delete(`/orders/admin/${o.id}`)
      setDetail(null)
      onRefresh && onRefresh()
    } catch (e) { alert(e.response?.data?.error || 'Verwijderen mislukt.') }
  }

  const schoolNames = [...new Set(orders.map(o => o.school_name).filter(Boolean))].sort()
  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o => schoolFilter === 'all'
      || (schoolFilter === 'none' ? !o.school_name : o.school_name === schoolFilter))

  const openDetail = async (id) => {
    setLD(true)
    try { const r = await api.get(`/orders/admin/${id}`); setDetail(r.data) }
    catch(_) {}
    setLD(false)
  }

  return (
    <div style={{ padding:'2rem' }}>
      <PageHeader title="Bestellingen" />

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:'0.75rem', flexWrap:'wrap' }}>
        {[['all','Alle'], ...STATUS_OPTS.map(s => [s, STATUS_NL[s]])].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ padding:'6px 14px', border:'1px solid', borderRadius:100, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', borderColor: filter===key ? '#000' : '#ddd', background: filter===key ? '#000' : '#fff', color: filter===key ? '#fff' : '#666' }}>
            {label}
            {key !== 'all' && <span style={{ marginLeft:5, opacity:0.7 }}>({orders.filter(o=>o.status===key).length})</span>}
          </button>
        ))}
      </div>

      {/* School filter */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1.25rem' }}>
        <label htmlFor="order-school-filter" style={{ fontSize:'0.75rem', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em' }}>School:</label>
        <select id="order-school-filter" value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #ddd', fontSize:'0.8rem', fontWeight:600, cursor:'pointer' }}>
          <option value="all">Alle scholen</option>
          <option value="none">Algemene shop (geen school)</option>
          {schoolNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {schoolFilter !== 'all' && (
          <span style={{ fontSize:'0.75rem', color:'#888' }}>{filtered.length} bestelling(en)</span>
        )}
      </div>

      <OrderTable orders={filtered} onStatus={onStatusChange} onDetail={openDetail}/>

      {/* Order detail modal */}
      {(detailOrder || loadingDetail) && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} onClick={() => setDetail(null)}>
          <div style={{ background:'#fff', borderRadius:10, width:'100%', maxWidth:560, maxHeight:'85vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.25rem 1.5rem', borderBottom:'1px solid #eee', position:'sticky', top:0, background:'#fff' }}>
              <h3 style={{ fontWeight:800, fontSize:'1rem' }}>
                {detailOrder ? `Bestelling #${detailOrder.id}` : 'Laden…'}
              </h3>
              <button onClick={() => setDetail(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#666' }}><X size={20}/></button>
            </div>
            {detailOrder && (
              <div style={{ padding:'1.5rem' }}>
                {/* Klantgegevens */}
                <div style={{ marginBottom:'1.5rem' }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', color:'#aaa', textTransform:'uppercase', marginBottom:'0.75rem' }}>Klant</div>
                  <div style={{ fontSize:'0.9rem', fontWeight:600 }}>{detailOrder.shipping_name}</div>
                  <div style={{ fontSize:'0.85rem', color:'#666' }}>{detailOrder.shipping_email}</div>
                  {detailOrder.shipping_phone && <div style={{ fontSize:'0.85rem', color:'#666' }}>{detailOrder.shipping_phone}</div>}
                  <div style={{ fontSize:'0.85rem', color:'#666', marginTop:4 }}>
                    {detailOrder.shipping_address}, {detailOrder.shipping_postal} {detailOrder.shipping_city}
                  </div>
                </div>

                {/* Producten */}
                <div style={{ marginBottom:'1.5rem' }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', color:'#aaa', textTransform:'uppercase', marginBottom:'0.75rem' }}>Producten</div>
                  {detailOrder.items?.map((item, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{item.name}</div>
                        <div style={{ fontSize:'0.78rem', color:'#888' }}>Maat: {item.size}{item.color ? ` · ${item.color}` : ''} · Aantal: {item.quantity}</div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:'0.9rem' }}>€{(Number(item.price) * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {/* Totaal & status */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'1rem', borderTop:'2px solid #000' }}>
                  <div style={{ fontWeight:800, fontSize:'1.1rem' }}>Totaal: €{Number(detailOrder.total).toFixed(2)}</div>
                  <select value={detailOrder.status}
                    onChange={async e => { await onStatusChange(detailOrder.id, e.target.value); setDetail(d => ({...d, status: e.target.value})) }}
                    style={{ padding:'7px 12px', borderRadius:6, border:'1.5px solid #ddd', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_NL[s]}</option>)}
                  </select>
                </div>

                {detailOrder.notes && (
                  <div style={{ marginTop:'1rem', padding:'10px 12px', background:'#fffbeb', borderRadius:6, border:'1px solid #fde68a', fontSize:'0.82rem', color:'#92400e' }}>
                    <strong>Opmerking:</strong> {detailOrder.notes}
                  </div>
                )}

                {!detailOrder.paid_at && (
                  <div style={{ marginTop:'1.25rem', paddingTop:'1rem', borderTop:'1px solid #f0f0f0', textAlign:'right' }}>
                    <button onClick={() => deleteOrder(detailOrder)}
                      style={{ padding:'8px 14px', border:'1px solid #fee2e2', borderRadius:6, background:'#fff', color:'#ef4444', cursor:'pointer', fontSize:'0.82rem', fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}>
                      <Trash2 size={14}/> Bestelling verwijderen
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Homepage section ──────────────────────────────────────────────────────────
function HomepageSection() {
  const heroFileRef  = useRef()
  const promoFileRef = useRef()
  const [settings,     setSettings]     = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    api.get('/products/homepage-settings')
      .then(r => setSettings(r.data))
      .catch(() => setSettings({}))
  }, [])

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }))

  const uploadImage = async (key, file) => {
    setUploadingKey(key)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      set(key, r.data.url)
    } catch(e) { alert('Upload mislukt: ' + (e.response?.data?.error || e.message)) }
    finally { setUploadingKey(null) }
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/products/admin/homepage', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch(e) { alert('Opslaan mislukt: ' + (e.response?.data?.error || e.message)) }
    finally { setSaving(false) }
  }

  if (!settings) return (
    <div style={{ padding:'2rem', color:'#aaa', fontSize:'0.9rem' }}>Laden…</div>
  )

  return (
    <div className="stack-mobile" style={{ padding:'2rem' }}>
      <PageHeader title="Homepage beheer" />

      {/* ── Hero afbeelding ── */}
      <div style={{ marginBottom:'2rem' }}>
        <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.875rem', paddingBottom:'0.5rem', borderBottom:'1px solid #f0f0f0' }}>Hero afbeelding</div>

        {/* Voorvertoning */}
        <div style={{ position:'relative', height:200, borderRadius:8, overflow:'hidden', background:'#111', marginBottom:'0.75rem' }}>
          {settings.hero_image && (
            <img src={settings.hero_image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.7 }}/>
          )}
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
            <button onClick={() => heroFileRef.current?.click()} disabled={uploadingKey === 'hero_image'}
              style={{ padding:'9px 18px', background:'rgba(255,255,255,0.92)', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.82rem', display:'flex', alignItems:'center', gap:6 }}>
              {uploadingKey === 'hero_image' ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Uploaden…</> : <><Upload size={14}/> Foto uploaden</>}
            </button>
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:'0.72rem' }}>of plak een URL hieronder</span>
          </div>
        </div>
        <input ref={heroFileRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage('hero_image', f); e.target.value = '' }}/>
        <input className="input" value={settings.hero_image || ''} onChange={e => set('hero_image', e.target.value)}
          placeholder="https://... of /uploads/bestand.jpg" style={{ fontSize:'0.82rem' }}/>
      </div>

      {/* ── Hero teksten ── */}
      <div style={{ marginBottom:'2rem' }}>
        <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.875rem', paddingBottom:'0.5rem', borderBottom:'1px solid #f0f0f0' }}>Hero teksten</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Bovenregel (overline)</label>
            <input className="input" value={settings.hero_overline || ''} onChange={e => set('hero_overline', e.target.value)} placeholder="Nieuwe collectie — 2025"/>
          </div>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Knoptekst (CTA)</label>
            <input className="input" value={settings.hero_cta || ''} onChange={e => set('hero_cta', e.target.value)} placeholder="Koop Nu"/>
          </div>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Knop-link (waar de knop heen gaat)</label>
            <input className="input" value={settings.hero_cta_link || ''} onChange={e => set('hero_cta_link', e.target.value)} placeholder="/shop  ·  /scholen  ·  https://…"/>
          </div>
          <div style={{ gridColumn:'1 / -1' }}>
            <label className="label" style={{ fontSize:'0.75rem' }}>Hoofdtekst (heading)</label>
            <input className="input" value={settings.hero_heading || ''} onChange={e => set('hero_heading', e.target.value)} placeholder="DEFINE YOUR STYLE"/>
            <p style={{ fontSize:'0.7rem', color:'#aaa', marginTop:4 }}>Gebruik | als regelafbreking, bijv. <em>DEFINE|YOUR|STYLE</em></p>
          </div>
        </div>
      </div>

      {/* ── Promo-banner ── */}
      <div style={{ marginBottom:'2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.875rem', paddingBottom:'0.5rem', borderBottom:'1px solid #f0f0f0' }}>
          <span style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#aaa' }}>Promo-banner</span>
          <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
            <input type="checkbox" checked={settings.promo_visible !== '0'} onChange={e => set('promo_visible', e.target.checked ? '1' : '0')} style={{ width:15, height:15 }}/>
            Tonen op homepage
          </label>
        </div>

        <div style={{ position:'relative', height:160, borderRadius:8, overflow:'hidden', background:'#111', marginBottom:'0.75rem' }}>
          {settings.promo_image && <img src={settings.promo_image} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.7 }}/>}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <button onClick={() => promoFileRef.current?.click()} disabled={uploadingKey === 'promo_image'}
              style={{ padding:'9px 18px', background:'rgba(255,255,255,0.92)', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:'0.82rem', display:'flex', alignItems:'center', gap:6 }}>
              {uploadingKey === 'promo_image' ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Uploaden…</> : <><Upload size={14}/> Foto uploaden</>}
            </button>
          </div>
        </div>
        <input ref={promoFileRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage('promo_image', f); e.target.value = '' }}/>
        <input className="input" value={settings.promo_image || ''} onChange={e => set('promo_image', e.target.value)} placeholder="https://... of /uploads/bestand.jpg" style={{ fontSize:'0.82rem', marginBottom:'1rem' }}/>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Bovenregel</label>
            <input className="input" value={settings.promo_overline || ''} onChange={e => set('promo_overline', e.target.value)} placeholder="Limited Drop"/>
          </div>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Knoptekst</label>
            <input className="input" value={settings.promo_cta || ''} onChange={e => set('promo_cta', e.target.value)} placeholder="Ontdek nu"/>
          </div>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Knop-link</label>
            <input className="input" value={settings.promo_cta_link || ''} onChange={e => set('promo_cta_link', e.target.value)} placeholder="/shop  ·  /scholen  ·  https://…"/>
          </div>
          <div style={{ gridColumn:'1 / -1' }}>
            <label className="label" style={{ fontSize:'0.75rem' }}>Hoofdtekst</label>
            <input className="input" value={settings.promo_heading || ''} onChange={e => set('promo_heading', e.target.value)} placeholder="DE SEIZOENSCOLLECTIE|IS ER."/>
            <p style={{ fontSize:'0.7rem', color:'#aaa', marginTop:4 }}>Gebruik | als regelafbreking.</p>
          </div>
        </div>
      </div>

      {/* ── Sectietitels ── */}
      <div style={{ marginBottom:'2rem' }}>
        <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.875rem', paddingBottom:'0.5rem', borderBottom:'1px solid #f0f0f0' }}>Sectietitels</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Titel "uitgelicht"-sectie</label>
            <input className="input" value={settings.featured_title || ''} onChange={e => set('featured_title', e.target.value)} placeholder="Nieuw binnen"/>
          </div>
          <div>
            <label className="label" style={{ fontSize:'0.75rem' }}>Titel sale-sectie</label>
            <input className="input" value={settings.sale_title || ''} onChange={e => set('sale_title', e.target.value)} placeholder="Sale"/>
          </div>
        </div>
      </div>

      {/* Opslaan */}
      <button onClick={save} disabled={saving} className="btn btn-black"
        style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.85rem' }}>
        {saving  ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Opslaan…</> : null}
        {saved   ? '✓ Opgeslagen!' : (!saving ? 'Wijzigingen opslaan' : null)}
      </button>
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────
function OrderTable({ orders, onStatus, onDetail, compact }) {
  if (!orders.length) return <div style={{ padding:'2rem', textAlign:'center', color:'#aaa', fontSize:'0.85rem' }}>Geen bestellingen</div>
  return (
    <div style={{ background:'#fff', border:'1px solid #eee', borderRadius:8, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #eee' }}>
            {['#','Klant','Totaal','Datum','Status',...(onDetail?['Details']:[])].map((h,i) => (
              <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontSize:'0.7rem', fontWeight:700, color:'#888', letterSpacing:'0.08em', textTransform:'uppercase' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} style={{ borderBottom:'1px solid #f5f5f5' }}>
              <td style={{ padding:'10px 14px', fontWeight:800, color:'#000' }}>#{o.id}</td>
              <td style={{ padding:'10px 14px' }}>
                <div style={{ fontWeight:600 }}>{o.customer_name || o.shipping_name}</div>
                {!compact && <div style={{ fontSize:'0.75rem', color:'#aaa' }}>{o.shipping_email}</div>}
              </td>
              <td style={{ padding:'10px 14px', fontWeight:700 }}>€{Number(o.total).toFixed(2)}</td>
              <td style={{ padding:'10px 14px', color:'#888', fontSize:'0.8rem' }}>{new Date(o.created_at).toLocaleDateString('nl-NL')}</td>
              <td style={{ padding:'10px 14px' }}>
                {compact ? (
                  <span style={statusStyle(o.status)}>{STATUS_NL[o.status]}</span>
                ) : (
                  <select value={o.status} onChange={e => onStatus(o.id, e.target.value)}
                    style={{ padding:'5px 8px', borderRadius:6, border:'1px solid #ddd', fontSize:'0.8rem', cursor:'pointer', fontWeight:600 }}>
                    {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_NL[s]}</option>)}
                  </select>
                )}
              </td>
              {onDetail && (
                <td style={{ padding:'10px 14px' }}>
                  <button onClick={() => onDetail(o.id)}
                    style={{ padding:'5px 10px', border:'1px solid #e0e0e0', borderRadius:5, background:'#fff', cursor:'pointer', fontSize:'0.75rem', fontWeight:600, color:'#444' }}>
                    Details
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PageHeader({ title, children }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
      <h1 style={{ fontSize:'1.3rem', fontWeight:900, letterSpacing:'-0.02em' }}>{title}</h1>
      {children}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.875rem', paddingBottom:'0.5rem', borderBottom:'1px solid #f0f0f0' }}>{title}</div>
      {children}
    </div>
  )
}

function FormGroup({ label, children }) {
  return (
    <div>
      <label className="label" style={{ fontSize:'0.75rem' }}>{label}</label>
      {children}
    </div>
  )
}
