import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { StarIcon, ShoppingCartIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });

  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();

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
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: '' });
      fetchReviews();
      fetchServiceDetail();
    } catch (error) {
      alert('Failed to submit review: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleEditStart = (review) => {
    setEditingReviewId(review.id);
    setEditForm({ rating: review.rating, comment: review.comment });
  };

  const handleEditSave = async (reviewId) => {
    try {
      await api.patch(`/services/${id}/reviews/${reviewId}/`, editForm);
      setEditingReviewId(null);
      fetchReviews();
      fetchServiceDetail();
    } catch (error) {
      alert('Failed to update review: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await api.delete(`/services/${id}/reviews/${reviewId}/`);
      fetchReviews();
      fetchServiceDetail();
    } catch (error) {
      alert('Failed to delete review: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-gray-600">Loading service details...</div></div>;
  }

  if (!service) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-red-600">Service not found</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate('/services')} className="mb-6 px-4 py-2 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-lg transition-colors">
          ← Back to Services
        </button>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div>
              {service.images && service.images.length > 0 ? (
                <div className="w-full h-96 bg-gray-200 rounded-xl overflow-hidden mb-4">
                  <img src={service.images[0].image} alt={service.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xl">No Image Available</div>
              )}
              
              {service.images && service.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {service.images.slice(1).map((img, index) => (
                    <img key={index} src={img.image} alt={`${service.name} ${index + 2}`} className="w-full h-20 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">{service.name}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl font-bold text-indigo-600">৳{parseFloat(service.price).toFixed(0)}</span>
                <span className="flex items-center gap-1 text-gray-600">
                  <StarSolid className="w-5 h-5 text-yellow-400" />
                  {service.avg_rating.toFixed(1)} ({reviews.length} reviews)
                </span>
              </div>

              {service.category && (
                <span className="inline-block px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-full mb-6">{service.category.name}</span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{service.description}</p>
              </div>

              <button onClick={handleAddToCart} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-lg">
                Add to Cart
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Customer Reviews</h2>
            {isAuthenticated && (
              <button 
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                {showReviewForm ? 'Cancel' : 'Write a Review'}
              </button>
            )}
          </div>

          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                <select 
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm({...reviewForm, rating: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
                >
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Comment</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  rows="4"
                  placeholder="Share your experience..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">Submit Review</button>
            </form>
          )}

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No reviews yet. Be the first to review!</p>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="p-5 bg-gray-50 rounded-xl">
                  {editingReviewId === review.id ? (
                    /* Inline edit form */
                    <div>
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Rating</label>
                        <select
                          value={editForm.rating}
                          onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
                        </select>
                      </div>
                      <div className="mb-3">
                        <textarea
                          value={editForm.comment}
                          onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(review.id)}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                        >Save</button>
                        <button
                          onClick={() => setEditingReviewId(null)}
                          className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                        >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* Normal review display */
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-800">
                          {review.client_name || 'Anonymous'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <StarSolid
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </span>
                          {isAuthenticated && user?.id === review.client && (
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleEditStart(review)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit review"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete review"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{review.comment}</p>
                      <span className="text-sm text-gray-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
