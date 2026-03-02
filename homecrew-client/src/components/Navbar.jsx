import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🏠</span>
          HomeCrew
        </Link>

        <div className="navbar-menu">
          <Link to="/" className="nav-link">Home</Link>

          {isAuthenticated ? (
            <>
              {isAdmin ? (
                <>
                  <Link to="/admin-dashboard" className="nav-link admin-link">Admin Panel</Link>
                  <Link to="/profile" className="nav-link">Profile</Link>
                </>
              ) : (
                <>
                  <Link to="/services" className="nav-link">Services</Link>
                  <Link to="/cart" className="nav-link cart-link">
                    Cart
                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                  </Link>
                  <Link to="/orders" className="nav-link">Orders</Link>
                  <Link to="/profile" className="nav-link">Profile</Link>
                  <button onClick={handleLogout} className="nav-button logout-btn">
                    Logout
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/services" className="nav-link">Services</Link>
              <Link to="/login" className="nav-button login-btn">Login</Link>
              <Link to="/register" className="nav-button register-btn">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
