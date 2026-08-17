import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, User, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <svg className="navbar-logo-mark" viewBox="0 0 108 62" aria-hidden="true">
            <path d="M0,0 h41 v13 h-27 v11 h22 v13 h-22 v25 h-14 z"/>
            <path d="M53,0 h15 l13,26 l13,-26 h15 v62 h-14 v-35 l-11,22 h-6 l-11,-22 v35 h-14 z"/>
          </svg>
          <span className="navbar-logo-text">FightMarketing</span>
        </Link>

        <div className="navbar-links">
          <Link to="/shop">Shop</Link>
          {/* Gewone <a>, geen React-Router <Link>: /configurator/ is een losse
              statische pagina buiten de SPA. Een <Link> zou hier proberen
              client-side te routeren en op de SPA's 404 uitkomen i.p.v. een
              echte paginalaad te doen. */}
          <a href="/configurator/">Customise ✨</a>
          <Link to="/scholen">Scholen</Link>
          <Link to="/shop?gender=men">Heren</Link>
          <Link to="/shop?gender=women">Dames</Link>
          <Link to="/shop?sale=1">Sale 🔥</Link>
        </div>

        <div className="navbar-actions">
          <button className="cart-btn" aria-label={`Winkelwagen (${count} artikelen)`} onClick={() => navigate('/cart')}>
            <ShoppingBag size={22} />
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>
          {user ? (
            <div style={{ position:'relative', display:'flex', gap:8 }}>
              {user.role === 'admin' && <Link to="/admin" className="btn btn-sm btn-outline">Admin</Link>}
              {user.role === 'school' && <Link to="/dashboard" className="btn btn-sm btn-outline">Dashboard</Link>}
              <Link to="/account" className="btn btn-sm btn-outline">
                <User size={16} /> {user.first_name}
              </Link>
            </div>
          ) : (
            <Link to="/login" className="btn btn-sm btn-black">Inloggen</Link>
          )}
          <button className="mobile-menu-btn" aria-label={menuOpen ? 'Menu sluiten' : 'Menu openen'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu">
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
          {/* Zelfde reden als hierboven: echte paginalaad naar de losse
              statische configurator-pagina, geen SPA-route. */}
          <a href="/configurator/" onClick={() => setMenuOpen(false)}>Customise ✨</a>
          {[['/scholen', 'Scholen'], ['/shop?gender=men', 'Heren'], ['/shop?gender=women', 'Dames'], ['/shop?sale=1', 'Sale']].map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</Link>
          ))}
          {user ? (
            <>
              <Link to="/account" onClick={() => setMenuOpen(false)}>Mijn account</Link>
              <button onClick={() => { logout(); setMenuOpen(false) }} style={{ background:'none', border:'none', textAlign:'left', fontWeight:700, fontSize:'0.85rem', letterSpacing:'0.08em', textTransform:'uppercase', color:'#dc2626', cursor:'pointer' }}>Uitloggen</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)}>Inloggen / Registreren</Link>
          )}
        </div>
      )}
    </nav>
  )
}
