import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Welcome to HomeCrew</h1>
          <p className="hero-subtitle">
            Your trusted platform for household services
          </p>
          <p className="hero-description">
            Find professional services for all your home needs. From cleaning to repairs,
            we've got you covered with quality service providers.
          </p>
          
          <div className="hero-actions">
            {isAuthenticated ? (
              <>
                <Link to="/services" className="btn-hero-primary">
                  Browse Services
                </Link>
                <Link to="/orders" className="btn-hero-secondary">
                  My Orders
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn-hero-primary">
                  Get Started
                </Link>
                <Link to="/login" className="btn-hero-secondary">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="hero-image">
          <div className="hero-card">
            <div className="hero-card-icon">🏠</div>
            <h3>Quality Services</h3>
            <p>Professional and reliable</p>
          </div>
          <div className="hero-card">
            <div className="hero-card-icon">⭐</div>
            <h3>Rated by Users</h3>
            <p>Real reviews from clients</p>
          </div>
          <div className="hero-card">
            <div className="hero-card-icon">🚀</div>
            <h3>Quick Booking</h3>
            <p>Easy and fast service</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose HomeCrew?</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Verified Professionals</h3>
            <p>All our service providers are thoroughly vetted and verified</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Transparent Pricing</h3>
            <p>No hidden fees. Know exactly what you're paying for</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Secure Platform</h3>
            <p>Your data and transactions are safe with us</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Easy to Use</h3>
            <p>Simple interface to book and manage your services</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3>24/7 Support</h3>
            <p>We're here to help you anytime you need</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>Quality Guaranteed</h3>
            <p>We ensure satisfaction with every service</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Join thousands of satisfied customers</p>
        <Link to="/services" className="btn-cta">
          Explore Services
        </Link>
      </section>
    </div>
  );
};

export default Home;
