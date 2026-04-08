import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  UserCircleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL_MS = 10000;

const STATUS_LABELS = {
  NOT_PAID: 'Pending Payment',
  READY_TO_SHIP: 'Confirmed',
  SHIPPED: 'Ongoing',
  DELIVERED: 'Completed',
  CANCELLED: 'Cancelled',
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TrackTechnician() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const response = await api.get(`/orders/${id}/`);
      setOrder(response.data);
      setError('');
      setLastSyncedAt(new Date());
    } catch (err) {
      setError(err.response?.status === 404 ? 'Order not found.' : 'Failed to load tracking data.');
    } finally {
      if (!silent) setLoading(false);
      if (silent) setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchOrder(false);
    const intervalId = window.setInterval(() => {
      fetchOrder(true);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchOrder, isAuthenticated, navigate]);

  const currentStatusLabel = STATUS_LABELS[order?.status] || order?.status || 'Unknown';

  const timeline = useMemo(() => {
    if (!order) return [];

    const isAssigned = Boolean(order.assigned_technician || order.assigned_at);
    const isAccepted = Boolean(order.technician_accepted_at);
    const isOngoing = order.status === 'SHIPPED' || order.status === 'DELIVERED';
    const isCompleted = order.status === 'DELIVERED';

    return [
      {
        key: 'ordered',
        title: 'Order Placed',
        subtitle: 'Your service request has been created.',
        state: 'completed',
        time: formatDateTime(order.created_at),
      },
      {
        key: 'assigned',
        title: 'Technician Assigned',
        subtitle: isAssigned
          ? 'A technician has been assigned to your order.'
          : 'Waiting for technician assignment.',
        state: isAssigned ? 'completed' : 'pending',
        time: formatDateTime(order.assigned_at),
      },
      {
        key: 'accepted',
        title: 'Technician Accepted',
        subtitle: isAccepted
          ? 'Technician accepted and prepared to start work.'
          : 'Waiting for technician acceptance.',
        state: isAccepted ? 'completed' : isAssigned ? 'current' : 'pending',
        time: formatDateTime(order.technician_accepted_at),
      },
      {
        key: 'ongoing',
        title: 'Work In Progress',
        subtitle: isOngoing
          ? 'Technician is working on your service.'
          : 'Work has not started yet.',
        state: isOngoing ? (isCompleted ? 'completed' : 'current') : 'pending',
        time: isOngoing ? formatDateTime(order.technician_accepted_at || order.assigned_at) : '—',
      },
      {
        key: 'completed',
        title: 'Service Completed',
        subtitle: isCompleted
          ? 'Your order has been completed successfully.'
          : 'Completion pending.',
        state: isCompleted ? 'completed' : 'pending',
        time: isCompleted ? formatDateTime(order.updated_at || order.technician_accepted_at || order.assigned_at) : '—',
      },
    ];
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading technician tracking...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">{error || 'Failed to load tracking page.'}</p>
          <button
            className="px-6 py-3 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold rounded-lg transition-colors"
            onClick={() => navigate('/orders')}
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const technicianName = order.assigned_technician
    ? `${order.assigned_technician.first_name || ''} ${order.assigned_technician.last_name || ''}`.trim() || order.assigned_technician.email
    : 'Not assigned yet';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            className="px-4 py-2 border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold rounded-lg transition-colors"
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            ← Back to Order Details
          </button>

          <button
            onClick={() => fetchOrder(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh now'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Track Technician • Order #{order.id}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Live updates every {Math.floor(POLL_INTERVAL_MS / 1000)} seconds
                {lastSyncedAt ? ` • Last sync: ${formatDateTime(lastSyncedAt)}` : ''}
              </p>
            </div>
            <span className="px-4 py-2 rounded-full text-xs font-bold bg-teal-100 text-teal-700">
              Current: {currentStatusLabel}
            </span>
          </div>

          {order.status === 'CANCELLED' && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              This order has been cancelled. Tracking has stopped.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Technician Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Technician</p>
              <p className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <UserCircleIcon className="w-5 h-5 text-teal-600" />
                {technicianName}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Contact</p>
              <p className="text-base font-semibold text-gray-800">
                {order.assigned_technician?.phone_number || 'Will be available after assignment'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Work Progress Timeline</h2>
          <div className="space-y-4">
            {timeline.map((step, index) => {
              const isCompleted = step.state === 'completed';
              const isCurrent = step.state === 'current';
              const isPending = step.state === 'pending';

              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                        isCompleted
                          ? 'bg-green-100 border-green-500 text-green-600'
                          : isCurrent
                            ? 'bg-cyan-100 border-cyan-500 text-cyan-600'
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : isCurrent ? (
                        <WrenchScrewdriverIcon className="w-4 h-4" />
                      ) : (
                        <ClockIcon className="w-4 h-4" />
                      )}
                    </span>
                    {index !== timeline.length - 1 && <span className="w-[2px] flex-1 bg-gray-200 mt-1" />}
                  </div>

                  <div className="pb-4 flex-1">
                    <p className={`font-semibold ${isPending ? 'text-gray-500' : 'text-gray-800'}`}>{step.title}</p>
                    <p className="text-sm text-gray-500 mt-1">{step.subtitle}</p>
                    <p className="text-xs text-gray-400 mt-1">{step.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
