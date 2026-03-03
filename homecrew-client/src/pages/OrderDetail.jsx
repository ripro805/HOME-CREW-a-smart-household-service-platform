import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Buyer info passed from Buy Now flow
  const buyerInfo = location.state?.buyerInfo || {};

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrderDetail();
  }, [isAuthenticated, id]);

  const fetchOrderDetail = async () => {
    try {
      const response = await api.get(`/orders/${id}/`);
      setOrder(response.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Order not found.');
      } else {
        setError('Failed to load order details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    setPaymentProcessing(true);
    try {
      const response = await api.post(`/orders/${id}/pay/`, {
        phone: buyerInfo.phone || '01700000000',
        address: buyerInfo.address || 'Dhaka',
        city: 'Dhaka',
      });

      if (response.data.status === 'success' && response.data.gateway_url) {
        // Redirect to SSLCommerz payment gateway
        window.location.href = response.data.gateway_url;
      } else {
        alert('Failed to initiate payment. Please try again.');
        setPaymentProcessing(false);
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert(err.response?.data?.detail || 'Failed to initiate payment. Please try again.');
      setPaymentProcessing(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const baseClass = "px-4 py-2 rounded-full text-sm font-semibold";
    const statusColors = {
      'NOT_PAID': 'bg-orange-100 text-orange-700',
      'READY_TO_SHIP': 'bg-navy-100 text-navy-700',
      'SHIPPED': 'bg-cyan-100 text-cyan-700',
      'DELIVERED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
    };
    return `${baseClass} ${statusColors[status] || 'bg-gray-100 text-gray-700'}`;
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      'NOT_PAID': 'Pending Payment',
      'READY_TO_SHIP': 'Confirmed',
      'SHIPPED': 'Ongoing',
      'DELIVERED': 'Completed',
      'CANCELLED': 'Cancelled',
    };
    return statusLabels[status] || status.replace('_', ' ');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-gray-600">Loading order details...</div></div>;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <button className="px-6 py-3 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold rounded-lg transition-colors" onClick={() => navigate('/orders')}>
            ← Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const subtotal = order.items?.reduce((sum, item) => {
    return sum + parseFloat(item.service?.price || 0) * item.quantity;
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <button className="mb-6 px-4 py-2 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold rounded-lg transition-colors" onClick={() => navigate('/orders')}>
          ← Back to Orders
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-1">Order #{order.id}</h1>
              <span className="text-sm text-gray-500">
                Placed on{' '}
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <span className={getStatusBadgeClass(order.status)}>
              {getStatusLabel(order.status)}
            </span>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Services Ordered</h2>
            <div className="space-y-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
                      {item.service?.images?.[0]?.image ? (
                        <img src={item.service.images[0].image} alt={item.service.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <WrenchScrewdriverIcon className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 mb-1">{item.service?.name || 'Service'}</h3>
                      {item.service?.category?.name && (
                        <span className="inline-block px-2 py-1 bg-teal-50 text-teal-600 text-xs font-semibold rounded mb-2">{item.service.category.name}</span>
                      )}
                      <span className="block text-sm text-gray-500">
                        Unit price: ৳{parseFloat(item.service?.price || 0).toFixed(0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm text-gray-600 mb-1">Qty: {item.quantity}</span>
                      <span className="block text-lg font-bold text-teal-600">
                        ৳{Math.round(parseFloat(item.service?.price || 0) * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No items found in this order.</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''})</span>
                <span className="font-semibold">৳{Math.round(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-800 pt-3 border-t border-gray-200">
                <span>Total</span>
                <span className="text-teal-600">৳{Math.round(parseFloat(order.total_price || subtotal))}</span>
              </div>
            </div>

            {/* Payment Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              {order.can_pay ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-semibold">Payment Status:</span>
                    <span className="text-orange-600 font-semibold">{order.payment_status}</span>
                  </div>
                  <button
                    onClick={handlePayNow}
                    disabled={paymentProcessing}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {paymentProcessing ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        💳 Pay Now
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl">
                  <span className="text-gray-700 font-semibold">Payment Status:</span>
                  <span className="text-green-600 font-bold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Already Paid
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
