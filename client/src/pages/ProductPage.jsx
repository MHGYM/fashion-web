import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingBag, ChevronLeft, Check } from 'lucide-react'
import api from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import SizeGuideGloves from '../components/SizeGuideGloves'

export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user } = useAuth()

  const [product, setProduct]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [selected, setSelected] = useState(null) // variant id
  const [adding, setAdding]     = useState(false)
  const [added, setAdded]       = useState(false)

  useEffect(() => {
    api.get(`/products/${slug}`).then(r => { setProduct(r.data); setLoading(false) }).catch(() => navigate('/shop'))
  }, [slug])

  if (loading) return <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>Laden…</div>
  if (!product) return null

  const hasSale   = product.sale_price && product.sale_price < product.price
  const discount  = hasSale ? Math.round((1 - product.sale_price / product.price) * 100) : 0
  const images    = product.images || []
  const variants  = product.variants || []
  // Maatadvies alleen bij handschoenen-categorie
  const isGloves  = `${product.category_slug || ''} ${product.category_name || ''}`.toLowerCase().includes('handschoen')

  const handleAddToCart = async () => {
    if (!user) { navigate('/login'); return }
    if (!selected) { alert('Kies een maat.'); return }
    setAdding(true)
    try {
      await addToCart(selected, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 2500)
    } catch(e) {
      alert(e.response?.data?.error || 'Fout bij toevoegen.')
    }
    setAdding(false)
  }

  return (
    <div className="product-page">
      <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', color:'var(--text-muted)', marginBottom:'1.5rem', fontWeight:500 }}>
        <ChevronLeft size={18}/> Terug
      </button>

      <div className="product-layout">
        {/* Afbeeldingen */}
        <div className="product-images">
          <div className="product-main-img">
            {images.length > 0
              ? <img src={images[activeImg]?.url} alt={product.name} />
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'6rem', background:'linear-gradient(135deg,#f0ede8,#e8e4de)' }}>👕</div>
            }
          </div>
          {images.length > 1 && (
            <div className="product-thumbs">
              {images.map((img, i) => (
                <div key={i} className={`product-thumb ${activeImg===i?'active':''}`} onClick={() => setActiveImg(i)}>
                  <img src={img.url} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="product-info">
          <div className="product-cat">{product.category_name}</div>
          <h1 className="product-name">{product.name}</h1>

          <div className="product-price">
            {hasSale ? (
              <>
                <span className="price price-sale" style={{ fontSize:'1.6rem' }}>€{Number(product.sale_price).toFixed(2)}</span>
                <span className="price-old" style={{ fontSize:'1.1rem' }}>€{Number(product.price).toFixed(2)}</span>
                <span style={{ background:'#fee2e2', color:'#dc2626', padding:'3px 8px', borderRadius:4, fontSize:'0.75rem', fontWeight:700 }}>-{discount}%</span>
              </>
            ) : (
              <span className="price" style={{ fontSize:'1.6rem' }}>€{Number(product.price).toFixed(2)}</span>
            )}
          </div>

          {product.description && <p className="product-desc">{product.description}</p>}

          {/* Maatadvies bokshandschoenen */}
          {isGloves && <SizeGuideGloves/>}

          {/* Maten */}
          {variants.length > 0 && (
            <>
              <div className="size-label">Kies je maat:</div>
              <div className="size-grid">
                {variants.map(v => (
                  <button key={v.id}
                    className={`size-btn ${selected===v.id ? 'selected' : ''}`}
                    disabled={v.stock === 0}
                    onClick={() => setSelected(v.id)}>
                    {v.size}
                    {v.stock === 0 && <span style={{ display:'block', fontSize:'0.6rem', color:'var(--text-muted)' }}>Uitverkocht</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          <button className={`btn btn-lg add-to-cart ${added ? 'btn-outline' : 'btn-black'}`}
            onClick={handleAddToCart} disabled={adding}>
            {added ? <><Check size={18}/> Toegevoegd!</> : <><ShoppingBag size={18}/> In winkelwagen</>}
          </button>

          <div style={{ marginTop:'1.5rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {[['🚀','Gratis verzending boven €50'],['↩️','30 dagen gratis retourneren'],['🔒','Veilig betalen']].map(([icon, text]) => (
              <div key={text} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', color:'var(--text-2)' }}>
                <span>{icon}</span>{text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
