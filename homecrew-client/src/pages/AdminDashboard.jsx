import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './AdminDashboard.css';

const ORDER_STATUSES = ['NOT_PAID', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statusLabel = (s) => s?.replace(/_/g, ' ');
const statusClass = (s) => ({
  NOT_PAID: 'st-notpaid',
  READY_TO_SHIP: 'st-ready',
  SHIPPED: 'st-shipped',
  DELIVERED: 'st-delivered',
  CANCELLED: 'st-cancelled',
}[s] || '');

// ─── Confirm Modal ─────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-box">
      <p>{message}</p>
      <div className="modal-actions">
        <button className="btn-danger" onClick={onConfirm}>Yes, Delete</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

// ─── OVERVIEW TAB ──────────────────────────────────────────────────────────
const OverviewTab = ({ orders, services, users, categories }) => {
  const revenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
  const recent = [...orders].sort((a, b) => b.id - a.id).slice(0, 5);
  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card blue"><div className="stat-num">{orders.length}</div><div className="stat-label">Total Orders</div></div>
        <div className="stat-card green"><div className="stat-num">৳{revenue.toFixed(0)}</div><div className="stat-label">Total Revenue</div></div>
        <div className="stat-card purple"><div className="stat-num">{services.length}</div><div className="stat-label">Services</div></div>
        <div className="stat-card orange"><div className="stat-num">{users.length}</div><div className="stat-label">Users</div></div>
        <div className="stat-card teal"><div className="stat-num">{categories.length}</div><div className="stat-label">Categories</div></div>
        <div className="stat-card red"><div className="stat-num">{orders.filter(o => o.status === 'NOT_PAID').length}</div><div className="stat-label">Unpaid Orders</div></div>
      </div>
      <div className="section-card">
        <h3>Recent Orders</h3>
        <table className="admin-table">
          <thead><tr><th>#</th><th>Client</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {recent.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.client_email || o.client || '—'}</td>
                <td>৳{o.total_price}</td>
                <td><span className={`status-badge ${statusClass(o.status)}`}>{statusLabel(o.status)}</span></td>
                <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {recent.length === 0 && <tr><td colSpan={5} className="empty-row">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── ORDERS TAB ────────────────────────────────────────────────────────────
const OrdersTab = ({ orders, onStatusChange }) => {
  const [filter, setFilter] = useState('ALL');
  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);
  return (
    <div className="section-card">
      <div className="tab-toolbar">
        <h3>All Orders</h3>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="filter-select">
          <option value="ALL">All Status</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>
      <table className="admin-table">
        <thead><tr><th>#</th><th>Client</th><th>Items</th><th>Total</th><th>Change Status</th><th>Date</th></tr></thead>
        <tbody>
          {filtered.map(o => (
            <tr key={o.id}>
              <td>#{o.id}</td>
              <td>{o.client_email || o.client || '—'}</td>
              <td>{o.items?.length || 0} item(s)</td>
              <td>৳{o.total_price}</td>
              <td>
                <select
                  value={o.status}
                  onChange={e => onStatusChange(o.id, e.target.value)}
                  className="status-select"
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              </td>
              <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={6} className="empty-row">No orders found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

// ─── SERVICES TAB ──────────────────────────────────────────────────────────
const ServicesTab = ({ services, categories, onRefresh }) => {
  const emptyForm = { name: '', description: '', price: '', category: '' };
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [currentImage, setCurrentImage] = useState(''); // existing image when editing
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [saving, setSaving] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview('');
    setCurrentImage('');
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category || null,
      };
      let res;
      if (editId) {
        res = await api.patch(`/services/${editId}/`, payload);
      } else {
        res = await api.post('/services/', payload);
      }
      // Upload image file if selected
      if (imageFile) {
        const serviceId = editId || res.data.id;
        const fd = new FormData();
        fd.append('image', imageFile);
        await api.post(`/services/${serviceId}/images/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setMsg({ text: editId ? 'Service updated!' : 'Service created!', ok: true });
      resetForm();
      onRefresh();
    } catch (err) {
      setMsg({ text: 'Error: ' + JSON.stringify(err.response?.data || err.message), ok: false });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (svc) => {
    setEditId(svc.id);
    setForm({
      name: svc.name,
      description: svc.description,
      price: svc.price,
      category: svc.category?.id || svc.category || '',
    });
    setImageFile(null);
    setImagePreview('');
    setCurrentImage(svc.images?.[0]?.image || '');
    window.scrollTo(0, 0);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/services/${deleteId}/`);
      setDeleteId(null);
      setMsg({ text: 'Service deleted.', ok: true });
      onRefresh();
    } catch {
      setMsg({ text: 'Delete failed.', ok: false });
      setDeleteId(null);
    }
  };

  return (
    <div>
      {deleteId && <ConfirmModal message="Delete this service?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="section-card">
        <h3>{editId ? 'Edit Service' : 'Add New Service'}</h3>
        {msg.text && <div className={`form-msg ${msg.ok ? 'msg-ok' : 'msg-err'}`}>{msg.text}</div>}
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div className="form-group"><label>Price (৳) *</label><input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required /></div>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              <option value="">— No Category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Description *</label><textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
          <div className="form-group">
            <label>Image {editId ? '(leave empty to keep current)' : ''}</label>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ padding: '4px 0' }} />
            {/* Preview: new file takes priority, else show current saved image */}
            {(imagePreview || currentImage) && (
              <div className="img-preview-wrap">
                <img
                  src={imagePreview || currentImage}
                  alt="preview"
                  className="img-preview"
                />
                {imagePreview && <span className="img-preview-label">New image selected</span>}
                {!imagePreview && currentImage && <span className="img-preview-label">Current image</span>}
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Service' : 'Create Service'}</button>
            {editId && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="section-card">
        <h3>All Services ({services.length})</h3>
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Rating</th><th>Actions</th></tr></thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id}>
                <td>
                  {s.images?.[0]?.image
                    ? <img src={s.images[0].image} alt={s.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
                    : <span style={{ color: '#ccc', fontSize: '1.4rem' }}>🖼️</span>}
                </td>
                <td>{s.name}</td>
                <td>{s.category?.name || '—'}</td>
                <td>৳{s.price}</td>
                <td>⭐ {parseFloat(s.avg_rating || 0).toFixed(1)}</td>
                <td>
                  <button className="btn-sm btn-edit" onClick={() => handleEdit(s)}>Edit</button>
                  <button className="btn-sm btn-danger" onClick={() => setDeleteId(s.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {services.length === 0 && <tr><td colSpan={6} className="empty-row">No services yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── CATEGORIES TAB ────────────────────────────────────────────────────────
const CategoriesTab = ({ categories, onRefresh }) => {
  const empty = { name: '', description: '' };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editId ? await api.patch(`/categories/${editId}/`, form) : await api.post('/categories/', form);
      setMsg({ text: editId ? 'Category updated!' : 'Category created!', ok: true });
      setForm(empty); setEditId(null); onRefresh();
    } catch (err) {
      setMsg({ text: 'Error: ' + JSON.stringify(err.response?.data || err.message), ok: false });
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteId}/`);
      setDeleteId(null); setMsg({ text: 'Category deleted.', ok: true }); onRefresh();
    } catch { setMsg({ text: 'Delete failed.', ok: false }); setDeleteId(null); }
  };

  return (
    <div>
      {deleteId && <ConfirmModal message="Delete this category?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="section-card">
        <h3>{editId ? 'Edit Category' : 'Add New Category'}</h3>
        {msg.text && <div className={`form-msg ${msg.ok ? 'msg-ok' : 'msg-err'}`}>{msg.text}</div>}
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group"><label>Name *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
            {editId && <button type="button" className="btn-secondary" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>}
          </div>
        </form>
      </div>
      <div className="section-card">
        <h3>All Categories ({categories.length})</h3>
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.description || '—'}</td>
                <td>
                  <button className="btn-sm btn-edit" onClick={() => { setEditId(c.id); setForm({name: c.name, description: c.description||''}); window.scrollTo(0,0); }}>Edit</button>
                  <button className="btn-sm btn-danger" onClick={() => setDeleteId(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={3} className="empty-row">No categories yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── USERS TAB ─────────────────────────────────────────────────────────────
const UsersTab = ({ users }) => {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    (`${u.first_name} ${u.last_name}`).toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="section-card">
      <div className="tab-toolbar">
        <h3>All Users ({users.length})</h3>
        <input className="search-input" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <table className="admin-table">
        <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th></tr></thead>
        <tbody>
          {filtered.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.first_name} {u.last_name}</td>
              <td>{u.email}</td>
              <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
              <td>{u.phone_number || '—'}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={5} className="empty-row">No users found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
const TABS = [
  { key: 'Overview',    icon: '📊' },
  { key: 'Orders',      icon: '📦' },
  { key: 'Services',    icon: '🛠️' },
  { key: 'Categories',  icon: '🏷️' },
  { key: 'Users',       icon: '👥' },
];

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [data, setData] = useState({ orders: [], services: [], users: [], categories: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchAll();
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, servicesRes, usersRes, catsRes] = await Promise.all([
        api.get('/orders/'),
        api.get('/services/'),
        api.get('/accounts/'),
        api.get('/categories/'),
      ]);
      const toArr = r => Array.isArray(r.data) ? r.data : (r.data?.results || []);
      setData({
        orders: toArr(ordersRes),
        services: toArr(servicesRes),
        users: toArr(usersRes),
        categories: toArr(catsRes),
      });
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/`, { status: newStatus });
      setData(prev => ({
        ...prev,
        orders: prev.orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o),
      }));
    } catch { alert('Failed to update order status'); }
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-wrapper">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-avatar">👤</div>
          <div>
            <div className="sidebar-name">{user?.first_name} {user?.last_name}</div>
            <div className="sidebar-role">Administrator</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(({ key, icon }) => (
            <button
              key={key}
              className={`sidebar-btn ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span className="tab-icon">{icon}</span>
              <span>{key}</span>
              {key === 'Orders' && data.orders.filter(o => o.status === 'NOT_PAID').length > 0 && (
                <span className="nav-badge">{data.orders.filter(o => o.status === 'NOT_PAID').length}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">{activeTab}</h1>
          <button className="btn-refresh" onClick={fetchAll} disabled={loading}>
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'Overview'   && <OverviewTab {...data} />}
            {activeTab === 'Orders'     && <OrdersTab orders={data.orders} onStatusChange={handleStatusChange} />}
            {activeTab === 'Services'   && <ServicesTab services={data.services} categories={data.categories} onRefresh={fetchAll} />}
            {activeTab === 'Categories' && <CategoriesTab categories={data.categories} onRefresh={fetchAll} />}
            {activeTab === 'Users'      && <UsersTab users={data.users} />}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
