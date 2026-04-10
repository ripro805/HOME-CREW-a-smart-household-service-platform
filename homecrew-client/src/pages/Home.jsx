// Helper: pick one service per category
function pickOnePerCategory(services) {
  const map = {};
  services.forEach(s => {
    if (s.category && s.category.id && !map[s.category.id]) {
      map[s.category.id] = s;
    }
  });
  return Object.values(map);
}

function uniqueByServiceId(services) {
  const seen = new Set();
  return (Array.isArray(services) ? services : []).filter((service) => {
    const id = service?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { 
  TruckIcon,
  ShieldCheckIcon,
  GiftIcon,
  LockClosedIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon as StarSolid,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/solid';
import { 
  StarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

const featureCards = [
  { icon: TruckIcon, title: 'Free Delivery', desc: 'Get services delivered at no extra cost', color: 'text-navy-600', bg: 'bg-navy-50' },
  { icon: ShieldCheckIcon, title: 'Quality Guarantee', desc: '100% satisfaction or money back', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: GiftIcon, title: 'Daily Offers', desc: 'New deals and discounts every day', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { icon: LockClosedIcon, title: '100% Secure Payment', desc: 'Your transactions are safe with us', color: 'text-red-600', bg: 'bg-red-50' },
];

const revealVariants = ['reveal', 'reveal-left', 'reveal-right', 'reveal-scale'];
const premiumHoverVariants = ['card-premium-lift', 'card-premium-tilt', 'card-premium-glow', 'card-premium-sweep'];

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [heroServices, setHeroServices] = useState([]);
  const [trendingPool, setTrendingPool] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [deferredLoaded, setDeferredLoaded] = useState(false);
  const [error, setError] = useState(null);

  const featureRef    = useScrollReveal();
  const categoryRef   = useScrollReveal();
  const trendingRef   = useScrollReveal();
  const discountRef   = useScrollReveal();
  const footerRef     = useScrollReveal();
  
  // Countdown timer state for discount section
  const [timeLeft, setTimeLeft] = useState({
    days: 24,
    hours: 23,
    minutes: 58,
    seconds: 24
  });

  useEffect(() => {
    fetchHeroData();
  }, []);

  const fetchHeroData = async () => {
    try {
      // Initial render: only fetch hero/banner data (small payload).
      const servicesRes = await api.get('/services/?page=1&page_size=18&ordering=-id');
      const serviceList = servicesRes.data.results || servicesRes.data || [];
      setHeroServices(uniqueByServiceId(Array.isArray(serviceList) ? serviceList : []));
    } catch (err) {
      setError('Failed to load data');
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeferredSections = async () => {
    if (deferredLoaded) return;

    try {
      setLoadingCategories(true);
      setLoadingTrending(true);

      const [categoriesRes, servicesRes] = await Promise.all([
        api.get('/categories/?page=1&page_size=12'),
        api.get('/services/?page=1&page_size=30&ordering=-id'),
      ]);

      const cats = categoriesRes.data.results || categoriesRes.data || [];
      const serviceList = servicesRes.data.results || servicesRes.data || [];

      setCategories(Array.isArray(cats) ? cats : []);

      const onePerCategory = pickOnePerCategory(Array.isArray(serviceList) ? serviceList : []);
      const categoryServiceIds = new Set(onePerCategory.map((service) => service.id));
      const fallbackServices = (Array.isArray(serviceList) ? serviceList : []).filter(
        (service) => service?.id && !categoryServiceIds.has(service.id)
      );

      setTrendingPool(uniqueByServiceId([...onePerCategory, ...fallbackServices]));
      setDeferredLoaded(true);
    } catch (err) {
      console.error('Failed to fetch deferred homepage sections:', err);
    } finally {
      setLoadingCategories(false);
      setLoadingTrending(false);
    }
  };

  useEffect(() => {
    const onScroll = () => {
      if (deferredLoaded) return;
      if (window.scrollY > window.innerHeight * 0.2) {
        fetchDeferredSections();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [deferredLoaded]);

  // Trending: limit 5 (category-first ordering with fallback fill)
  const trendingServices = trendingPool.slice(0, 5);

  // Banner: one per category with images, limit 12
  const bannerServices = heroServices.filter(s => s.images && s.images.length > 0).slice(0, 12);
  const bannerList = bannerServices.length > 0 ? bannerServices : heroServices.slice(0, 12);
  const bannerCount = bannerList.length;

  // Carousel auto-rotate
  useEffect(() => {
    if (bannerCount > 0) {
      const interval = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % bannerCount);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [bannerCount]);

  // Countdown timer for discount section
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        let { days, hours, minutes, seconds } = prevTime;
        
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          days--;
        }
        if (days < 0) {
          // Reset timer when it reaches 0
          days = 24;
          hours = 23;
          minutes = 58;
          seconds = 24;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % bannerCount);
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + bannerCount) % bannerCount);
  };

  // ...existing code... (bannerServices and bannerList now declared above with new logic)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full-Width Hero Carousel */}
      <section className="relative w-full overflow-hidden" style={{ height: '92vh', minHeight: '580px' }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
          </div>
        ) : bannerList.length > 0 ? (
          <>
            {/* Slides */}
            {bannerList.map((service, idx) => {
              const imageUrl = service.images && service.images.length > 0
                ? service.images[0].image
                : null;
              return (
                <div
                  key={service.id}
                  className="absolute inset-0 transition-opacity duration-1000"
                  style={{ opacity: idx === carouselIndex ? 1 : 0, zIndex: idx === carouselIndex ? 1 : 0 }}
                >
                  {/* Background Image */}
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-800 via-cyan-800 to-teal-900" />
                  )}

                  {/* Dark overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Content overlay */}
                  <div className="absolute inset-0 flex items-center" style={{ zIndex: 2 }}>
                    <div className="w-full px-8 md:px-20 max-w-none">
                      <div className="max-w-2xl">
                        {service.discount && (
                          <span className="inline-block px-4 py-1.5 bg-red-500 text-white font-bold rounded-full text-sm mb-4 tracking-widest uppercase animate-bounce-in pulse-glow" style={{animationDelay:'0.1s'}}>
                            {service.discount}% OFF
                          </span>
                        )}
                        <h1
                          className="text-5xl md:text-7xl font-extrabold text-white leading-none mb-4 tracking-tight animate-fade-in-up"
                          style={{ textShadow: '0 2px 24px rgba(0,0,0,0.4)', animationDelay: '0.2s' }}
                        >
                          {service.name}
                        </h1>
                        <p className="text-lg md:text-xl text-white/80 mb-6 max-w-lg leading-relaxed animate-fade-in-up" style={{animationDelay:'0.35s'}}>
                          {service.description?.slice(0, 100) || 'Professional household service at your doorstep'}
                          {service.description?.length > 100 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-4 mb-8 animate-fade-in-up" style={{animationDelay:'0.45s'}}>
                          <span className="text-4xl font-extrabold text-yellow-300">
                            ৳{service.price}
                          </span>
                          {service.discount && (
                            <span className="text-xl text-white/60 line-through">
                              ৳{Math.round(service.price / (1 - service.discount / 100))}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 animate-fade-in-up" style={{animationDelay:'0.55s'}}>
                          <Link
                            to={`/services/${service.id}`}
                            className="btn btn-white btn-xl"
                          >
                            Book Now
                          </Link>
                          <Link
                            to="/services"
                            className="btn btn-ghost btn-xl border border-white/30 text-white hover:text-white"
                          >
                            Browse All
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Carousel Controls */}
            <button
              onClick={prevSlide}
              className="absolute left-5 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/35 rounded-full transition-colors backdrop-blur-sm border border-white/20"
              style={{ zIndex: 10 }}
            >
              <ChevronLeftIcon className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-5 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/35 rounded-full transition-colors backdrop-blur-sm border border-white/20"
              style={{ zIndex: 10 }}
            >
              <ChevronRightIcon className="w-6 h-6 text-white" />
            </button>

            {/* Scrolling service name bar at bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm py-3 px-6 flex items-center gap-0 overflow-hidden"
              style={{ zIndex: 5 }}
            >
              <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
                {[...bannerList, ...bannerList].map((s, i) => (
                  <Link
                    key={i}
                    to={`/services/${s.id}`}
                    className={`text-sm font-semibold transition-all px-4 py-1 rounded-full ${
                      i % bannerList.length === carouselIndex
                        ? 'text-yellow-300 bg-white/15'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2" style={{ zIndex: 6 }}>
              {bannerList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === carouselIndex ? 'bg-white w-8' : 'bg-white/40 w-4'
                  }`}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-800 to-cyan-900 flex items-center px-12">
            <div>
              <h1 className="text-7xl font-extrabold text-white mb-6">Welcome to<br />HomeCrew</h1>
              <p className="text-xl text-white/80 mb-8">Your trusted platform for household services</p>
              <Link to="/services" className="btn btn-white btn-lg">
                Browse Services
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Feature Cards */}
      <section className="py-16 px-6" ref={featureRef}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={`${revealVariants[i % revealVariants.length]} delay-${i + 1} ${card.bg} rounded-2xl p-6 text-center ${premiumHoverVariants[i % premiumHoverVariants.length]} border border-transparent hover:border-white/50 group`}
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300" style={{background: 'white'}}>
                    <Icon className={`w-8 h-8 ${card.color}`} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Browse Categories */}
      <section className="py-16 px-6 bg-white" ref={categoryRef}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8 reveal">
            <h2 className="text-3xl font-extrabold text-gray-800 section-heading">Browse Categories</h2>
            <Link
              to="/categories"
              className="btn btn-primary btn-sm"
            >
              View All
            </Link>
          </div>
          {loadingCategories || (!deferredLoaded && categories.length === 0) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(n => <div key={n} className="skeleton h-40 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.slice(0, 4).map((category, i) => (
                <div
                  key={category.id}
                  className={`animate-fade-in-up bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 text-center ${premiumHoverVariants[(i + 1) % premiumHoverVariants.length]} border border-teal-100 flex flex-col group overflow-hidden relative`}
                  style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
                >
                  {/* background orb */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-teal-200 rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500" />
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md group-hover:rotate-6 transition-transform duration-300">
                    <span className="text-2xl font-bold text-white">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 mb-4">{category.name}</h3>
                  <Link
                    to={`/services?category=${category.id}`}
                    className="mt-auto text-teal-600 hover:text-teal-700 text-sm font-semibold inline-flex items-center gap-1 group/link link-underline"
                  >
                    Explore
                    <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Services */}
      <section className="py-16 px-6 bg-gray-50" ref={trendingRef}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8 reveal">
            <h2 className="text-3xl font-extrabold text-gray-800 section-heading">Trending Services</h2>
            <Link
              to="/services"
              className="btn btn-primary btn-sm"
            >
              View All
            </Link>
          </div>
          {loadingTrending || (!deferredLoaded && trendingServices.length === 0) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[1,2,3,4,5].map(n => <div key={n} className="skeleton h-72 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {trendingServices.map((service, i) => {
                const imageUrl = service.images && service.images.length > 0 ? service.images[0].image : null;
                return (
                <div
                  key={`${service.id}-${i}`}
                    className={`animate-fade-in-up bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${premiumHoverVariants[(i + 2) % premiumHoverVariants.length]} card-img-zoom group`}
                    style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
                >
                  <div className="h-48 bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center overflow-hidden relative">
                    {imageUrl ? (
                      <img src={imageUrl} alt={service.name} className="w-full h-full object-cover" />
                    ) : (
                      <WrenchScrewdriverIcon className="w-20 h-20 text-teal-600 group-hover:scale-110 transition-transform duration-300" />
                    )}
                    {/* hover shine overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-gray-800 mb-1 truncate">{service.name}</h3>
                    <p className="text-gray-500 text-xs mb-3 line-clamp-2">{service.description}</p>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, si) => (
                        si < Math.floor(service.avg_rating || 0) ? (
                          <StarSolid key={si} className="w-3.5 h-3.5 text-yellow-500" />
                        ) : (
                          <StarIcon key={si} className="w-3.5 h-3.5 text-gray-300" />
                        )
                      ))}
                      <span className="text-xs text-gray-400 ml-1">({service.review_count || 0})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-teal-600">৳{service.price}</span>
                      <Link
                        to={`/services/${service.id}`}
                        className="text-teal-600 hover:text-teal-700 text-sm font-semibold inline-flex items-center gap-1 group/link link-underline"
                      >
                        Explore
                        <span className="group-hover/link:translate-x-1 transition-transform">→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </section>

      {/* Discount Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-cyan-100 to-teal-100 py-16 md:py-24" ref={discountRef}>
        {/* Animated background orbs */}
        <div className="bg-orb-1 top-0 right-0 w-80 h-80 bg-cyan-300 opacity-20" />
        <div className="bg-orb-2 bottom-0 left-10 w-72 h-72 bg-rose-300 opacity-20" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left Side - Animated Stacked Cards */}
            <div className="reveal-left flex justify-center lg:justify-start">
              <div className="relative w-56 h-72">
                <div className="absolute -left-4 top-8 w-48 h-64 bg-rose-400 rounded-2xl rotate-6 opacity-80 shadow-2xl animate-float" style={{animationDelay:'0s'}} />
                <div className="absolute left-4 top-4  w-48 h-64 bg-cyan-400 rounded-2xl rotate-3 opacity-80 shadow-2xl animate-float" style={{animationDelay:'0.5s'}} />
                <div className="absolute left-10 top-0 w-48 h-64 bg-teal-400 rounded-2xl -rotate-3 opacity-80 shadow-2xl animate-float" style={{animationDelay:'1s'}} />
                <div className="relative z-10 w-48 h-64 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <ShoppingBagIcon className="w-24 h-24 text-white animate-heartbeat" />
                </div>
              </div>
            </div>

            {/* Right Side - Discount Info */}
            <div className="reveal-right text-center lg:text-left">
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                <span className="text-cyan-500 animate-gradient bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-600 bg-clip-text text-transparent">
                  30% Discount
                </span>
                <br />
                <span className="text-3xl md:text-4xl">On All Items.</span>
              </h2>
              <p className="text-2xl md:text-3xl font-semibold text-red-500 mb-8 animate-heartbeat">
                Hurry Up !!!
              </p>

              {/* Countdown Timer */}
              <div className="flex justify-center lg:justify-start gap-4 mb-8">
                {[
                  { val: timeLeft.days,    label: 'Days',  color: 'text-rose-500'  },
                  { val: timeLeft.hours,   label: 'Hrs',   color: 'text-cyan-500'  },
                  { val: timeLeft.minutes, label: 'Min',   color: 'text-teal-500'  },
                  { val: timeLeft.seconds, label: 'Sec',   color: 'text-indigo-500' },
                ].map(({ val, label, color }, i) => (
                  <div
                    key={label}
                    className={`${revealVariants[i % revealVariants.length]} delay-${(i % 4) + 1} text-center bg-white rounded-2xl p-4 shadow-lg min-w-[72px] ${premiumHoverVariants[(i + 3) % premiumHoverVariants.length]}`}
                  >
                    <div className={`text-3xl md:text-4xl font-bold ${color} tabular-nums`}>
                      {String(val).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
                  </div>
                ))}
              </div>

              <Link
                to="/services"
                className="btn btn-primary btn-xl pulse-glow"
              >
                Shop Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-gray-700 pt-12 pb-0 border-t border-gray-200" style={{ background: 'rgb(125,229,222)' }} ref={footerRef}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-gray-900 font-bold text-xl mb-4">HomeCrew</h3>
              <p className="text-sm leading-relaxed">Your trusted platform for professional household services. Quality guaranteed.</p>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/services" className="hover:text-teal-600 transition-colors">Services</Link></li>
                <li><Link to="/about" className="hover:text-teal-600 transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-teal-600 transition-colors">Contact</Link></li>
                <li><Link to="/orders" className="hover:text-teal-600 transition-colors">My Orders</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="hover:text-teal-600 transition-colors">Help Center</Link></li>
                <li><Link to="/faq" className="hover:text-teal-600 transition-colors">FAQ</Link></li>
                <li><Link to="/terms" className="hover:text-teal-600 transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="hover:text-teal-600 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4" />
                  support@homecrew.com
                </li>
                <li className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4" />
                  +1 (555) 123-4567
                </li>
                <li className="flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4" />
                  123 Service St, City, State
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* Copyright bar — separate card, flush to bottom, no margin/padding */}
        <div style={{margin:0, padding:'10px 0', background:'rgb(110,214,207)', textAlign:'center', fontSize:'13px', color:'#4b5563', width:'100%', borderTop:'1px solid rgba(0,0,0,0.08)'}}>
          &copy; {new Date().getFullYear()} HomeCrew. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;
