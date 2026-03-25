import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const TAKA = '\u09F3';
const ORDERS_PER_PAGE = 8;
const SORT_OPTIONS = {
  latest: 'Latest First',
  oldest: 'Oldest First',
  price_low: 'Price: Low to High',
  price_high: 'Price: High to Low',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('latest');
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/');
      const list = response.data.results || response.data || [];
      const sortedOrders = [...list].sort((a, b) => b.id - a.id);
      setOrders(sortedOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      NOT_PAID: 'Pending Payment',
      READY_TO_SHIP: 'Confirmed',
      SHIPPED: 'Ongoing',
      DELIVERED: 'Completed',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  };

  const getStatusBadgeClass = (status) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    const statusColors = {
      NOT_PAID: 'bg-orange-100 text-orange-700',
      READY_TO_SHIP: 'bg-navy-100 text-navy-700',
      SHIPPED: 'bg-cyan-100 text-cyan-700',
      DELIVERED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return `${baseClass} ${statusColors[status] || 'bg-gray-100 text-gray-700'}`;
  };

  const getServiceSummary = (order) => {
    const items = order.items || [];
    if (items.length === 0) return 'No service found';
    if (items.length === 1) return items[0].service?.name || 'Service';
    const firstService = items[0].service?.name || 'Service';
    return `${firstService} +${items.length - 1} more`;
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));

  const sortedOrders = useMemo(() => {
    const list = [...orders];

    if (sortBy === 'oldest') {
      return list.sort((a, b) => a.id - b.id);
    }

    if (sortBy === 'price_low') {
      return list.sort((a, b) => parseFloat(a.total_price || 0) - parseFloat(b.total_price || 0));
    }

    if (sortBy === 'price_high') {
      return list.sort((a, b) => parseFloat(b.total_price || 0) - parseFloat(a.total_price || 0));
    }

    return list.sort((a, b) => b.id - a.id);
  }, [orders, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    return sortedOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [sortedOrders, currentPage]);

  const startNumber = sortedOrders.length === 0 ? 0 : (currentPage - 1) * ORDERS_PER_PAGE + 1;
  const endNumber = Math.min(currentPage * ORDERS_PER_PAGE, sortedOrders.length);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading orders...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-600 mb-4">Start shopping to create your first order!</p>
          <button
            onClick={() => navigate('/services')}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors"
          >
            Browse Services
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Orders</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sort your orders by newest, oldest, or total price from the filter on the right.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              Showing {startNumber}-{endNumber} of {sortedOrders.length} orders
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 mb-2">
                Sort Orders
              </label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="min-w-52 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]">Service Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]">Date and Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em]">Total Price</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em]">View Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {paginatedOrders.map((order, index) => (
                  <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                    <td className="px-6 py-5 align-top">
                      <span className="font-bold text-gray-800">#{order.id}</span>
                    </td>

                    <td className="px-6 py-5 align-top">
                      <div className="max-w-xs font-semibold text-gray-800">{getServiceSummary(order)}</div>
                      {order.items?.length > 1 && (
                        <div className="mt-1 text-xs text-gray-500">{order.items.length} services in this order</div>
                      )}
                    </td>

                    <td className="px-6 py-5 align-top">
                      <span className={getStatusBadgeClass(order.status)}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-top text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleString('en-GB', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="px-6 py-5 align-top">
                      <span className="text-lg font-bold text-teal-600">
                        {TAKA}{Math.round(parseFloat(order.total_price || 0))}
                      </span>
                    </td>

                    <td className="px-6 py-5 align-top text-center">
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="btn btn-outline btn-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-1 flex-wrap">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-10 min-w-10 rounded-lg px-3 text-sm font-semibold transition-colors ${
                      currentPage === page
                        ? 'bg-teal-600 text-white'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
