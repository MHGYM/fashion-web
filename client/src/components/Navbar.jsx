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
        <Link to="/" className="navbar-logo">Season<span>Fits</span></Link>

        <div className="navbar-links">
          <Link to="/shop">Shop</Link>
          <Link to="/shop?gender=men">Heren</Link>
          <Link to="/shop?gender=women">Dames</Link>
          <Link to="/shop?sale=1">Sale 🔥</Link>
        </div>

        <div className="navbar-actions">
          <button className="cart-btn" onClick={() => navigate('/cart')}>
            <ShoppingBag size={22} />
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>
          {user ? (
            <div style={{ position:'relative', display:'flex', gap:8 }}>
              {user.role === 'admin' && <Link to="/admin" className="btn btn-sm btn-outline">Admin</Link>}
              <Link to="/account" className="btn btn-sm btn-outline">
                <User size={16} /> {user.first_name}
              </Link>
            </div>
          ) : (
            <Link to="/login" className="btn btn-sm btn-black">Inloggen</Link>
          )}
          <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22}/> : <Menu size={22}/>}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="navbar-mobile-menu">
          {[['/', 'Home'], ['/shop', 'Shop'], ['/shop?gender=men', 'Heren'], ['/shop?gender=women', 'Dames'], ['/shop?sale=1', 'Sale']].map(([to, label]) => (
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
