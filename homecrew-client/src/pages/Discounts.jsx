import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';

const Discounts = () => {
  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 24,
    hours: 23,
    minutes: 58,
    seconds: 24
  });

  // Featured discount services
  const [discountServices, setDiscountServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Countdown timer logic
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

  useEffect(() => {
    // Fetch featured services for discount section
    const fetchServices = async () => {
      try {
        const response = await api.get('/services/?page_size=6');
        const data = response.data;
        setDiscountServices(data.results || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Discount Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-50 via-cyan-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Side - Decorative Stacked Cards (like books) */}
            <div className="relative">
              <div className="relative">
                {/* Stacked cards effect */}
                <div className="absolute -left-4 top-8 w-48 h-64 bg-gradient-to-br from-rose-400 to-rose-500 rounded-2xl transform rotate-6 opacity-80 shadow-2xl"></div>
                <div className="absolute left-4 top-4 w-48 h-64 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl transform rotate-3 opacity-80 shadow-2xl"></div>
                <div className="absolute left-12 top-0 w-48 h-64 bg-gradient-to-br from-teal-400 to-teal-500 rounded-2xl transform -rotate-6 opacity-80 shadow-2xl"></div>
                <div className="relative z-10 w-48 h-64 bg-gradient-to-br from-navy-400 to-navy-500 rounded-2xl flex items-center justify-center shadow-2xl mx-auto lg:mx-0">
                  <ShoppingBagIcon className="w-24 h-24 text-white" />
                </div>
              </div>
            </div>

            {/* Right Side - Discount Info */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-cyan-500 to-teal-500">
                  30% Discount
                </span>
                <br />
                <span className="text-3xl md:text-4xl">On All Items.</span>
              </h1>
              <p className="text-2xl md:text-3xl font-semibold text-red-500 mb-8">
                Hurry Up !!!
              </p>

              {/* Countdown Timer */}
              <div className="flex justify-center lg:justify-start gap-4 mb-8">
                <div className="text-center bg-white rounded-xl p-4 shadow-lg min-w-[80px]">
                  <div className="text-3xl md:text-4xl font-bold text-rose-500">
                    {String(timeLeft.days).padStart(2, '0')}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">Days</div>
                </div>
                <div className="text-center bg-white rounded-xl p-4 shadow-lg min-w-[80px]">
                  <div className="text-3xl md:text-4xl font-bold text-cyan-500">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">Hrs</div>
                </div>
                <div className="text-center bg-white rounded-xl p-4 shadow-lg min-w-[80px]">
                  <div className="text-3xl md:text-4xl font-bold text-teal-500">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">Min</div>
                </div>
                <div className="text-center bg-white rounded-xl p-4 shadow-lg min-w-[80px]">
                  <div className="text-3xl md:text-4xl font-bold text-navy-500">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">Sec</div>
                </div>
              </div>

              {/* CTA Button */}
              <Link
                to="/services"
                className="inline-block bg-gradient-to-r from-rose-500 to-cyan-600 text-white font-semibold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Shop Collection
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Featured Discount Services */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Featured Deals
          </h2>
          <p className="text-lg text-gray-600">
            Don't miss out on these amazing offers!
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {discountServices.map((service) => (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                {/* Service Image */}
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
                  {service.images && service.images.length > 0 ? (
                    <img
                      src={service.images[0].image}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBagIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  <div className="absolute top-4 right-4 bg-red-500 text-white font-bold px-4 py-2 rounded-full text-sm shadow-lg">
                    30% OFF
                  </div>
                </div>

                {/* Service Info */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-teal-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {service.description}
                  </p>
                  
                  {/* Price */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-teal-600">
                      ৳{(service.price * 0.7).toFixed(2)}
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      ৳{service.price}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            to="/services"
            className="inline-block bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold px-8 py-3 rounded-full text-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
          >
            View All Services
          </Link>
        </div>
      </div>

      {/* Additional Promo Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Subscribe & Get Extra 10% Off
          </h3>
          <p className="text-teal-100 text-lg mb-6">
            Join our newsletter for exclusive deals and early access to sales
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-3 rounded-full text-gray-900 w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button className="bg-white text-teal-600 font-semibold px-8 py-3 rounded-full hover:bg-teal-50 transition-colors w-full sm:w-auto">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Discounts;
