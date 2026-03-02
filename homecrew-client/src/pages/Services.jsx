import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Services.css';

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [selectedCategory]); // Re-fetch when category changes

  const fetchServices = async () => {
    try {
      setLoading(true);
      // Add category filter to API call
      const params = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      const response = await api.get('/services/', { params });
      // Backend returns paginated data: {count, next, previous, results}
      setServices(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Fetch all categories without pagination
      const response = await api.get('/categories/?page_size=100');
      // Backend returns paginated data: {count, next, previous, results}
      setCategories(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleAddToCart = async (serviceId) => {
    if (!isAuthenticated) {
      alert('Please login to add items to cart');
      return;
    }

    const result = await addToCart(serviceId);
    if (result.success) {
      alert('Added to cart successfully!');
    } else {
      alert('Failed to add to cart');
    }
  };

  const filteredServices = services.filter(service => {
    // Only filter by search term, category filtering is done on backend
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return <div className="loading">Loading services...</div>;
  }

  return (
    <div className="services-page">
      <div className="services-header">
        <h1>Our Services</h1>
        <p>Find the perfect household service for your needs</p>
      </div>

      <div className="services-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-filter">
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="services-grid">
        {filteredServices.length === 0 ? (
          <p className="no-services">No services found</p>
        ) : (
          filteredServices.map(service => (
            <div key={service.id} className="service-card">
              <div className="service-image">
                {service.images && service.images.length > 0 ? (
                  <img src={service.images[0].image} alt={service.name} />
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </div>
              
              <div className="service-content">
                <h3>{service.name}</h3>
                <p className="service-description">{service.description}</p>
                
                <div className="service-meta">
                  <span className="service-price">${parseFloat(service.price).toFixed(2)}</span>
                  <span className="service-rating">
                    ⭐ {service.avg_rating.toFixed(1)}
                  </span>
                </div>

                {service.category && (
                  <span className="service-category">{service.category.name}</span>
                )}

                <div className="service-actions">
                  <Link to={`/services/${service.id}`} className="btn-secondary">
                    View Details
                  </Link>
                  <button 
                    onClick={() => handleAddToCart(service.id)}
                    className="btn-primary"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Services;
