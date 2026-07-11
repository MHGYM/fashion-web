import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import ProductCard from '../components/ProductCard'

// Fallback afbeeldingen per slug als er nog geen admin-foto is ingesteld
const CAT_FALLBACK = {
  't-shirts':      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  'hoodies':       'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800&q=80',
  'schoenen':      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  'jassen':        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
  'tassen':        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
  'shorts':        'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=800&q=80',
  'joggingbroeken':'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=800&q=80',
  'accessoires':   'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=800&q=80',
}
const DEFAULT_CAT_IMG = 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&q=80'

const HERO_DEFAULTS = {
  hero_image:   'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1920&q=80',
  hero_overline:'Hét fight gear platform van Nederland',
  hero_heading: 'JOUW CLUB.|JOUW GEAR.',
  hero_cta:     'Ontdek de shop',
}

export default function HomePage() {
  const [featured,    setFeatured]    = useState([])
  const [sale,        setSale]        = useState([])
  const [categories,  setCategories]  = useState([])
  const [hero,        setHero]        = useState(HERO_DEFAULTS)

  useEffect(() => {
    api.get('/products?featured=1').then(r => setFeatured(r.data.slice(0, 4))).catch(() => {})
    api.get('/products?sale=1').then(r => setSale(r.data.slice(0, 4))).catch(() => {})
    api.get('/products/categories').then(r => setCategories(r.data)).catch(() => {})
    api.get('/products/homepage-settings').then(r => setHero(s => ({ ...s, ...r.data }))).catch(() => {})
  }, [])

  // Heading: gebruik | als regelafbreking
  const headingLines = (hero.hero_heading || '').split('|')

  return (
    <div className="homepage">

      {/* ── Hero ─────────────────────────────────── */}
      <section className="hero-full">
        <div
          className="hero-full-bg"
          style={{ backgroundImage: `url(${hero.hero_image})` }}
        />
        <div className="hero-full-overlay" />
        <div className="hero-full-content">
          <p className="hero-overline">{hero.hero_overline}</p>
          <h1 className="hero-heading">
            {headingLines.map((line, i) => (
              <span key={i}>{line}{i < headingLines.length - 1 && <br/>}</span>
            ))}
          </h1>
          <Link to="/shop" className="hero-cta">{hero.hero_cta}</Link>
        </div>
        <div className="hero-scroll-hint">
          <span>SCROLL</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── Categorieën ──────────────────────────── */}
      {categories.length > 0 && (
        <section className="categories-section">
          <div className="categories-label">Shop per categorie</div>
          <div className="categories-grid">
            {categories.map(cat => {
              const img = cat.image_url || CAT_FALLBACK[cat.slug] || DEFAULT_CAT_IMG
              return (
                <Link key={cat.slug} to={`/shop?category=${cat.slug}`} className="category-block">
                  <div className="category-block-img" style={{ backgroundImage: `url(${img})` }} />
                  <div className="category-block-overlay" />
                  <div className="category-block-footer">
                    <span className="category-block-name">{cat.name}</span>
                    <span className="category-block-arrow">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Nieuw binnen ─────────────────────────── */}
      {featured.length > 0 && (
        <section className="home-section">
          <div className="home-section-inner">
            <div className="home-section-header">
              <h2 className="home-section-title">Nieuw binnen</h2>
              <Link to="/shop" className="home-section-link">Alles bekijken →</Link>
            </div>
            <div className="product-grid">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Promo banner ─────────────────────────── */}
      <section className="promo-banner">
        <div className="promo-banner-text">
          <p className="promo-overline">Limited Drop</p>
          <h2 className="promo-heading">DE SEIZOENS­COLLECTIE<br />IS ER.</h2>
          <Link to="/shop" className="promo-cta">Ontdek nu</Link>
        </div>
        <div
          className="promo-banner-img"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80)' }}
        />
      </section>

      {/* ── Sale ─────────────────────────────────── */}
      {sale.length > 0 && (
        <section className="home-section">
          <div className="home-section-inner">
            <div className="home-section-header">
              <h2 className="home-section-title">Sale</h2>
              <Link to="/shop?sale=1" className="home-section-link">Alle sale →</Link>
            </div>
            <div className="product-grid">
              {sale.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Lege staat */}
      {featured.length === 0 && sale.length === 0 && (
        <section className="home-section">
          <div className="home-section-inner" style={{ textAlign: 'center', padding: '6rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.15 }}>◻</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Collectie komt eraan
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Voeg je eerste producten toe via het admin panel.
            </p>
            <Link to="/shop" className="btn btn-black">Naar de shop</Link>
          </div>
        </section>
      )}

      {/* ── USP balk ─────────────────────────────── */}
      <div className="usp-bar">
        {[
          ['Snelle levering', '1–3 werkdagen'],
          ['Gratis retour', '30 dagen'],
          ['Veilig betalen', 'iDEAL & meer'],
          ['Klantenservice', 'Altijd bereikbaar'],
        ].map(([title, sub]) => (
          <div key={title} className="usp-item">
            <div className="usp-title">{title}</div>
            <div className="usp-sub">{sub}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
