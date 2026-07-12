import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'

// Code-splitting: elke route in een eigen chunk — de homepage laadt direct
const ShopPage            = lazy(() => import('./pages/ShopPage'))
const ProductPage         = lazy(() => import('./pages/ProductPage'))
const CartPage            = lazy(() => import('./pages/CartPage'))
const CheckoutPage        = lazy(() => import('./pages/CheckoutPage'))
const AccountPage         = lazy(() => import('./pages/AccountPage'))
const AdminPage           = lazy(() => import('./pages/AdminPage'))
const AuthPage            = lazy(() => import('./pages/AuthPage'))
const SchoolsPage         = lazy(() => import('./pages/SchoolsPage'))
const SchoolShopPage      = lazy(() => import('./pages/SchoolShopPage'))
const SchoolDashboardPage = lazy(() => import('./pages/SchoolDashboardPage'))
const MockPayPage         = lazy(() => import('./pages/MockPayPage'))
const PaymentReturnPage   = lazy(() => import('./pages/PaymentReturnPage'))
const ResetPasswordPage   = lazy(() => import('./pages/ResetPasswordPage'))
const NotFoundPage        = lazy(() => import('./pages/NotFoundPage'))

const PageLoader = () => (
  <div style={{ textAlign: 'center', padding: '5rem', color: '#aaa' }} role="status">Laden…</div>
)

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="*"            element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
