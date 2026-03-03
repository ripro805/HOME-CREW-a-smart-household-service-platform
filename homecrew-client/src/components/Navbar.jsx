import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import logo from '../assets/images/logo.png';
import { 
  ShoppingCartIcon, 
  UserCircleIcon, 
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  TruckIcon,
  ShoppingBagIcon,
  TagIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [orders, setOrders] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif_read') || '[]'); } catch { return []; }
  });
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      api.get('/orders/').then(r => setOrders(r.data.results || r.data || [])).catch(() => {});
    }
  }, [isAuthenticated, isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowProfileDropdown(false);
  };

  // Build notifications from orders + static promos
  const notifications = [
    ...orders.map(o => {
      const statusMap = {
        NOT_PAID:      { icon: 'bag',     color: 'orange', msg: `Order #${o.id} placed — awaiting payment` },
        READY_TO_SHIP: { icon: 'check',   color: 'blue',   msg: `Order #${o.id} confirmed by HomeCrew` },
        SHIPPED:       { icon: 'truck',   color: 'purple', msg: `Order #${o.id} is now ongoing` },
        DELIVERED:     { icon: 'check',   color: 'green',  msg: `Order #${o.id} completed successfully` },
        CANCELLED:     { icon: 'x',       color: 'red',    msg: `Order #${o.id} was cancelled` },
      };
      const s = statusMap[o.status] || { icon: 'bag', color: 'gray', msg: `Order #${o.id} update` };
      return { id: `order-${o.id}`, icon: s.icon, color: s.color, msg: s.msg, time: o.created_at, link: `/orders/${o.id}` };
    }),
    { id: 'promo-1', icon: 'tag',      color: 'indigo', msg: '🎉 50% off on Home Cleaning this weekend!', time: null, link: '/services' },
    { id: 'promo-2', icon: 'sparkle',  color: 'amber',  msg: '✨ New service added: Pest Control', time: null, link: '/services' },
  ];

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    localStorage.setItem('notif_read', JSON.stringify(allIds));
  };

  const markRead = id => {
    const updated = [...new Set([...readIds, id])];
    setReadIds(updated);
    localStorage.setItem('notif_read', JSON.stringify(updated));
  };

  const iconEl = (type, color) => {
    const cls = `w-5 h-5`;
    const colors = { orange:'text-orange-500', blue:'text-blue-500', purple:'text-purple-500', green:'text-green-500', red:'text-red-500', indigo:'text-indigo-500', amber:'text-amber-500', gray:'text-gray-500' };
    const c = colors[color] || 'text-gray-500';
    if (type === 'bag')     return <ShoppingBagIcon className={`${cls} ${c}`} />;
    if (type === 'check')   return <CheckCircleIcon className={`${cls} ${c}`} />;
    if (type === 'truck')   return <TruckIcon className={`${cls} ${c}`} />;
    if (type === 'x')       return <XMarkIcon className={`${cls} ${c}`} />;
    if (type === 'tag')     return <TagIcon className={`${cls} ${c}`} />;
    if (type === 'sparkle') return <SparklesIcon className={`${cls} ${c}`} />;
    return <BellIcon className={`${cls} ${c}`} />;
  };

  const bgColors = { orange:'bg-orange-50', blue:'bg-blue-50', purple:'bg-purple-50', green:'bg-green-50', red:'bg-red-50', indigo:'bg-indigo-50', amber:'bg-amber-50', gray:'bg-gray-50' };

  const fmtTime = t => {
    if (!t) return 'Promo';
    const d = new Date(t);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowProfileDropdown(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Left: Logo & Name */}
        <Link to={isAdmin ? '/preview-home' : '/'} className="flex items-center gap-2 text-indigo-600 font-bold text-xl no-underline">
          <img src={logo} alt="HomeCrew" className="h-14 w-auto object-contain" />
          <span>HomeCrew</span>
        </Link>

        {/* Center: Navigation Links */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-6">
          <Link to="/" className="px-4 py-2 text-gray-700 hover:text-indigo-600 font-semibold text-base transition-colors rounded-lg hover:bg-indigo-50">
            Home
          </Link>
          {isAuthenticated && !isAdmin && (
            <Link to="/services" className="px-4 py-2 text-gray-700 hover:text-indigo-600 font-semibold text-base transition-colors rounded-lg hover:bg-indigo-50">
              Services
            </Link>
          )}
        </div>

        {/* Right: Icons or Auth Buttons */}
        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="px-5 py-2 text-indigo-600 hover:text-indigo-700 font-semibold text-sm border-2 border-indigo-600 rounded-lg transition-colors hover:bg-indigo-50">
                Sign In
              </Link>
              <Link to="/register" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-colors">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              {isAdmin ? (
                <>
                  <Link to="/admin-dashboard" className="px-3 py-2 text-indigo-600 hover:text-indigo-800 font-semibold text-sm transition-colors rounded-lg hover:bg-indigo-50 flex items-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5" />
                    Admin Panel
                  </Link>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(p => !p)}
                      className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                    >
                      <UserCircleIcon className="w-7 h-7" />
                    </button>
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 truncate">{user?.email}</div>
                        <button
                          onClick={() => { setShowProfileDropdown(false); navigate('/admin-dashboard', { state: { tab: 'profile' } }); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <UserCircleIcon className="w-5 h-5" />
                          My Profile
                        </button>
                        <button
                          onClick={() => { setShowProfileDropdown(false); navigate('/admin-dashboard', { state: { tab: 'settings' } }); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <Cog6ToothIcon className="w-5 h-5" />
                          Settings
                        </button>
                        <div className="border-t border-gray-100 mt-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="w-5 h-5" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Cart Icon */}
                  <Link to="/cart" className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50">
                    <ShoppingCartIcon className="w-7 h-7" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  {/* Notification Icon with Dropdown */}
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={() => { setShowNotifDropdown(p => !p); setShowProfileDropdown(false); }}
                      className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                    >
                      <BellIcon className="w-7 h-7" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifDropdown && (
                      <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <BellIcon className="w-5 h-5 text-indigo-600" />
                            <span className="font-bold text-gray-800 text-base">Notifications</span>
                            {unreadCount > 0 && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">{unreadCount} new</span>
                            )}
                          </div>
                          <button
                            onClick={markAllRead}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                          >
                            Mark all read
                          </button>
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                          {notifications.length === 0 ? (
                            <div className="py-12 text-center text-gray-400">
                              <BellIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                              <p className="text-sm">No notifications yet</p>
                            </div>
                          ) : (
                            notifications.map(n => {
                              const isUnread = !readIds.includes(n.id);
                              return (
                                <div
                                  key={n.id}
                                  onClick={() => { markRead(n.id); setShowNotifDropdown(false); navigate(n.link); }}
                                  className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${isUnread ? 'bg-indigo-50/40' : ''}`}
                                >
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bgColors[n.color] || 'bg-gray-50'}`}>
                                    {iconEl(n.icon, n.color)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{n.msg}</p>
                                    <p className="text-xs text-gray-400 mt-1">{fmtTime(n.time)}</p>
                                  </div>
                                  {isUnread && <span className="flex-shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-2" />}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-gray-100 px-5 py-3">
                          <button
                            onClick={() => { setShowNotifDropdown(false); navigate('/orders'); }}
                            className="w-full text-center text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                          >
                            View all orders →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Icon with Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="p-2 text-gray-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                    >
                      <UserCircleIcon className="w-7 h-7" />
                    </button>

                    {/* Dropdown Menu */}
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
                        <Link 
                          to="/profile" 
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <UserCircleIcon className="w-5 h-5" />
                          My Profile
                        </Link>
                        <Link
                          to="/orders"
                          className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          <ShoppingBagIcon className="w-5 h-5" />
                          My Orders
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="w-5 h-5" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
