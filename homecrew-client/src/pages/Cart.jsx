import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { TrashIcon, MinusIcon, PlusIcon, ShoppingBagIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, cartItems, updateCartItem, removeFromCart, getTotalPrice, loading, fetchCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Please login to view your cart</h2>
          <button onClick={() => navigate('/login')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
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

  const handleRemove = (itemId, serviceName) => {
    setItemToRemove({ id: itemId, name: serviceName });
    setShowRemoveModal(true);
  };

  const confirmRemove = async () => {
    if (itemToRemove) {
      await removeFromCart(itemToRemove.id);
      setShowRemoveModal(false);
      setItemToRemove(null);
    }
  };

  const cancelRemove = () => {
    setShowRemoveModal(false);
    setItemToRemove(null);
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-gray-600">Loading cart...</div></div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-4">Add some services to get started!</p>
          <button onClick={() => navigate('/services')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors">
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
        
        {/* Confirmation Modal */}
        {showRemoveModal && (
          <>
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={cancelRemove}
            ></div>
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 p-6 w-96">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                <h2 className="text-xl font-bold text-gray-800">Remove Item</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove <span className="font-semibold">{itemToRemove?.name}</span> from your cart?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmRemove}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Remove
                </button>
                <button
                  onClick={cancelRemove}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-4">
            {cartItems.map(item => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-32 h-32 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                  {item.service.images && item.service.images.length > 0 ? (
                    <img src={item.service.images[0].image} alt={item.service.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{item.service.name}</h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.service.description}</p>
                  <span className="text-sm text-gray-500">৳{parseFloat(item.service.price).toFixed(0)} each</span>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-end gap-4">
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                    <button 
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 font-semibold text-gray-800">{item.quantity}</span>
                    <button 
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xl font-bold text-indigo-600">
                    ৳{Math.round(parseFloat(item.service.price) * item.quantity)}
                  </div>

                  <button 
                    onClick={() => handleRemove(item.id, item.service.name)} 
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-sm rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:w-96">
            <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">৳{Math.round(getTotalPrice())}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Tax (10%):</span>
                  <span className="font-semibold">৳{Math.round(getTotalPrice() * 0.1)}</span>
                </div>

                <div className="border-t border-gray-200 pt-3"></div>

                <div className="flex justify-between text-lg font-bold text-gray-800">
                  <span>Total:</span>
                  <span className="text-indigo-600">৳{Math.round(getTotalPrice() * 1.1)}</span>
                </div>
              </div>

              <button onClick={handleCheckout} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors mb-3">
                Proceed to Checkout
              </button>

              <button onClick={() => navigate('/services')} className="w-full py-3 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-xl transition-colors">
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
