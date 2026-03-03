import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ShoppingBagIcon, CheckCircleIcon, TruckIcon, XCircleIcon } from '@heroicons/react/24/outline';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/');
      // Backend may return paginated data
      setOrders(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'NOT_PAID': '#ff9800',
      'READY_TO_SHIP': '#2196F3',
      'SHIPPED': '#9c27b0',
      'DELIVERED': '#4caf50',
      'CANCELLED': '#f44336',
    };
    return colors[status] || '#999';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'NOT_PAID': 'Pending Payment',
      'READY_TO_SHIP': 'Confirmed',
      'SHIPPED': 'Ongoing',
      'DELIVERED': 'Completed',
      'CANCELLED': 'Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-gray-600">Loading orders...</div></div>;
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-600 mb-4">Start shopping to create your first order!</p>
          <button onClick={() => navigate('/services')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
    const baseClass = "px-3 py-1 rounded-full text-xs font-semibold";
    const statusColors = {
      'NOT_PAID': 'bg-orange-100 text-orange-700',
      'READY_TO_SHIP': 'bg-blue-100 text-blue-700',
      'SHIPPED': 'bg-purple-100 text-purple-700',
      'DELIVERED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
    };
    return `${baseClass} ${statusColors[status] || 'bg-gray-100 text-gray-700'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">My Orders</h1>
        
        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Order #{order.id}</h3>
                  <span className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                
                <div className={getStatusBadgeClass(order.status)}>
                  {getStatusLabel(order.status)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800">{item.service?.name || 'Service'}</span>
                      <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-600">
                      ৳{Math.round(parseFloat(item.service?.price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-semibold text-gray-700">Total:</span>
                <span className="text-xl font-bold text-indigo-600">৳{Math.round(parseFloat(order.total_price))}</span>
              </div>

              <div className="text-right text-indigo-600 font-semibold text-sm mt-3">
                View Details →
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;
