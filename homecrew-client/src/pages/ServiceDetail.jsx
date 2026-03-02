import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Services.css';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
  });
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchServiceDetail();
    fetchReviews();
  }, [id]);

  const fetchServiceDetail = async () => {
    try {
      const response = await api.get(`/services/${id}/`);
      setService(response.data);
    } catch (error) {
      console.error('Failed to fetch service:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/services/${id}/reviews/`);
      // Backend may return paginated data
      setReviews(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }

    const result = await addToCart(service.id);
    if (result.success) {
      alert('Added to cart successfully!');
    } else {
      alert('Failed to add to cart');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Please login to submit a review');
      navigate('/login');
      return;
    }

    try {
      await api.post(`/services/${id}/reviews/`, reviewForm);
      alert('Review submitted successfully!');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: '' });
      fetchReviews();
      fetchServiceDetail(); // Refresh to update avg_rating
    } catch (error) {
      alert('Failed to submit review: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="loading">Loading service details...</div>;
  }

  if (!service) {
    return <div className="error">Service not found</div>;
  }

  return (
    <div className="service-detail-page">
      <button onClick={() => navigate('/services')} className="back-button">
        ← Back to Services
      </button>

      <div className="service-detail-container">
        <div className="service-images-section">
          {service.images && service.images.length > 0 ? (
            <div className="main-image">
              <img src={service.images[0].image} alt={service.name} />
            </div>
          ) : (
            <div className="no-image-large">No Image Available</div>
          )}
          
          {service.images && service.images.length > 1 && (
            <div className="thumbnail-images">
              {service.images.slice(1).map((img, index) => (
                <img key={index} src={img.image} alt={`${service.name} ${index + 2}`} />
              ))}
            </div>
          )}
        </div>

        <div className="service-info-section">
          <h1>{service.name}</h1>
          
          <div className="service-meta-large">
            <span className="price-large">${parseFloat(service.price).toFixed(2)}</span>
            <span className="rating-large">
              ⭐ {service.avg_rating.toFixed(1)} ({reviews.length} reviews)
            </span>
          </div>

          {service.category && (
            <div className="category-badge">{service.category.name}</div>
          )}

          <div className="service-description-full">
            <h3>Description</h3>
            <p>{service.description}</p>
          </div>

          <button onClick={handleAddToCart} className="btn-add-to-cart">
            Add to Cart
          </button>
        </div>
      </div>

      <div className="reviews-section">
        <div className="reviews-header">
          <h2>Customer Reviews</h2>
          {isAuthenticated && (
            <button 
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="btn-write-review"
            >
              {showReviewForm ? 'Cancel' : 'Write a Review'}
            </button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={handleReviewSubmit} className="review-form">
            <div className="form-group">
              <label>Rating</label>
              <select 
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({...reviewForm, rating: parseInt(e.target.value)})}
              >
                <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                <option value="4">⭐⭐⭐⭐ (4)</option>
                <option value="3">⭐⭐⭐ (3)</option>
                <option value="2">⭐⭐ (2)</option>
                <option value="1">⭐ (1)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Comment</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                rows="4"
                placeholder="Share your experience..."
              />
            </div>

            <button type="submit" className="btn-primary">Submit Review</button>
          </form>
        )}

        <div className="reviews-list">
          {reviews.length === 0 ? (
            <p className="no-reviews">No reviews yet. Be the first to review!</p>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <span className="review-author">
                    {review.client.first_name} {review.client.last_name}
                  </span>
                  <span className="review-rating">
                    {'⭐'.repeat(review.rating)}
                  </span>
                </div>
                <p className="review-comment">{review.comment}</p>
                <span className="review-date">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
