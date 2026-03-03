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
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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
      setEditing(false);
      setProfileImage(null);
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

  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition";

  const getStatusBadgeClass = (status) => {
    const baseClass = "px-3 py-1 rounded-full text-xs font-semibold";
    const statusColors = {
      'NOT_PAID': 'bg-orange-100 text-orange-700',
      'READY_TO_SHIP': 'bg-navy-100 text-navy-700',
      'SHIPPED': 'bg-cyan-100 text-cyan-700',
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

  const sidebarItems = [
    { id: 'profile', label: 'Profile Details', icon: UserCircleIcon },
    { id: 'orders', label: 'My Orders', icon: ShoppingBagIcon },
    { id: 'update', label: 'Update Profile', icon: PencilIcon },
    { id: 'change-password', label: 'Change Password', icon: KeyIcon },
    { id: 'reset-password', label: 'Reset Password', icon: LockClosedIcon },
    { id: 'logout', label: 'Logout', icon: ArrowRightOnRectangleIcon },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-rose-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-72 bg-white rounded-3xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            {/* Profile Header Card */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500 via-cyan-500 to-rose-500 rounded-2xl blur opacity-30"></div>
              <div className="relative bg-white rounded-2xl p-5 border-2 border-gradient">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-teal-100 flex-shrink-0">
                      {profileImagePreview ? (
                        <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-500 via-cyan-500 to-rose-500 flex items-center justify-center text-white text-xl font-bold">
                          {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 truncate">{profile.first_name} {profile.last_name}</h3>
                    <span className="inline-block px-2 py-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-semibold rounded-full mt-1">
                      {profile.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'logout') {
                        handleLogout();
                      } else {
                        setActiveTab(item.id);
                        setEditing(false);
                      }
                    }}
                    className={`group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md scale-105' 
                        : item.id === 'logout'
                        ? 'text-red-600 hover:bg-red-50 hover:scale-105'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 hover:scale-105'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <UserCircleIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Profile Details</h2>
                    <p className="text-sm text-gray-500">View your personal information</p>
                  </div>
                </div>
                
                {/* Profile Picture */}
                <div className="mb-8 flex justify-center">
                  <div className="relative">
                    <div className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-teal-100 shadow-xl">
                      {profileImagePreview ? (
                        <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-teal-500 via-cyan-500 to-rose-500 flex items-center justify-center text-white text-5xl font-bold">
                          {profile.first_name?.charAt(0)}{profile.last_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-5 border border-teal-100">
                    <label className="block text-xs font-semibold text-teal-600 mb-2 uppercase tracking-wide">Full Name</label>
                    <p className="text-gray-800 text-lg font-semibold">{profile.first_name} {profile.last_name}</p>
                  </div>
                  <div className="bg-gradient-to-br from-navy-50 to-cyan-50 rounded-2xl p-5 border border-navy-100">
                    <label className="block text-xs font-semibold text-navy-600 mb-2 uppercase tracking-wide">Email</label>
                    <p className="text-gray-800 font-medium break-all">{profile.email}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100">
                    <label className="block text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">Phone Number</label>
                    <p className="text-gray-800 font-medium">{profile.phone_number || 'Not provided'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100">
                    <label className="block text-xs font-semibold text-orange-600 mb-2 uppercase tracking-wide">Address</label>
                    <p className="text-gray-800 font-medium">{profile.address || 'Not provided'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50 to-rose-50 rounded-2xl p-5 border border-rose-100 md:col-span-2">
                    <label className="block text-xs font-semibold text-rose-600 mb-2 uppercase tracking-wide">Bio</label>
                    <p className="text-gray-800 font-medium">{profile.bio || 'No bio provided'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-violet-50 rounded-2xl p-5 border border-cyan-100 md:col-span-2">
                    <label className="block text-xs font-semibold text-cyan-600 mb-2 uppercase tracking-wide">Member Since</label>
                    <p className="text-gray-800 font-medium">{new Date(profile.date_joined).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <ShoppingBagIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">My Orders</h2>
                    <p className="text-sm text-gray-500">Track and manage your orders</p>
                  </div>
                </div>
                {orders.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBagIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No orders found</p>
                    <p className="text-gray-400 text-sm mt-2">Start shopping to create your first order</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order.id} className="relative group bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-6 hover:border-teal-300 hover:shadow-xl transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-gray-800 text-lg">Order #{order.id}</h3>
                              <span className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className={getStatusBadgeClass(order.status) + ' shadow-md'}>
                                {order.status.replace('_', ' ')}
                              </div>
                              <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                ${parseFloat(order.total_price).toFixed(2)}
                              </span>
                            </div>
                          </div>

                        {order.items && (
                          <div className="space-y-2 mb-3 pt-3 border-t border-gray-100">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-700">{item.service?.name} (x{item.quantity})</span>
                                <span className="text-gray-600">${(parseFloat(item.service?.price || 0) * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl hover:from-teal-700 hover:to-cyan-700 font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                            >
                              View Details
                            </button>
                            {order.status === 'DELIVERED' ? (
                              <span className="px-4 py-2.5 bg-gray-100 text-gray-500 text-sm font-medium rounded-xl italic">Cannot be cancelled</span>
                            ) : order.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'update' && (
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <PencilIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Update Profile</h2>
                    <p className="text-sm text-gray-500">Modify your personal information</p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Profile Picture Upload */}
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border-2 border-dashed border-teal-200">
                    <label className="block text-sm font-bold text-teal-700 mb-4 uppercase tracking-wide">Profile Picture</label>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-teal-200 shadow-lg">
                          {profileImagePreview ? (
                            <img src={profileImagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-teal-500 via-cyan-500 to-rose-500 flex items-center justify-center text-white text-3xl font-bold">
                              {formData.first_name?.charAt(0)}{formData.last_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center shadow-lg">
                          <PencilIcon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <input
                          type="file"
                          id="profile_pic"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="profile_pic"
                          className="cursor-pointer inline-block px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105"
                        >
                          Choose New Image
                        </label>
                        <p className="text-xs text-gray-600 mt-3">PNG, JPG or JPEG (Max 5MB)</p>
                        <p className="text-xs text-teal-600 font-semibold mt-1">Recommended: 400x400px</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">First Name</label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Last Name</label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed font-medium"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <small className="text-xs text-gray-600 font-medium">Email address cannot be changed</small>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="phone_number" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Phone Number</label>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="Enter your phone number"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Address</label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows="3"
                      placeholder="Enter your full address"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none font-medium resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="bio" className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Bio</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows="3"
                      placeholder="Tell us about yourself..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 transition-all outline-none font-medium resize-none"
                    />
                  </div>
                  <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-600 via-cyan-600 to-rose-600 hover:from-teal-700 hover:via-cyan-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105">
                    <CheckIcon className="w-6 h-6" />
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'change-password' && (
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <KeyIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
                    <p className="text-sm text-gray-500">Update your account password</p>
                  </div>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                  <div>
                    <label htmlFor="old_password" className="block text-sm font-semibold text-gray-700 mb-1">Current Password</label>
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
                    <label htmlFor="new_password" className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
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
                    <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
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
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <ExclamationCircleIcon className="w-5 h-5" />
                      Passwords do not match
                    </div>
                  )}
                  <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105">
                    <KeyIcon className="w-6 h-6" />
                    Change Password
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'reset-password' && (
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <LockClosedIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Reset Password via Email</h2>
                    <p className="text-sm text-gray-500">Receive a reset link in your inbox</p>
                  </div>
                </div>
                <form onSubmit={handlePasswordReset} className="space-y-6 max-w-md">
                  <div className="bg-gradient-to-br from-navy-50 to-cyan-50 border-2 border-navy-200 rounded-2xl p-5 mb-6">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-navy-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-navy-800 font-medium">
                        A password reset link will be sent to your email address. Click the link to set a new password.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reset_email" className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      id="reset_email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </div>
                  <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-navy-600 to-cyan-600 hover:from-navy-700 hover:to-cyan-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105">
                    <LockClosedIcon className="w-6 h-6" />
                    Send Reset Link
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
