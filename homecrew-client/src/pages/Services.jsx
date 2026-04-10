import { useState, useEffect, useCallback, useRef } from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { 
  StarIcon, 
  MagnifyingGlassIcon, 
  ShoppingCartIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

const TAKA = '\u09F3';
const PRICE_SLIDER_MAX = 50000;
const SERVICES_PAGE_SIZE = 10;

const Services = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize selectedCategory from URL
  const initialCategory = searchParams.get('category') || 'all';
  
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: PRICE_SLIDER_MAX });
  const [sortBy, setSortBy] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { showAlert } = useDialog();

  const gridRef = useScrollReveal();

  // Fetch categories once on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Watch URL changes and update category
  useEffect(() => {
    const urlCategory = searchParams.get('category') || 'all';
    console.log('URL category:', urlCategory, '| Current state:', selectedCategory);
    
    if (urlCategory !== selectedCategory) {
      console.log('Syncing category from URL to state:', urlCategory);
      setSelectedCategory(urlCategory);
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]); // Use string representation to avoid object reference issues

  // Fetch services lazily (page-by-page)
  const fetchServices = useCallback(async (pageToLoad = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Add category filter and pagination to API call
      const params = { page: pageToLoad, page_size: SERVICES_PAGE_SIZE };
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      console.log('[INFO] Fetching services...');
      console.log('  Category:', selectedCategory);
      console.log('  Page:', pageToLoad);
      console.log('  API Params:', params);
      
      const response = await api.get('/services/', { params });
      
      console.log('[OK] Received:', response.data.count, 'total services,', response.data.results?.length, 'in this page');
      
      // Backend returns paginated data: {count, next, previous, results}
      const nextBatch = response.data.results || response.data || [];
      const total = Number(response.data.count || 0);

      setServices((prev) => (append ? [...prev, ...nextBatch] : nextBatch));
      setTotalCount(total);
      setTotalPages(Math.ceil(total / SERVICES_PAGE_SIZE) || 1);
      setCurrentPage(pageToLoad);
      setHasMore(Boolean(response.data.next));
    } catch (error) {
      console.error('[ERROR] Failed to fetch services:', error);
      if (!append) {
        setServices([]);
        setTotalCount(0);
        setTotalPages(1);
      }
      setHasMore(false);
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [selectedCategory]);

  // Reset and fetch first page when category changes
  useEffect(() => {
    console.log('[INFO] Effect triggered - fetching services');
    setCurrentPage(1);
    setHasMore(true);
    fetchServices(1, false);
  }, [fetchServices, selectedCategory]);

  // Infinite scroll observer
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading || loadingMore || !hasMore) return;
        fetchServices(currentPage + 1, true);
      },
      { rootMargin: '250px 0px 250px 0px', threshold: 0.01 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [currentPage, hasMore, loading, loadingMore, fetchServices]);

  const fetchCategories = async () => {
    try {
      // Fetch all categories without pagination
      const response = await api.get('/categories/?page_size=100');
      // Backend returns paginated data: {count, next, previous, results}
      setCategories(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Handle category dropdown change
  const handleCategoryChange = (categoryId) => {
    console.log('[INFO] Dropdown changed to category:', categoryId);
    
    // Create new URL params
    const newParams = new URLSearchParams(searchParams);
    if (categoryId === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryId);
    }
    
    // Update URL - this will trigger the searchParams useEffect
    setSearchParams(newParams);
  };

  const handleAddToCart = async (serviceId) => {
    if (!isAuthenticated) {
      await showAlert('Please login to add items to cart', { title: 'Login required' });
      return;
    }

    const result = await addToCart(serviceId);
    if (result.success) {
      await showAlert('Added to cart successfully!', { title: 'Cart updated' });
    } else {
      await showAlert('Failed to add to cart', { title: 'Action failed' });
    }
  };

  const filteredServices = services.filter(service => {
    // Filter by search term
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by price range
    const price = parseFloat(service.price);
    const matchesPrice = price >= priceRange.min && price <= priceRange.max;
    
    return matchesSearch && matchesPrice;
  });

  // Sort services
  const sortedServices = [...filteredServices].sort((a, b) => {
    if (sortBy === 'price-low-high') {
      return parseFloat(a.price) - parseFloat(b.price);
    } else if (sortBy === 'price-high-low') {
      return parseFloat(b.price) - parseFloat(a.price);
    }
    return 0; // default - no sorting
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 animate-fade-in-up">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 section-heading">Our Services</h1>
          <p className="text-gray-500">Find the perfect household service for your needs</p>
        </div>

        {/* Search Bar and Filter Button */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
            <button className="btn btn-primary btn-icon">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="md:w-64">
            <select 
              value={selectedCategory} 
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Icon Button */}
          <button 
            onClick={() => setShowFilterSidebar(!showFilterSidebar)}
            className="px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
            <span className="hidden md:inline">Filters</span>
          </button>
        </div>

        {/* Filter Sidebar */}
        {showFilterSidebar && (
          <>
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowFilterSidebar(false)}
            ></div>
            
            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Filters</h2>
                <button 
                  onClick={() => setShowFilterSidebar(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Price Range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Min Price: {TAKA}{priceRange.min}</label>
                    <input
                      type="range"
                      min="0"
                      max={PRICE_SLIDER_MAX}
                      step="10"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Max Price: {TAKA}{priceRange.max}</label>
                    <input
                      type="range"
                      min="0"
                      max={PRICE_SLIDER_MAX}
                      step="10"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sort By Filter */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Sort By Price</h3>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-white"
                >
                  <option value="default">Default</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                </select>
              </div>

              {/* Apply Button */}
              <button 
                onClick={() => setShowFilterSidebar(false)}
                className="w-full btn btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </>
        )}

        {/* Results Count */}
        {totalCount > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {sortedServices.length} of {totalCount} services
          </div>
        )}

        {/* Services Grid */}
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [...Array(6)].map((_, n) => (
              <div key={n} className="skeleton rounded-2xl h-80" />
            ))
          ) : sortedServices.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 py-12">No services found</p>
          ) : (
            sortedServices.map((service, idx) => (
              <div key={service.id} className="animate-fade-in-up bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden card-hover card-img-zoom group" style={{ animationDelay: `${(idx % 6) * 0.08}s` }}>
                <div className="h-48 bg-gradient-to-br from-teal-100 to-cyan-100 overflow-hidden relative group-hover:shadow-inner">
                  {service.images && service.images.length > 0 ? (
                    <img 
                      src={service.images[0].image} 
                      alt={service.name} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const placeholder = e.target.nextElementSibling;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="absolute inset-0 flex items-center justify-center text-gray-500"
                    style={{ display: service.images && service.images.length > 0 ? 'none' : 'flex' }}
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm font-medium">{service.name}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-teal-600">{TAKA}{parseFloat(service.price).toFixed(0)}</span>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <StarSolid className="w-4 h-4 text-yellow-400" />
                      {service.avg_rating.toFixed(1)}
                    </span>
                  </div>

                  {service.category && (
                    <span className="inline-block px-3 py-1 bg-teal-50 text-teal-600 text-xs font-semibold rounded-full mb-4">{service.category.name}</span>
                  )}

                  <div className="flex gap-2">
                    <Link to={`/services/${service.id}`} className="flex-1 btn btn-outline btn-sm text-center">
                      View Details
                    </Link>
                    <button 
                      onClick={() => handleAddToCart(service.id)}
                      className="flex-1 btn btn-primary btn-sm"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Infinite-scroll sentinel */}
        <div ref={loadMoreRef} className="h-10" />
        {loadingMore && (
          <div className="py-4 text-center text-sm text-gray-500">Loading more services...</div>
        )}
        {!hasMore && totalCount > 0 && (
          <div className="py-4 text-center text-xs text-gray-400">You have reached the end.</div>
        )}
      </div>
    </div>
  );
};

export default Services;

