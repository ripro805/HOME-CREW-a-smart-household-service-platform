import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api/axios';
import Countdown from 'react-countdown';
import { 
  TruckIcon,
  ShieldCheckIcon,
  GiftIcon,
  LockClosedIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon as StarSolid,
  BoltIcon,
  CubeIcon
} from '@heroicons/react/24/solid';
import { 
  StarIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

const featureCards = [
  { icon: TruckIcon, title: 'Free Delivery', desc: 'Get services delivered at no extra cost', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: ShieldCheckIcon, title: 'Quality Guarantee', desc: '100% satisfaction or money back', color: 'text-green-600', bg: 'bg-green-50' },
  { icon: GiftIcon, title: 'Daily Offers', desc: 'New deals and discounts every day', color: 'text-purple-600', bg: 'bg-purple-50' },
  { icon: LockClosedIcon, title: '100% Secure Payment', desc: 'Your transactions are safe with us', color: 'text-red-600', bg: 'bg-red-50' },
];

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        api.get('/services/?page_size=16'),
        api.get('/categories/?page_size=8')
      ]);
      setServices(servicesRes.data.results || servicesRes.data || []);
      setCategories(categoriesRes.data.results || categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const trendingServices = services.filter(s => s.is_popular).slice(0, 6);

  // Banner services for carousel
  const bannerServicesForEffect = services.filter(s => s.images && s.images.length > 0).slice(0, 12);
  const bannerCount = (bannerServicesForEffect.length > 0 ? bannerServicesForEffect : services.slice(0, 12)).length;

  // Carousel auto-rotate
  useEffect(() => {
    if (bannerCount > 0) {
      const interval = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % bannerCount);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [bannerCount]);

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % bannerCount);
  };

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + bannerCount) % bannerCount);
  };

  // Timer countdown to midnight
  const getNextMidnight = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  const countdownRenderer = ({ hours, minutes, seconds, completed }) => {
    if (completed) return <span>Offer Ended!</span>;
    return (
      <span className="font-mono text-2xl font-bold">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    );
  };

  // Use all services with images for banner carousel
  const bannerServices = services.filter(s => s.images && s.images.length > 0).slice(0, 12);
  const bannerList = bannerServices.length > 0 ? bannerServices : services.slice(0, 12);

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
                    <div className="w-full h-full bg-gradient-to-br from-indigo-800 via-purple-800 to-indigo-900" />
                  )}

                  {/* Dark overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Content overlay */}
                  <div className="absolute inset-0 flex items-center" style={{ zIndex: 2 }}>
                    <div className="w-full px-8 md:px-20 max-w-none">
                      <div className="max-w-2xl">
                        {service.discount && (
                          <span className="inline-block px-4 py-1.5 bg-red-500 text-white font-bold rounded-full text-sm mb-4 tracking-widest uppercase">
                            {service.discount}% OFF
                          </span>
                        )}
                        <h1
                          className="text-5xl md:text-7xl font-extrabold text-white leading-none mb-4 tracking-tight"
                          style={{ textShadow: '0 2px 24px rgba(0,0,0,0.4)' }}
                        >
                          {service.name}
                        </h1>
                        <p className="text-lg md:text-xl text-white/80 mb-6 max-w-lg leading-relaxed">
                          {service.description?.slice(0, 100) || 'Professional household service at your doorstep'}
                          {service.description?.length > 100 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-4 mb-8">
                          <span className="text-4xl font-extrabold text-yellow-300">
                            ৳{service.price}
                          </span>
                          {service.discount && (
                            <span className="text-xl text-white/60 line-through">
                              ৳{Math.round(service.price / (1 - service.discount / 100))}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4">
                          <Link
                            to={`/services/${service.id}`}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 transition-all shadow-xl text-base"
                          >
                            Book Now
                          </Link>
                          <Link
                            to="/services"
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-full hover:bg-white/25 transition-all border border-white/30 text-base"
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
          <div className="w-full h-full bg-gradient-to-br from-indigo-800 to-purple-900 flex items-center px-12">
            <div>
              <h1 className="text-7xl font-extrabold text-white mb-6">Welcome to<br />HomeCrew</h1>
              <p className="text-xl text-white/80 mb-8">Your trusted platform for household services</p>
              <Link to="/services" className="inline-block px-8 py-3 bg-white text-indigo-700 font-bold rounded-full hover:bg-gray-100 shadow-lg">
                Browse Services
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Feature Cards */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className={`${card.bg} rounded-2xl p-6 text-center hover:shadow-lg transition-shadow`}>
                  <Icon className={`w-12 h-12 ${card.color} mx-auto mb-3`} />
                  <h3 className="font-bold text-lg text-gray-800 mb-2">{card.title}</h3>
                  <p className="text-gray-600 text-sm">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Browse Categories */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-800">Browse Categories</h2>
            <Link 
              to="/services"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              View All
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/services?category=${category.id}`}
                  className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 border border-indigo-100"
                >
                  {category.icon ? (
                    <div className="text-4xl mb-3">{category.icon}</div>
                  ) : (
                    <CubeIcon className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                  )}
                  <h3 className="font-bold text-lg text-gray-800">{category.name}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Services */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-800">Trending Services</h2>
            <Link 
              to="/services"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
            >
              View All
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingServices.map((service) => (
                <div key={service.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
                  <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    {service.icon ? (
                      <div className="text-6xl">{service.icon}</div>
                    ) : (
                      <WrenchScrewdriverIcon className="w-20 h-20 text-indigo-600" />
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-xl text-gray-800 mb-2">{service.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          i < Math.floor(service.average_rating || 0) ? (
                            <StarSolid key={i} className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <StarIcon key={i} className="w-4 h-4 text-gray-300" />
                          )
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">({service.review_count || 0})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-indigo-600">৳{service.price}</span>
                      <Link
                        to={`/services/${service.id}`}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Timer Discount Banner */}
      <section className="py-16 px-6 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BoltIcon className="w-10 h-10" />
            <h2 className="text-4xl font-extrabold">Flash Deal Alert!</h2>
          </div>
          <p className="text-xl text-red-100 mb-6">Grab amazing discounts before time runs out!</p>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 mb-6">
            <p className="text-lg mb-3 font-semibold">Deal Ends In:</p>
            <Countdown date={getNextMidnight()} renderer={countdownRenderer} />
          </div>
          <Link 
            to="/services"
            className="inline-block px-8 py-3 bg-white text-purple-700 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-lg text-lg"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 pt-12 pb-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-bold text-xl mb-4">HomeCrew</h3>
              <p className="text-sm leading-relaxed">Your trusted platform for professional household services. Quality guaranteed.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Us</h4>
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
        <div style={{margin:0, padding:'10px 0', background:'#111827', textAlign:'center', fontSize:'13px', color:'#9ca3af', width:'100%'}}>
          &copy; {new Date().getFullYear()} HomeCrew. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Home;
