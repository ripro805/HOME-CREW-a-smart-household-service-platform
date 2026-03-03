import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  UserCircleIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon,
  ShoppingBagIcon,
  KeyIcon,
  LockClosedIcon,
  ArrowRightOnRectangleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import defaultProfileImage from '../assets/images/images.png';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('view');
  const [orders, setOrders] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    bio: '',
  });
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [resetEmail, setResetEmail] = useState('');
  
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [isAuthenticated, activeTab]);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/accounts/profile/');
      setProfile(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        email: response.data.email || '',
        phone_number: response.data.phone_number || '',
        address: response.data.address || '',
        bio: response.data.bio || '',
      });
      setResetEmail(response.data.email || '');
      setProfileImagePreview(response.data.profile_pic);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/');
      setOrders(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('phone_number', formData.phone_number);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('bio', formData.bio);
      
      if (profileImage) {
        formDataToSend.append('profile_pic', profileImage);
      }
      
      await api.patch('/accounts/profile/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      alert('Profile updated successfully!');
      setProfileImage(null);
      setActiveTab('view');
      fetchProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New passwords do not match!');
      return;
    }

    try {
      await api.post('/accounts/change-password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      alert('Password changed successfully!');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
      alert(error.response?.data?.old_password?.[0] || 'Failed to change password');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/accounts/password-reset/', { email: resetEmail });
      alert('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Failed to send reset email:', error);
      alert('Failed to send password reset email');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await api.patch(`/orders/${orderId}/`, { status: 'CANCELLED' });
        alert('Order cancelled successfully');
        fetchOrders();
      } catch (error) {
        console.error('Failed to cancel order:', error);
        alert('Failed to cancel order');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition";

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-gray-600">Loading profile...</div></div>;
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-red-600">Failed to load profile</div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Profile</h1>
          <p className="text-gray-500">View all your profile details here</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('view')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'view'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'edit'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            My Orders
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Security
          </button>
        </div>

        {/* Main Content */}
        {activeTab === 'view' && (
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Left Panel - Profile Picture & Name */}
              <div className="lg:w-1/3 bg-white p-10 flex flex-col items-center justify-center border-r border-gray-100">
                <div className="relative mb-6">
                  <div className="w-48 h-48 rounded-full overflow-hidden border-8 border-indigo-100 shadow-2xl">
                    <img 
                      src={profileImagePreview || defaultProfileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-2 text-center text-gray-800">
                  {profile.first_name} {profile.last_name}
                </h2>
                <div className="px-4 py-1.5 bg-indigo-100 rounded-full text-sm font-semibold mb-8 text-indigo-700">
                  {profile.role === 'admin' ? '⭐ Admin User' : '👤 Premium User'}
                </div>

                {/* Social Media Section */}
                <div className="w-full">
                  <h3 className="text-lg font-semibold mb-4 text-gray-700">Social Media</h3>
                  <div className="flex gap-3 justify-center">
                    <button className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg">
                      <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                        <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                      </svg>
                    </button>
                    <button className="w-12 h-12 bg-pink-500 hover:bg-pink-600 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg">
                      <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </button>
                    <button className="w-12 h-12 bg-gray-800 hover:bg-gray-900 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg">
                      <svg className="w-6 h-6" fill="white" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel - Bio & Details */}
              <div className="lg:w-2/3 p-10">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">Bio & Other Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* My Name */}
                  <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 mb-1">My Name</p>
                    <p className="text-lg font-semibold text-gray-800">{profile.first_name} {profile.last_name}</p>
                  </div>

                  {/* Email */}
                  <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4" /> Email Address
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{profile.email}</p>
                  </div>

                  {/* Phone */}
                  <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4" /> Contact Number
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{profile.phone_number || 'Not provided'}</p>
                  </div>

                  {/* Address */}
                  <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" /> Address
                    </p>
                    <p className="text-lg font-semibold text-gray-800">{profile.address || 'Not provided'}</p>
                  </div>

                  {/* Login At */}
                  <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" /> Login At
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                  </div>

                  {/* Member Since */}
                  <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" /> Member Since
                    </p>
                    <p className="text-lg font-semibold text-gray-800">
                      {new Date(profile.date_joined).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Bio Text */}
                  {profile.bio && (
                    <div className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow md:col-span-2">
                      <p className="text-sm text-gray-500 mb-2">About Me</p>
                      <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <PencilIcon className="w-5 h-5" />
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-3 border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-all flex items-center gap-2"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Tab */}
        {activeTab === 'edit' && (
          <div className="bg-white rounded-3xl shadow-lg p-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Edit Profile</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="flex items-center gap-8 pb-8 border-b border-gray-200">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 shadow-lg">
                    <img 
                      src={profileImagePreview || defaultProfileImage} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <label
                    htmlFor="profile_pic"
                    className="absolute bottom-0 right-0 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110"
                  >
                    <CameraIcon className="w-5 h-5 text-white" />
                  </label>
                  <input
                    type="file"
                    id="profile_pic"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">Profile Picture</h3>
                  <p className="text-sm text-gray-500 mb-3">Upload a new profile picture</p>
                  <p className="text-xs text-gray-400">PNG, JPG or JPEG (Max 5MB)</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className={`${inputCls} opacity-60 cursor-not-allowed bg-gray-100`}
                />
                <small className="text-xs text-gray-500 mt-1 block">Email cannot be changed</small>
              </div>

              <div>
                <label htmlFor="phone_number" className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows="3"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows="4"
                  placeholder="Tell us about yourself..."
                  className={inputCls}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                  <CheckIcon className="w-5 h-5" />
                  Save Changes
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('view')}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  <XMarkIcon className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl shadow-lg p-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">My Orders</h2>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBagIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No orders found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border-2 border-gray-100 rounded-2xl p-6 hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">Order #{order.id}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={getStatusBadgeClass(order.status)}>
                          {order.status.replace('_', ' ')}
                        </div>
                        <span className="text-xl font-bold text-indigo-600">
                          ৳{Math.round(parseFloat(order.total_price))}
                        </span>
                      </div>
                    </div>

                    {order.items && (
                      <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.service?.name} (x{item.quantity})</span>
                            <span className="text-gray-600 font-semibold">৳{Math.round(parseFloat(item.service?.price || 0) * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="px-5 py-2 text-indigo-600 border-2 border-indigo-600 rounded-lg hover:bg-indigo-50 font-semibold text-sm transition-all"
                      >
                        View Details
                      </button>
                      {order.status === 'DELIVERED' ? (
                        <span className="px-5 py-2 text-gray-400 text-sm italic">Cannot be cancelled</span>
                      ) : order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-5 py-2 bg-red-50 text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-100 font-semibold text-sm transition-all"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-white rounded-3xl shadow-lg p-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <KeyIcon className="w-7 h-7 text-indigo-600" />
                Change Password
              </h2>
              <form onSubmit={handlePasswordChange} className="space-y-5 max-w-2xl">
                <div>
                  <label htmlFor="old_password" className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    id="old_password"
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="new_password" className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    id="new_password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
                {passwordData.new_password && passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <ExclamationCircleIcon className="w-5 h-5" />
                    Passwords do not match
                  </div>
                )}
                <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                  <KeyIcon className="w-5 h-5" />
                  Change Password
                </button>
              </form>
            </div>

            {/* Reset Password */}
            <div className="bg-white rounded-3xl shadow-lg p-10">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <LockClosedIcon className="w-7 h-7 text-indigo-600" />
                Reset Password via Email
              </h2>
              <form onSubmit={handlePasswordReset} className="space-y-5 max-w-2xl">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    A password reset link will be sent to your email address. Click the link to set a new password.
                  </p>
                </div>
                <div>
                  <label htmlFor="reset_email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    id="reset_email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className={inputCls}
                  />
                </div>
                <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                  <LockClosedIcon className="w-5 h-5" />
                  Send Reset Link
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
