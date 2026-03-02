import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import './Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, cartItems, updateCartItem, removeFromCart, getTotalPrice, loading, fetchCart } = useCart();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <h2>Please login to view your cart</h2>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    const result = await updateCartItem(itemId, newQuantity);
    if (!result.success) {
      alert('Failed to update quantity. Please try again.');
    }
  };

  const handleRemove = async (itemId) => {
    if (window.confirm('Remove this item from cart?')) {
      await removeFromCart(itemId);
    }
  };

  const handleCheckout = async () => {
    if (!cart) {
      alert('No cart found. Please add items to cart first.');
      return;
    }

    try {
      // Create order from cart
      const response = await api.post('/orders/', {
        cart_id: cart.id,
      });

      if (response.data) {
        await fetchCart();
        navigate('/orders');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      const errorMsg = error.response?.data?.cart_id?.[0] 
        || error.response?.data?.detail 
        || error.response?.data?.non_field_errors?.[0]
        || 'Failed to place order';
      alert(errorMsg);
    }
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <h2>Your cart is empty</h2>
          <p>Add some services to get started!</p>
          <button onClick={() => navigate('/services')} className="btn-primary">
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>
      
      <div className="cart-container">
        <div className="cart-items">
          {cartItems.map(item => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-image">
                {item.service.images && item.service.images.length > 0 ? (
                  <img src={item.service.images[0].image} alt={item.service.name} />
                ) : (
                  <div className="no-image-small">No Image</div>
                )}
              </div>

              <div className="cart-item-details">
                <h3>{item.service.name}</h3>
                <p className="item-description">{item.service.description}</p>
                <span className="item-price">${parseFloat(item.service.price).toFixed(2)} each</span>
              </div>

              <div className="cart-item-actions">
                <div className="quantity-control">
                  <button 
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>
                    +
                  </button>
                </div>

                <div className="item-total">
                  ${(parseFloat(item.service.price) * item.quantity).toFixed(2)}
                </div>

                <button 
                  onClick={() => handleRemove(item.id)} 
                  className="btn-remove"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>${getTotalPrice().toFixed(2)}</span>
          </div>

          <div className="summary-row">
            <span>Tax (10%):</span>
            <span>${(getTotalPrice() * 0.1).toFixed(2)}</span>
          </div>

          <div className="summary-divider"></div>

          <div className="summary-row total">
            <span>Total:</span>
            <span>${(getTotalPrice() * 1.1).toFixed(2)}</span>
          </div>

          <button onClick={handleCheckout} className="btn-checkout">
            Proceed to Checkout
          </button>

          <button onClick={() => navigate('/services')} className="btn-continue">
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
