import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { StarIcon, ShoppingCartIcon, PencilIcon, TrashIcon, BoltIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const TAKA = '\u09F3';

const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedServices, setRelatedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: '' });

  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();

  // Buy Now state
  const [showBuyNow, setShowBuyNow] = useState(false);
  const [buyNowForm, setBuyNowForm] = useState({ name: '', address: '', phone: '' });
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const [buyNowError, setBuyNowError] = useState('');

  useEffect(() => {
    fetchServiceDetail();
    fetchReviews();
  }, [id]);

  const fetchServiceDetail = async () => {
    try {
      const response = await api.get(`/services/${id}/`);
      setService(response.data);
      if (Array.isArray(response.data.reviews)) {
        setReviews(response.data.reviews);
      }
      await fetchRelatedServices(response.data.category?.id, response.data.id);
    } catch (error) {
      console.error('Failed to fetch service:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedServices = async (categoryId, currentServiceId) => {
    if (!categoryId) {
      setRelatedServices([]);
      setRelatedLoading(false);
      return;
    }

    try {
      setRelatedLoading(true);
      const response = await api.get('/services/', {
        params: { category: categoryId, page_size: 8 },
      });
      const list = response.data.results || response.data || [];
      const filtered = list
        .filter((item) => Number(item.id) !== Number(currentServiceId))
        .slice(0, 4);
      setRelatedServices(filtered);
    } catch (error) {
      console.error('Failed to fetch related services:', error);
      setRelatedServices([]);
    } finally {
      setRelatedLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      setReviewsError('');
      const response = await api.get(`/services/${id}/reviews/`);
      const nextReviews = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data.results)
          ? response.data.results
          : [];
      setReviews(nextReviews);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviewsError('Live review list could not be loaded. Showing available review data instead.');
    } finally {
      setReviewsLoading(false);
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

  const handleOpenBuyNow = () => {
    if (!isAuthenticated) {
      alert('Please login to place an order');
      navigate('/login');
      return;
    }
    setBuyNowError('');
    setShowBuyNow(true);
  };

  const handleBuyNowSubmit = async (e) => {
    e.preventDefault();
    setBuyNowLoading(true);
    setBuyNowError('');
    try {
      // 1. Get or create the user's cart (safe with OneToOneField)
      const cartRes = await api.post('/carts/');
      const cart = cartRes.data;
      const cartId = cart.id;

      // 2. Clear any existing items from the cart so we only buy this service
      if (cart.items && cart.items.length > 0) {
        await Promise.all(
          cart.items.map((item) => api.delete(`/carts/${cartId}/items/${item.id}/`))
        );
      }

      // 3. Add only this service to the cart
      await api.post(`/carts/${cartId}/items/`, { service: service.id, quantity: 1 });

      // 4. Create order from the cart
      const orderRes = await api.post('/orders/', { cart_id: cartId });
      const orderId = orderRes.data.id;

      // 5. Initiate payment and redirect directly to SSLCommerz gateway
      const payRes = await api.post(`/orders/${orderId}/pay/`, {
        phone: buyNowForm.phone,
        address: buyNowForm.address,
        city: 'Dhaka',
      });

      if (payRes.data.status === 'success' && payRes.data.gateway_url) {
        setShowBuyNow(false);
        window.location.href = payRes.data.gateway_url;
      } else {
        setBuyNowError('Payment initiation failed. Please try again.');
      }
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.detail ||
        data?.cart_id?.[0] ||
        data?.non_field_errors?.[0] ||
        'Failed to place order. Please try again.';
      setBuyNowError(msg);
    } finally {
      setBuyNowLoading(false);
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
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="skeleton h-10 w-32 mb-6 rounded-lg" />
          <div className="bg-white rounded-2xl p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="skeleton h-96 rounded-xl" />
              <div className="space-y-4">
                <div className="skeleton h-8 w-3/4 rounded-lg" />
                <div className="skeleton h-6 w-1/2 rounded-lg" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-5/6 rounded" />
                <div className="skeleton h-12 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-red-600">Service not found</div></div>;
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => navigate('/services')} className="mb-6 px-4 py-2 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold rounded-lg transition-colors animate-fade-in-up">
          â† Back to Services
        </button>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8 animate-fade-in-up" style={{animationDelay:'0.1s'}}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div>
              {service.images && service.images.length > 0 ? (
                <div className="w-full h-96 bg-gray-200 rounded-xl overflow-hidden mb-4 card-img-zoom shadow-md group">
                  <img src={service.images[0].image} alt={service.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-xl">No Image Available</div>
              )}
              
              {service.images && service.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {service.images.slice(1).map((img, index) => (
                    <img key={index} src={img.image} alt={`${service.name} ${index + 2}`} className="w-full h-20 object-cover rounded-lg card-hover cursor-pointer" />
                  ))}
                </div>
              )}
            </div>

            <div className="animate-fade-in-up" style={{animationDelay:'0.2s'}}>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">{service.name}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl font-bold text-teal-600">{TAKA}{parseFloat(service.price).toFixed(0)}</span>
                <span className="flex items-center gap-1 text-gray-600">
                  <StarSolid className="w-5 h-5 text-yellow-400" />
                  {Number(service.avg_rating || 0).toFixed(1)} ({service.review_count ?? reviews.length} reviews)
                </span>
              </div>

              {service.category && (
                <span className="inline-block px-4 py-2 bg-teal-50 text-teal-600 font-semibold rounded-full mb-6">{service.category.name}</span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{service.description}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 btn btn-primary btn-lg justify-center"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  Add to Cart
                </button>
                <button
                  onClick={handleOpenBuyNow}
                  className="flex-1 btn btn-orange btn-lg justify-center"
                >
                  <BoltIcon className="w-5 h-5" />
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 section-heading">Customer Reviews</h2>
            {isAuthenticated && (
              <button 
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="btn btn-primary btn-sm"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>

              <button type="submit" className="btn btn-primary">Submit Review</button>
            </form>
          )}

          <div className="space-y-4">
            {reviewsError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {reviewsError}
              </div>
            )}

            {reviewsLoading ? (
              [...Array(3)].map((_, index) => (
                <div key={index} className="skeleton h-28 rounded-xl" />
              ))
            ) : reviews.length === 0 ? (
              <div className="overflow-hidden rounded-[1.75rem] border border-dashed border-teal-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#ecfeff_52%,#ffffff_100%)] px-6 py-12 text-center shadow-[0_20px_45px_-35px_rgba(13,148,136,0.45)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white text-teal-500 shadow-[0_15px_35px_-20px_rgba(13,148,136,0.45)]">
                  <StarIcon className="h-10 w-10" />
                </div>
                <h3 className="mt-6 text-3xl font-black tracking-tight text-slate-900">No Review Yet</h3>
                <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
                  This service has not received any customer feedback yet. The first review will appear here in this card with rating and experience details.
                </p>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="btn btn-primary btn-md mt-6"
                  >
                    Be The First To Review
                  </button>
                )}
              </div>
            ) : (
              reviews.map((review, ri) => (
                <div key={review.id} className="p-5 bg-gray-50 rounded-xl card-hover-light">
                  {editingReviewId === review.id ? (
                    /* Inline edit form */
                    <div>
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Rating</label>
                        <select
                          value={editForm.rating}
                          onChange={(e) => setEditForm({ ...editForm, rating: parseInt(e.target.value) })}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                          {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>)}
                        </select>
                      </div>
                      <div className="mb-3">
                        <textarea
                          value={editForm.comment}
                          onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(review.id)}
                          className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
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
                                className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
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

        <div className="mt-8 bg-white rounded-2xl shadow-sm p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 section-heading">Related Services</h2>
              <p className="mt-2 text-sm text-gray-500">
                {service.category?.name
                  ? `More services from the ${service.category.name} category`
                  : 'Explore more services that may match this need'}
              </p>
            </div>
            {service.category?.id && (
              <Link to={`/services?category=${service.category.id}`} className="btn btn-outline btn-sm">
                View More
              </Link>
            )}
          </div>

          {relatedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="skeleton h-64 rounded-2xl" />
              ))}
            </div>
          ) : relatedServices.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-cyan-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_50%,#ffffff_100%)] px-6 py-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-cyan-500 shadow-sm">
                <ShoppingCartIcon className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-2xl font-black text-slate-900">No Related Services Found</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                There are no other services available in this category right now.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {relatedServices.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="h-40 bg-gradient-to-br from-teal-100 to-cyan-100 overflow-hidden">
                    {item.images?.[0]?.image ? (
                      <img src={item.images[0].image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-teal-500">
                        <StarIcon className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-600">
                      Related Service
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-gray-800 line-clamp-2 min-h-[3.5rem]">
                      {item.name}
                    </h3>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xl font-bold text-teal-600">
                        {TAKA}{parseFloat(item.price).toFixed(0)}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <StarSolid className="w-4 h-4 text-yellow-400" />
                        {Number(item.avg_rating || 0).toFixed(1)}
                      </span>
                    </div>
                    <Link to={`/services/${item.id}`} className="btn btn-primary btn-sm btn-block mt-4">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* â”€â”€ Buy Now Modal â”€â”€ */}
      {showBuyNow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Quick Order</h2>
              <button
                onClick={() => setShowBuyNow(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Service summary */}
            <div className="mb-5 p-4 bg-teal-50 rounded-xl flex items-center gap-3">
              {service.images?.[0]?.image ? (
                <img src={service.images[0].image} alt={service.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-teal-200 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{service.name}</p>
                <p className="text-xl font-bold text-teal-600 mt-0.5">{TAKA}{parseFloat(service.price).toFixed(0)}</p>
              </div>
            </div>

            {/* Error */}
            {buyNowError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                {buyNowError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleBuyNowSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={buyNowForm.name}
                  onChange={(e) => setBuyNowForm({ ...buyNowForm, name: e.target.value })}
                  placeholder="à¦†à¦ªà¦¨à¦¾à¦° à¦ªà§‚à¦°à§à¦£ à¦¨à¦¾à¦® à¦²à¦¿à¦–à§à¦¨"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows="2"
                  value={buyNowForm.address}
                  onChange={(e) => setBuyNowForm({ ...buyNowForm, address: e.target.value })}
                  placeholder="à¦†à¦ªà¦¨à¦¾à¦° à¦¸à¦®à§à¦ªà§‚à¦°à§à¦£ à¦ à¦¿à¦•à¦¾à¦¨à¦¾ à¦²à¦¿à¦–à§à¦¨"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={buyNowForm.phone}
                  onChange={(e) => setBuyNowForm({ ...buyNowForm, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={buyNowLoading}
                className="w-full btn btn-orange btn-lg justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buyNowLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BoltIcon className="w-5 h-5" />
                    Proceed to Pay
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceDetail;

