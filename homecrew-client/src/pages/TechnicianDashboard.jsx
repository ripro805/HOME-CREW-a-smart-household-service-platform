import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import TechnicianSidebar from '../components/technician/TechnicianSidebar';
import DashboardPage from './technician/DashboardPage';
import AvailableJobsPage from './technician/AvailableJobsPage';
import MyJobsPage from './technician/MyJobsPage';
import EarningsPage from './technician/EarningsPage';
import RatingsPage from './technician/RatingsPage';
import NotificationsPage from './technician/NotificationsPage';
import ProfileSettingsPage from './technician/ProfileSettingsPage';
import { seedMyJobs, seedNotifications, seedReviews } from './technician/dummyData';

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tech_notif_read') || '[]');
    } catch {
      return [];
    }
  });
  const [profile, setProfile] = useState({
    name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Technician' : 'Technician',
    email: user?.email || '',
    phone: user?.phone_number || '',
    skills: 'Electrical, Plumbing, Home Service',
    experience: '2 years',
    location: user?.address || 'Dhaka',
  });

  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || prev.name : prev.name,
      email: user?.email || prev.email,
      phone: user?.phone_number || prev.phone,
      location: user?.address || prev.location,
    }));
  }, [user]);

  const fetchTechnicianData = useCallback(async () => {
    try {
      const [ordersRes, reviewsRes] = await Promise.all([
        api.get('/orders/my_assigned/'),
        api.get('/services/technician/reviews/').catch(() => ({ data: [] })),
      ]);

      const fetchedOrders = ordersRes.data?.results || ordersRes.data || [];
      setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);

      const fetchedReviews = reviewsRes.data || [];
      const mappedReviews = (Array.isArray(fetchedReviews) ? fetchedReviews : []).map((review) => ({
        id: review.id,
        client: review.client_name || review.client_email || 'Client',
        rating: Number(review.rating || 0),
        comment: review.comment || '',
        date: review.created_at,
      }));
      setReviews(mappedReviews);
    } catch {
      setOrders([]);
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    fetchTechnicianData();
    const intervalId = window.setInterval(fetchTechnicianData, 12000);
    return () => window.clearInterval(intervalId);
  }, [fetchTechnicianData]);

  const isTechnicianOne = useMemo(() => {
    const email = String(user?.email || '').toLowerCase();
    return Number(user?.id) === 1 || email === 'technician001@gmail.com';
  }, [user]);

  const mapOrderToJob = useCallback((order) => {
    const firstService = order.items?.[0]?.service;
    const serviceName = firstService?.name || `Order #${order.id}`;
    const categoryName = firstService?.category?.name || 'General Service';
    const status = order.status === 'DELIVERED' ? 'completed' : order.status === 'SHIPPED' ? 'ongoing' : 'pending';
    const location = order.service_address || order.client_name || 'Dhaka';
    const description = order.items?.length
      ? order.items.map((item) => item.service?.name || 'Service').join(', ')
      : 'Service request from client';

    return {
      id: order.id,
      serviceType: serviceName,
      category: categoryName,
      location,
      description,
      budget: Number(order.total_price || 0),
      amount: Number(order.total_price || 0),
      status,
      requestedAt: order.created_at,
      assignedAt: order.assigned_at,
      acceptedAt: order.technician_accepted_at,
    };
  }, []);

  const availableJobs = useMemo(
    () => orders
      .filter((order) => order.status === 'READY_TO_SHIP' && !order.technician_accepted_at)
      .map(mapOrderToJob),
    [orders, mapOrderToJob]
  );

  const liveMyJobs = useMemo(
    () => orders
      .filter((order) => Boolean(order.technician_accepted_at))
      .map(mapOrderToJob),
    [orders, mapOrderToJob]
  );

  const demoCompletedJobs = useMemo(
    () => seedMyJobs
      .filter((job) => job.status === 'completed')
      .map((job) => ({
        ...job,
        id: `demo-${job.id}`,
      })),
    []
  );

  const myJobs = useMemo(
    () => (isTechnicianOne ? [...liveMyJobs, ...demoCompletedJobs] : liveMyJobs),
    [isTechnicianOne, liveMyJobs, demoCompletedJobs]
  );

  const notifications = useMemo(() => {
    const rows = [];

    orders.forEach((order) => {
      const serviceName = order.items?.[0]?.service?.name || `Order #${order.id}`;
      if (order.status === 'READY_TO_SHIP' && !order.technician_accepted_at) {
        rows.push({
          id: `assigned-${order.id}`,
          title: 'New Job Assigned',
          message: `Order #${order.id} (${serviceName}) is assigned to you. Accept to start.`,
          time: order.assigned_at || order.created_at,
        });
      } else if (order.status === 'READY_TO_SHIP' && order.technician_accepted_at) {
        rows.push({
          id: `accepted-${order.id}`,
          title: 'Job Accepted',
          message: `You accepted Order #${order.id}. Start when you are ready.`,
          time: order.technician_accepted_at,
        });
      } else if (order.status === 'SHIPPED') {
        rows.push({
          id: `ongoing-${order.id}`,
          title: 'Job Ongoing',
          message: `Order #${order.id} is currently ongoing.`,
          time: order.assigned_at || order.created_at,
        });
      } else if (order.status === 'DELIVERED') {
        rows.push({
          id: `done-${order.id}`,
          title: 'Job Completed',
          message: `Order #${order.id} marked completed. Waiting for client review.`,
          time: order.created_at,
        });
      }
    });

    const liveRows = rows
      .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
      .map((row) => ({ ...row, read: readNotifIds.includes(row.id) }));

    if (!isTechnicianOne) return liveRows;

    const demoRows = seedNotifications.map((row) => ({
      ...row,
      id: `demo-notif-${row.id}`,
      read: readNotifIds.includes(`demo-notif-${row.id}`) || Boolean(row.read),
    }));

    return [...liveRows, ...demoRows];
  }, [isTechnicianOne, orders, readNotifIds]);

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const onAcceptJob = async (jobId) => {
    const optimisticAcceptedAt = new Date().toISOString();
    setOrders((prev) =>
      prev.map((order) =>
        order.id === jobId
          ? {
              ...order,
              technician_accepted_at: order.technician_accepted_at || optimisticAcceptedAt,
            }
          : order
      )
    );

    try {
      await api.patch(`/orders/${jobId}/accept_job/`);
      await fetchTechnicianData();
    } catch {
      await fetchTechnicianData();
    }
  };

  const onStartJob = async (jobId) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === jobId
          ? {
              ...order,
              status: 'SHIPPED',
            }
          : order
      )
    );

    try {
      await api.patch(`/orders/${jobId}/technician_update_status/`, { status: 'SHIPPED' });
      await fetchTechnicianData();
    } catch {
      await fetchTechnicianData();
    }
  };

  const onCompleteJob = async (jobId) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === jobId
          ? {
              ...order,
              status: 'DELIVERED',
            }
          : order
      )
    );

    try {
      await api.patch(`/orders/${jobId}/technician_update_status/`, { status: 'DELIVERED' });
      await fetchTechnicianData();
    } catch {
      await fetchTechnicianData();
    }
  };

  const onMarkRead = (id) => {
    const updated = [...new Set([...readNotifIds, id])];
    setReadNotifIds(updated);
    localStorage.setItem('tech_notif_read', JSON.stringify(updated));
  };

  const displayReviews = useMemo(() => {
    if (!isTechnicianOne) return reviews;

    const demoMapped = seedReviews.map((review) => ({
      ...review,
      id: `demo-review-${review.id}`,
    }));

    return [...reviews, ...demoMapped];
  }, [isTechnicianOne, reviews]);

  const summary = useMemo(() => {
    const totalJobs = myJobs.length;
    const completedJobs = myJobs.filter((j) => j.status === 'completed').length;
    const pendingJobs = myJobs.filter((j) => j.status === 'pending').length;
    const totalEarnings = myJobs
      .filter((j) => j.status === 'completed')
      .reduce((sum, j) => sum + Number(j.amount || 0), 0);
    return { totalJobs, completedJobs, pendingJobs, totalEarnings };
  }, [myJobs]);

  const recentJobs = useMemo(() => [...myJobs].slice(0, 6), [myJobs]);
  const completedJobs = useMemo(() => myJobs.filter((j) => j.status === 'completed'), [myJobs]);
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <TechnicianSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        onLogout={onLogout}
      />

      <div className="flex-1 min-w-0">
        <main className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<DashboardPage summary={summary} recentJobs={recentJobs} />} />
            <Route
              path="/available-jobs"
              element={<AvailableJobsPage jobs={availableJobs} onAccept={onAcceptJob} />}
            />
            <Route
              path="/my-jobs"
              element={<MyJobsPage jobs={myJobs} onStartJob={onStartJob} onCompleteJob={onCompleteJob} />}
            />
            <Route path="/earnings" element={<EarningsPage completedJobs={completedJobs} />} />
            <Route path="/ratings" element={<RatingsPage reviews={displayReviews} />} />
            <Route
              path="/notifications"
              element={<NotificationsPage notifications={notifications} onMarkRead={onMarkRead} />}
            />
            <Route
              path="/profile-settings"
              element={<ProfileSettingsPage profile={profile} onSaveProfile={setProfile} />}
            />
            <Route path="*" element={<Navigate to="." replace />} />
          </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
