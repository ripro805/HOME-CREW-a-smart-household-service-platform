import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await api.get('/carts/');
      const carts = response.data.results || response.data;
      if (carts.length > 0) {
        const userCart = carts[0];
        setCart(userCart);
        
        // Fetch cart items
        const itemsResponse = await api.get(`/carts/${userCart.id}/items/`);
        setCartItems(itemsResponse.data.results || itemsResponse.data);
      } else {
        setCart(null);
        setCartItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (serviceId, quantity = 1) => {
    try {
      if (!cart) {
        // Create cart first
        const cartResponse = await api.post('/carts/', {});
        setCart(cartResponse.data);
        
        // Add item to new cart
        const itemResponse = await api.post(`/carts/${cartResponse.data.id}/items/`, {
          service: serviceId,
          quantity,
        });
        setCartItems([itemResponse.data]);
      } else {
        // Check if item already exists
        const existingItem = cartItems.find(item => item.service?.id === serviceId);
        
        if (existingItem) {
          // Update quantity
          await api.patch(`/carts/${cart.id}/items/${existingItem.id}/`, {
            quantity: existingItem.quantity + quantity,
          });
        } else {
          // Add new item
          await api.post(`/carts/${cart.id}/items/`, {
            service: serviceId,
            quantity,
          });
        }
        
        await fetchCart();
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return { success: false, error: error.response?.data };
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      if (!cart) {
        console.error('No cart found');
        return { success: false, error: 'Cart not found' };
      }
      await api.patch(`/carts/${cart.id}/items/${itemId}/`, { quantity });
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to update cart item:', error);
      return { success: false, error: error.response?.data };
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      await api.delete(`/carts/${cart.id}/items/${itemId}/`);
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      return { success: false, error: error.response?.data };
    }
  };

  const clearCart = async () => {
    try {
      for (const item of cartItems) {
        await api.delete(`/carts/${cart.id}/items/${item.id}/`);
      }
      setCartItems([]);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear cart:', error);
      return { success: false, error: error.response?.data };
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.service.price) * item.quantity);
    }, 0);
  };

  const value = {
    cart,
    cartItems,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    fetchCart,
    getTotalPrice,
    cartCount: cartItems.length,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
