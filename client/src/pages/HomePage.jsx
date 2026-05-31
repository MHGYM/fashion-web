import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import ProductCard from '../components/ProductCard'

const CATEGORIES = [
  {
    label: 'T-Shirts',
    slug: 't-shirts',
    img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
  },
  {
    label: 'Schoenen',
    slug: 'schoenen',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
  },
  {
    label: 'Jassen',
    slug: 'jassen',
    img: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80',
  },
  {
    label: 'Tassen',
    slug: 'tassen',
    img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
  },
]

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [sale, setSale] = useState([])

  useEffect(() => {
    api.get('/products?featured=1').then(r => setFeatured(r.data.slice(0, 4))).catch(() => {})
    api.get('/products?sale=1').then(r => setSale(r.data.slice(0, 4))).catch(() => {})
  }, [])

  return (
    <div className="homepage">

      {/* ── Hero ─────────────────────────────────── */}
      <section className="hero-full">
        <div
          className="hero-full-bg"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1920&q=80)' }}
        />
        <div className="hero-full-overlay" />
        <div className="hero-full-content">
          <p className="hero-overline">Nieuwe collectie — 2025</p>
          <h1 className="hero-heading">DEFINE<br />YOUR<br />STYLE</h1>
          <Link to="/shop" className="hero-cta">Koop Nu</Link>
        </div>
        <div className="hero-scroll-hint">
          <span>SCROLL</span>
          <div className="hero-scroll-line" />
        </div>
      </section>

      {/* ── Categorieën ──────────────────────────── */}
      <section className="categories-section">
        <div className="categories-label">Shop per categorie</div>
        <div className="categories-grid">
          {CATEGORIES.map(cat => (
            <Link key={cat.slug} to={`/shop?category=${cat.slug}`} className="category-block">
              <div className="category-block-img" style={{ backgroundImage: `url(${cat.img})` }} />
              <div className="category-block-overlay" />
              <div className="category-block-footer">
                <span className="category-block-name">{cat.label}</span>
                <span className="category-block-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

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
          <h2 className="promo-heading">DE ZOMER­COLLECTIE<br />IS ER.</h2>
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
