import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { CubeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCategories(filtered);
    }
  }, [searchTerm, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories/?page_size=100');
      const categoriesData = response.data.results || response.data || [];
      setCategories(categoriesData);
      setFilteredCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
      setFilteredCategories([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">All Categories</h1>
          <p className="text-gray-600">Browse all service categories</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
            <button className="px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6 text-gray-600">
              Showing <span className="font-semibold text-gray-800">{filteredCategories.length}</span> {filteredCategories.length === 1 ? 'category' : 'categories'}
            </div>

            {/* Categories Grid */}
            {filteredCategories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredCategories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/services?category=${category.id}`}
                    className="group bg-white rounded-2xl p-6 text-center hover:shadow-xl transition-all hover:-translate-y-2 border-2 border-gray-100 hover:border-teal-300"
                  >
                    {/* Category Icon */}
                    <div className="mb-4 flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center group-hover:from-teal-600 group-hover:to-cyan-600 transition-colors shadow-lg">
                        <span className="text-2xl font-bold text-white">
                          {category.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Category Name */}
                    <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-teal-600 transition-colors">
                      {category.name}
                    </h3>
                    
                    {/* Category Description */}
                    {category.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {category.description}
                      </p>
                    )}

                    {/* Arrow indicator */}
                    <div className="mt-4 text-teal-600 font-semibold text-sm group-hover:translate-x-1 transition-transform inline-block">
                      View Services →
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No categories found</p>
                <p className="text-gray-400 text-sm mt-2">Try a different search term</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Categories;
