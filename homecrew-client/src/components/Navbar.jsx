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
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  Bars3Icon,
  HomeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

const Navbar = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown,   setShowNotifDropdown]   = useState(false);
  const [mobileOpen,          setMobileOpen]          = useState(false);
  const [orders, setOrders] = useState([]);
  const [supportConversations, setSupportConversations] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('notif_read') || '[]'); } catch { return []; }
  });
  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);

  const triggerHomeLogoIntro = () => {
    window.dispatchEvent(new CustomEvent('home-logo-intro'));
  };

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      api.get('/orders/').then(r => setOrders(r.data.results || r.data || [])).catch(() => {});
    }
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) {
      setSupportConversations([]);
      return undefined;
    }

    let isMounted = true;

    const fetchSupportConversations = async () => {
      try {
        const response = await api.get('/support/conversations/');
        if (isMounted) {
          setSupportConversations(response.data.results || response.data || []);
        }
      } catch {
        if (isMounted) {
          setSupportConversations([]);
        }
      }
    };

    fetchSupportConversations();
    const intervalId = window.setInterval(fetchSupportConversations, 12000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, isAdmin]);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowProfileDropdown(false);
    setMobileOpen(false);
  };

  // Build notifications
  const notifications = [
    ...orders.map(o => {
      const statusMap = {
        NOT_PAID:      { icon:'bag',     color:'orange', msg:`Order #${o.id} placed - awaiting payment` },
        READY_TO_SHIP: { icon:'check',   color:'blue',   msg:`Order #${o.id} confirmed by HomeCrew` },
        SHIPPED:       { icon:'truck',   color:'purple', msg:`Order #${o.id} is now ongoing` },
        DELIVERED:     { icon:'check',   color:'green',  msg:`Order #${o.id} completed successfully` },
        CANCELLED:     { icon:'x',       color:'red',    msg:`Order #${o.id} was cancelled` },
      };
      const s = statusMap[o.status] || { icon:'bag', color:'gray', msg:`Order #${o.id} update` };
      return { id:`order-${o.id}`, icon:s.icon, color:s.color, msg:s.msg, time:o.created_at, link:`/orders/${o.id}` };
    }),
    { id:'promo-1', icon:'tag',     color:'indigo', msg:'50% off on Home Cleaning this weekend!', time:null, link:'/services' },
    { id:'promo-2', icon:'sparkle', color:'amber',  msg:'New service added: Pest Control',         time:null, link:'/services' },
  ];

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;
  const supportUnreadCount = supportConversations.reduce(
    (sum, conversation) => sum + (conversation.unread_count || 0),
    0
  );

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
    const cls = 'w-5 h-5';
    const colors = { orange:'text-orange-500', blue:'text-blue-500', purple:'text-cyan-500', green:'text-green-500', red:'text-red-500', indigo:'text-teal-500', amber:'text-amber-500', gray:'text-gray-500' };
    const c = colors[color] || 'text-gray-500';
    if (type==='bag')     return <ShoppingBagIcon  className={`${cls} ${c}`} />;
    if (type==='check')   return <CheckCircleIcon  className={`${cls} ${c}`} />;
    if (type==='truck')   return <TruckIcon        className={`${cls} ${c}`} />;
    if (type==='x')       return <XMarkIcon        className={`${cls} ${c}`} />;
    if (type==='tag')     return <TagIcon          className={`${cls} ${c}`} />;
    if (type==='sparkle') return <SparklesIcon     className={`${cls} ${c}`} />;
    return <BellIcon className={`${cls} ${c}`} />;
  };

  const bgColors = { orange:'bg-orange-50', blue:'bg-blue-50', purple:'bg-cyan-50', green:'bg-green-50', red:'bg-red-50', indigo:'bg-teal-50', amber:'bg-amber-50', gray:'bg-gray-50' };

  const fmtTime = t => {
    if (!t) return 'Promo';
    const d = new Date(t); const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
  };

  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowProfileDropdown(false);
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      {/* ==================== DESKTOP / TABLET NAVBAR ==================== */}
      <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 animate-fade-in-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">

          {/* Logo */}
          <Link to={isAdmin ? '/preview-home' : '/'} onClick={triggerHomeLogoIntro} className="flex items-center gap-2 text-teal-600 font-bold text-xl no-underline">
            <img src={logo} alt="HomeCrew" className="h-14 w-auto object-contain" />
            <span className="hidden sm:inline" style={{ fontFamily:'Eater, cursive', fontSize:'2rem' }}>HomeCrew</span>
          </Link>

          {/* Center links - desktop only */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-6">
            <Link to="/" onClick={triggerHomeLogoIntro} className="px-4 py-2 text-gray-700 hover:text-teal-600 font-semibold text-base transition-colors rounded-lg hover:bg-teal-50 link-underline">
              Home
            </Link>
            <Link to="/about" className="px-4 py-2 text-gray-700 hover:text-teal-600 font-semibold text-base transition-colors rounded-lg hover:bg-teal-50 link-underline">
              About Us
            </Link>
            {isAuthenticated && !isAdmin && (
              <Link to="/services" className="px-4 py-2 text-gray-700 hover:text-teal-600 font-semibold text-base transition-colors rounded-lg hover:bg-teal-50 link-underline">
                Services
              </Link>
            )}
            <Link to="/contact" className="px-4 py-2 text-gray-700 hover:text-teal-600 font-semibold text-base transition-colors rounded-lg hover:bg-teal-50 link-underline">
              Contact
            </Link>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <>
                {/* Auth buttons - desktop only */}
                <Link to="/login"    className="hidden md:inline-flex btn btn-outline btn-sm">Sign In</Link>
                <Link to="/register" className="hidden md:inline-flex btn btn-primary btn-sm">Sign Up</Link>
              </>
            ) : isAdmin ? (
              <>
                <Link to="/admin-dashboard" className="hidden md:flex px-3 py-2 text-teal-600 hover:text-teal-800 font-semibold text-sm transition-colors rounded-lg hover:bg-teal-50 items-center gap-2">
                  <Cog6ToothIcon className="w-5 h-5" /> Admin Panel
                </Link>
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setShowProfileDropdown(p => !p)} className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50">
                    <UserCircleIcon className="w-7 h-7" />
                  </button>
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 truncate">{user?.email}</div>
                      <button onClick={() => { setShowProfileDropdown(false); navigate('/admin-dashboard', { state:{ tab:'profile' } }); }} className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                        <UserCircleIcon className="w-5 h-5" /> My Profile
                      </button>
                      <button onClick={() => { setShowProfileDropdown(false); navigate('/admin-dashboard', { state:{ tab:'settings' } }); }} className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                        <Cog6ToothIcon className="w-5 h-5" /> Settings
                      </button>
                      <div className="border-t border-gray-100 mt-1" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors">
                        <ArrowRightOnRectangleIcon className="w-5 h-5" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Cart */}
                <Link to="/cart" className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50 icon-hover">
                  <ShoppingCartIcon className="w-7 h-7" />
                  {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce-in">{cartCount}</span>}
                </Link>

                <Link to="/messages" className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50 icon-hover">
                  <ChatBubbleLeftRightIcon className="w-7 h-7" />
                  {supportUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                      {supportUnreadCount > 9 ? '9+' : supportUnreadCount}
                    </span>
                  )}
                </Link>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button onClick={() => { setShowNotifDropdown(p => !p); setShowProfileDropdown(false); }} className="relative p-2 text-gray-600 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50">
                    <BellIcon className="w-7 h-7" />
                    {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>
                  {showNotifDropdown && (
                    <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <BellIcon className="w-5 h-5 text-teal-600" />
                          <span className="font-bold text-gray-800 text-base">Notifications</span>
                          {unreadCount > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">{unreadCount} new</span>}
                        </div>
                        <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-semibold">Mark all read</button>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <div className="py-12 text-center text-gray-400"><BellIcon className="w-10 h-10 mx-auto mb-3 opacity-40" /><p className="text-sm">No notifications yet</p></div>
                        ) : notifications.map(n => {
                          const isUnread = !readIds.includes(n.id);
                          return (
                            <div key={n.id} onClick={() => { markRead(n.id); setShowNotifDropdown(false); navigate(n.link); }} className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${isUnread ? 'bg-teal-50/40' : ''}`}>
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bgColors[n.color] || 'bg-gray-50'}`}>{iconEl(n.icon, n.color)}</div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{n.msg}</p>
                                <p className="text-xs text-gray-400 mt-1">{fmtTime(n.time)}</p>
                              </div>
                              {isUnread && <span className="flex-shrink-0 w-2 h-2 bg-teal-500 rounded-full mt-2" />}
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-gray-100 px-5 py-3">
                        <button onClick={() => { setShowNotifDropdown(false); navigate('/orders'); }} className="w-full text-center text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors">View all orders →</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile */}
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setShowProfileDropdown(p => !p)} className="p-2 text-gray-600 hover:text-teal-600 transition-colors rounded-lg hover:bg-teal-50">
                    <UserCircleIcon className="w-7 h-7" />
                  </button>
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors" onClick={() => setShowProfileDropdown(false)}>
                        <UserCircleIcon className="w-5 h-5" /> My Profile
                      </Link>
                      <Link to="/orders" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors" onClick={() => setShowProfileDropdown(false)}>
                        <ShoppingBagIcon className="w-5 h-5" /> My Orders
                      </Link>
                      <Link to="/messages" className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors" onClick={() => setShowProfileDropdown(false)}>
                        <ChatBubbleLeftRightIcon className="w-5 h-5" /> Messages
                      </Link>
                      <div className="border-t border-gray-100 mt-1" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors">
                        <ArrowRightOnRectangleIcon className="w-5 h-5" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Hamburger - mobile only */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-teal-50 transition border-none bg-transparent cursor-pointer ml-1"
              onClick={() => setMobileOpen(p => !p)}
              aria-label="Menu"
            >
              {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* ==================== MOBILE SIDEBAR DRAWER ==================== */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-teal-600">
          <div className="flex items-center gap-2">
            <img src={logo} alt="HomeCrew" className="h-9 w-auto object-contain brightness-200" />
            <span className="text-white font-bold text-lg" style={{ fontFamily:'Eater, cursive' }}>HomeCrew</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1 text-white hover:bg-teal-700 rounded-lg border-none bg-transparent cursor-pointer">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* User Info */}
        {isAuthenticated && (
          <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-base flex-shrink-0">
              {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate text-sm">{user?.first_name ? `${user.first_name} ${user.last_name||''}`.trim() : 'User'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <Link to="/" onClick={() => { triggerHomeLogoIntro(); setMobileOpen(false); }} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
            <HomeIcon className="w-5 h-5" /> Home
          </Link>

          <Link to="/about" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
            <UserCircleIcon className="w-5 h-5" /> About Us
          </Link>

          {isAuthenticated && !isAdmin && (
            <Link to="/services" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
              <WrenchScrewdriverIcon className="w-5 h-5" /> Services
            </Link>
          )}

          <Link to="/contact" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
            <PhoneIcon className="w-5 h-5" /> Contact
          </Link>

          {isAuthenticated && !isAdmin && (
            <Link to="/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
              <ShoppingBagIcon className="w-5 h-5" /> My Orders
            </Link>
          )}

          {isAuthenticated && !isAdmin && (
            <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
              <ShoppingCartIcon className="w-5 h-5" />
              Cart
              {cartCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
            </Link>
          )}

          {isAuthenticated && !isAdmin && (
            <Link to="/messages" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              Messages
              {supportUnreadCount > 0 && <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{supportUnreadCount}</span>}
            </Link>
          )}

          {isAuthenticated && !isAdmin && (
            <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors">
              <UserCircleIcon className="w-5 h-5" /> My Profile
            </Link>
          )}

          {isAdmin && (
            <>
              <Link to="/admin-dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-teal-700 bg-teal-50 hover:bg-teal-100 font-semibold transition-colors">
                <Cog6ToothIcon className="w-5 h-5" /> Admin Panel
              </Link>
              <button onClick={() => { setMobileOpen(false); navigate('/admin-dashboard', { state:{ tab:'profile' } }); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors border-none bg-transparent cursor-pointer text-left">
                <UserCircleIcon className="w-5 h-5" /> My Profile
              </button>
              <button onClick={() => { setMobileOpen(false); navigate('/admin-dashboard', { state:{ tab:'settings' } }); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors border-none bg-transparent cursor-pointer text-left">
                <Cog6ToothIcon className="w-5 h-5" /> Settings
              </button>
            </>
          )}

          {!isAuthenticated && (
            <div className="pt-2 space-y-2 px-1">
              <Link to="/login"    onClick={() => setMobileOpen(false)} className="flex items-center justify-center w-full px-5 py-3 font-semibold text-sm text-teal-600 border-2 border-teal-600 rounded-xl hover:bg-teal-50 transition-colors">
                Sign In
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="flex items-center justify-center w-full px-5 py-3 font-semibold text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors">
                Sign Up
              </Link>
            </div>
          )}
        </nav>

        {/* Logout at bottom */}
        {isAuthenticated && (
          <div className="px-4 py-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 font-medium transition-colors border-none bg-transparent cursor-pointer"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" /> Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
