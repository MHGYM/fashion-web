import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage    from './pages/HomePage'
import ShopPage    from './pages/ShopPage'
import ProductPage from './pages/ProductPage'
import CartPage    from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import AccountPage from './pages/AccountPage'
import AdminPage   from './pages/AdminPage'
import AuthPage    from './pages/AuthPage'
import SchoolsPage from './pages/SchoolsPage'
import SchoolShopPage from './pages/SchoolShopPage'
import SchoolDashboardPage from './pages/SchoolDashboardPage'
import MockPayPage from './pages/MockPayPage'
import PaymentReturnPage from './pages/PaymentReturnPage'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/"            element={<HomePage />} />
              <Route path="/shop"        element={<ShopPage />} />
              <Route path="/shop/:slug"  element={<ProductPage />} />
              <Route path="/cart"        element={<CartPage />} />
              <Route path="/checkout"    element={<CheckoutPage />} />
              <Route path="/account"     element={<AccountPage />} />
              <Route path="/admin"       element={<AdminPage />} />
              <Route path="/scholen"     element={<SchoolsPage />} />
              <Route path="/s/:slug"     element={<SchoolShopPage />} />
              <Route path="/dashboard"   element={<SchoolDashboardPage />} />
              <Route path="/betalen/mock/:paymentId" element={<MockPayPage />} />
              <Route path="/bestelling/:id/status"   element={<PaymentReturnPage />} />
              <Route path="/login"       element={<AuthPage mode="login" />} />
              <Route path="/register"    element={<AuthPage mode="register" />} />
              <Route path="*"            element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
