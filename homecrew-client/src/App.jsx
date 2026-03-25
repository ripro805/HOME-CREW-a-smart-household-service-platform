import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Activate from './pages/Activate';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Categories from './pages/Categories';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';
import PaymentCancel from './pages/PaymentCancel';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import ForgotPassword from './pages/ForgotPassword';
import Contact from './pages/Contact';
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

function AppContent() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#6366f1' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          Loading…
        </div>
      </div>
    );
  }

  /* ── Admin: full-page dashboard, no navbar, redirect all routes ── */
  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        {/* Preview home page — opened in new tab from admin navbar */}
        <Route path="/preview-home" element={
          <div className="app">
            <Navbar />
            <main className="main-content"><Home /></main>
          </div>
        } />
        <Route path="/about" element={
          <div className="app"><Navbar /><main className="main-content"><About /></main></div>
        } />
        <Route path="/contact" element={
          <div className="app"><Navbar /><main className="main-content"><Contact /></main></div>
        } />
        <Route path="/categories" element={
          <div className="app"><Navbar /><main className="main-content"><Categories /></main></div>
        } />
        <Route path="/services" element={
          <div className="app"><Navbar /><main className="main-content"><Services /></main></div>
        } />
        <Route path="/services/:id" element={
          <div className="app"><Navbar /><main className="main-content"><ServiceDetail /></main></div>
        } />
        <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
      </Routes>
    );
  }

  /* ── Client: regular layout with navbar ── */
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/activate/:uid/:token" element={<Activate />} />
          <Route path="/password/reset/confirm/:uid/:token" element={<ResetPasswordConfirm />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/payment/success/:orderId" element={<PaymentSuccess />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail/:orderId" element={<PaymentFail />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
          <Route path="/payment/cancel/:orderId" element={<PaymentCancel />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          {/* Non-admin users can't access admin dashboard */}
          <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
