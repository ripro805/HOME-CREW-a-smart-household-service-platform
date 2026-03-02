import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './Orders.css';

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
      'NOT_PAID': 'Not Paid',
      'READY_TO_SHIP': 'Ready to Ship',
      'SHIPPED': 'Shipped',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="empty-orders">
          <h2>No orders yet</h2>
          <p>Start shopping to create your first order!</p>
          <button onClick={() => navigate('/services')} className="btn-primary">
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <h1>My Orders</h1>
      
      <div className="orders-list">
        {orders.map(order => (
          <div
            key={order.id}
            className="order-card"
            onClick={() => navigate(`/orders/${order.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <div className="order-header">
              <div className="order-info">
                <h3>Order #{order.id}</h3>
                <span className="order-date">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              
              <div 
                className="order-status"
                style={{ backgroundColor: getStatusColor(order.status) }}
              >
                {getStatusLabel(order.status)}
              </div>
            </div>

            <div className="order-items">
              {order.items && order.items.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-info">
                    <span className="item-name">{item.service?.name || 'Service'}</span>
                    <span className="item-quantity">Qty: {item.quantity}</span>
                  </div>
                  <span className="item-price">
                    ${(parseFloat(item.service?.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="order-total">
              <span>Total:</span>
              <span className="total-amount">${parseFloat(order.total_price).toFixed(2)}</span>
            </div>

            <div className="order-view-details">
              View Details →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Orders;
