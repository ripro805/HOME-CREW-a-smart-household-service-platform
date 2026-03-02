import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  const getStatusColor = (status) => {
    const colors = {
      NOT_PAID: '#ff9800',
      READY_TO_SHIP: '#2196F3',
      SHIPPED: '#9c27b0',
      DELIVERED: '#4caf50',
      CANCELLED: '#f44336',
    };
    return colors[status] || '#999';
  };

  const getStatusLabel = (status) => {
    const labels = {
      NOT_PAID: 'Not Paid',
      READY_TO_SHIP: 'Ready to Ship',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) return <div className="loading">Loading order details...</div>;

  if (error) {
    return (
      <div className="order-detail-page">
        <div className="error-box">
          <p>{error}</p>
          <button className="btn-back" onClick={() => navigate('/orders')}>
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
    <div className="order-detail-page">
      <button className="btn-back" onClick={() => navigate('/orders')}>
        ← Back to Orders
      </button>

      <div className="order-detail-card">
        {/* Header */}
        <div className="detail-header">
          <div className="detail-title">
            <h1>Order #{order.id}</h1>
            <span className="detail-date">
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
          <span
            className="detail-status"
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>

        {/* Items */}
        <div className="detail-section">
          <h2>Services Ordered</h2>
          <div className="detail-items">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <div key={index} className="detail-item">
                  <div className="detail-item-img">
                    {item.service?.images?.[0]?.image ? (
                      <img src={item.service.images[0].image} alt={item.service.name} />
                    ) : (
                      <div className="img-placeholder">🔧</div>
                    )}
                  </div>
                  <div className="detail-item-info">
                    <h3>{item.service?.name || 'Service'}</h3>
                    {item.service?.category?.name && (
                      <span className="item-category">{item.service.category.name}</span>
                    )}
                    <span className="item-unit-price">
                      Unit price: ${parseFloat(item.service?.price || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="detail-item-right">
                    <span className="detail-qty">Qty: {item.quantity}</span>
                    <span className="detail-item-total">
                      ${(parseFloat(item.service?.price || 0) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-items">No items found in this order.</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="detail-section detail-summary">
          <h2>Order Summary</h2>
          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal ({order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''})</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>${parseFloat(order.total_price || subtotal).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
