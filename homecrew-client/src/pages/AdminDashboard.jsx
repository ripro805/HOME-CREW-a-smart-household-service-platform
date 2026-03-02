import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './AdminDashboard.css';

// ─── CONSTANTS & HELPERS ────────────────────────────────────────────────────
const ORDER_STATUSES = ['NOT_PAID', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const STATUS_LABELS  = { NOT_PAID:'Pending Payment', READY_TO_SHIP:'Confirmed', SHIPPED:'Ongoing', DELIVERED:'Completed', CANCELLED:'Cancelled' };
const STATUS_COLORS  = { NOT_PAID:'#f59e0b', READY_TO_SHIP:'#3b82f6', SHIPPED:'#8b5cf6', DELIVERED:'#22c55e', CANCELLED:'#ef4444' };

const fmt$   = n  => `৳${parseFloat(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtD   = d  => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDT  = d  => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
const slabel = s  => STATUS_LABELS[s] || (s||'').replace(/_/g,' ');
const scls   = s  => `st-${(s||'').toLowerCase().replace(/_/g,'-')}`;
const stars  = r  => '★'.repeat(Math.round(r||0)) + '☆'.repeat(5-Math.round(r||0));
const daysAgo = n => new Date(Date.now() - n * 864e5);

// ─── PRIMITIVES ─────────────────────────────────────────────────────────────
const Spinner = () => <div className="spinner" />;

const ConfirmModal = ({ msg, onOk, onCancel }) => (
  <div className="overlay">
    <div className="modal-box">
      <p>{msg}</p>
      <div className="modal-actions">
        <button className="btn btn-danger" onClick={onOk}>Confirm</button>
        <button className="btn btn-ghost"  onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

const Alert = ({ text, ok }) => text
  ? <div className={`alert ${ok ? 'alert-ok' : 'alert-err'}`}>{text}</div>
  : null;

// ─── CSS CHARTS ─────────────────────────────────────────────────────────────
const BarChart = ({ data = [], height = 130 }) => {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="bar-chart" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="bar-col" title={`${d.l}: ${d.v}`}>
          <div className="bar-fill" style={{ height:`${Math.round(d.v/max*100)}%`, background: d.c||'#6366f1' }} />
          <div className="bar-lbl">{d.l}</div>
        </div>
      ))}
      {data.length === 0 && <p className="empty" style={{width:'100%',textAlign:'center',fontSize:'0.8rem'}}>No data</p>}
    </div>
  );
};

const DonutChart = ({ segs = [] }) => {
  const total = segs.reduce((s, x) => s + x.v, 0) || 1;
  let cum = 0;
  const grad = segs.length
    ? segs.map(x => { const s = cum; cum += x.v / total * 100; return `${x.c} ${s}% ${cum}%`; }).join(',')
    : '#e5e7eb 0% 100%';
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background:`conic-gradient(${grad})` }}>
        <div className="donut-hole">{segs.reduce((s,x)=>s+x.v,0)}</div>
      </div>
      <div className="donut-legend">
        {segs.map((x, i) => (
          <div key={i} className="legend-item">
            <span className="legend-dot" style={{ background: x.c }} />
            <span>{x.l}: <b>{x.v}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── 1. DASHBOARD TAB ───────────────────────────────────────────────────────
const DashboardTab = ({ orders, services, users, categories }) => {
  const [range, setRange] = useState(30);

  const inRange = useMemo(() =>
    orders.filter(o => o.created_at && new Date(o.created_at) >= daysAgo(range)),
    [orders, range]);

  const revenue   = useMemo(() => inRange.reduce((s,o) => s+parseFloat(o.total_price||0), 0), [inRange]);
  const pending   = inRange.filter(o => o.status === 'NOT_PAID').length;
  const ongoing   = inRange.filter(o => o.status === 'SHIPPED').length;
  const completed = inRange.filter(o => o.status === 'DELIVERED').length;
  const cancelled = inRange.filter(o => o.status === 'CANCELLED').length;

  const last7 = useMemo(() => Array.from({length:7}, (_, i) => {
    const d = daysAgo(6-i);
    return {
      l: d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),
      v: orders.filter(o => o.created_at && new Date(o.created_at).toDateString()===d.toDateString()).length,
      c: '#6366f1',
    };
  }), [orders]);

  const catBar = useMemo(() =>
    categories.slice(0,8).map((cat, i) => ({
      l: cat.name.length > 8 ? cat.name.slice(0,8)+'…' : cat.name,
      v: services.filter(s => (s.category?.id||s.category) === cat.id).length,
      c: ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'][i%8],
    })),
    [categories, services]);

  const statusSegs = ORDER_STATUSES
    .map(s => ({ l: slabel(s), v: inRange.filter(o=>o.status===s).length, c: STATUS_COLORS[s] }))
    .filter(x => x.v > 0);

  const recent = [...orders].sort((a,b) => b.id-a.id).slice(0,8);

  return (
    <div className="tab-content">
      <div className="filter-row">
        <span className="filter-label">Show data for:</span>
        {[1,7,30,90].map(n => (
          <button key={n} className={`pill ${range===n?'active':''}`} onClick={() => setRange(n)}>
            {n===1 ? 'Today' : `Last ${n} days`}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card c-blue">  <div className="stat-icon">📦</div><div className="stat-num">{inRange.length}</div>  <div className="stat-label">Total Orders</div></div>
        <div className="stat-card c-green"> <div className="stat-icon">💰</div><div className="stat-num">{fmt$(revenue)}</div><div className="stat-label">Revenue</div></div>
        <div className="stat-card c-gold">  <div className="stat-icon">⏳</div><div className="stat-num">{pending}</div>   <div className="stat-label">Pending Payment</div></div>
        <div className="stat-card c-purple"><div className="stat-icon">🔄</div><div className="stat-num">{ongoing}</div>   <div className="stat-label">Ongoing</div></div>
        <div className="stat-card c-teal">  <div className="stat-icon">✅</div><div className="stat-num">{completed}</div><div className="stat-label">Completed</div></div>
        <div className="stat-card c-red">   <div className="stat-icon">❌</div><div className="stat-num">{cancelled}</div><div className="stat-label">Cancelled</div></div>
        <div className="stat-card c-indigo"><div className="stat-icon">🛠️</div><div className="stat-num">{services.length}</div><div className="stat-label">Services</div></div>
        <div className="stat-card c-pink">  <div className="stat-icon">👥</div><div className="stat-num">{users.length}</div>   <div className="stat-label">Users</div></div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <h4 className="chart-title">📊 Daily Orders (Last 7 Days)</h4>
          <BarChart data={last7} />
        </div>
        <div className="chart-card">
          <h4 className="chart-title">🥧 Order Status Distribution</h4>
          <DonutChart segs={statusSegs} />
        </div>
        <div className="chart-card">
          <h4 className="chart-title">🏷️ Services by Category</h4>
          <BarChart data={catBar} />
        </div>
      </div>

      <div className="section-card">
        <h3>Recent Bookings</h3>
        <table className="admin-table">
          <thead><tr><th>#</th><th>Client</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {recent.map(o => (
              <tr key={o.id}>
                <td><b>#{o.id}</b></td>
                <td>{o.client_email || o.client || '—'}</td>
                <td>{o.items?.length || 0}</td>
                <td>{fmt$(o.total_price)}</td>
                <td><span className={`badge ${scls(o.status)}`}>{slabel(o.status)}</span></td>
                <td>{fmtD(o.created_at)}</td>
              </tr>
            ))}
            {!recent.length && <tr><td colSpan={6} className="empty">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 2. ORDERS TAB ──────────────────────────────────────────────────────────
const OrdersTab = ({ orders, onStatusChange, onRefresh }) => {
  const [sub,    setSub]    = useState('ALL');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [notes,  setNotes]  = useState({});
  const [noteInput, setNoteInput] = useState('');
  const [msg, setMsg] = useState({ text:'', ok:true });

  const subMap = { ALL:null, NEW:'NOT_PAID', CONFIRMED:'READY_TO_SHIP', ONGOING:'SHIPPED', COMPLETED:'DELIVERED', CANCELLED:'CANCELLED' };

  const counts = useMemo(() => ({
    ALL: orders.length,
    NEW: orders.filter(o=>o.status==='NOT_PAID').length,
    CONFIRMED: orders.filter(o=>o.status==='READY_TO_SHIP').length,
    ONGOING: orders.filter(o=>o.status==='SHIPPED').length,
    COMPLETED: orders.filter(o=>o.status==='DELIVERED').length,
    CANCELLED: orders.filter(o=>o.status==='CANCELLED').length,
  }), [orders]);

  const SUB_LABELS = { ALL:'All Bookings', NEW:'New', CONFIRMED:'Confirmed', ONGOING:'Ongoing', COMPLETED:'Completed', CANCELLED:'Cancelled' };

  const filtered = useMemo(() => {
    let r = orders;
    if (subMap[sub]) r = r.filter(o => o.status === subMap[sub]);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(o => String(o.id).includes(q) || (o.client_email||'').toLowerCase().includes(q));
    }
    return [...r].sort((a,b) => b.id-a.id);
  }, [orders, sub, search]);

  const handleStatusChange = async (id, status) => {
    await onStatusChange(id, status);
    if (detail?.id === id) setDetail(p => p ? {...p, status} : null);
  };

  const saveNote = (id) => {
    if (!noteInput.trim()) return;
    setNotes(p => ({ ...p, [id]: [...(p[id]||[]), { text: noteInput, time: new Date().toISOString() }] }));
    setNoteInput('');
    setMsg({ text: 'Note saved.', ok: true });
    setTimeout(() => setMsg({text:'',ok:true}), 2000);
  };

  return (
    <div className="tab-content">
      <div className="sub-tabs">
        {Object.entries(SUB_LABELS).map(([key, label]) => (
          <button key={key} className={`sub-tab ${sub===key?'active':''}`} onClick={() => setSub(key)}>
            {label}
            <span className="sub-badge">{counts[key]||0}</span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input className="search-box" placeholder="🔍 Search by order ID or client email..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>🔄 Refresh</button>
      </div>
      <div className="section-card">
        <table className="admin-table">
          <thead><tr><th>#</th><th>Client</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td><b>#{o.id}</b></td>
                <td>{o.client_email || o.client || '—'}</td>
                <td>{o.items?.length||0} item(s)</td>
                <td><b>{fmt$(o.total_price)}</b></td>
                <td>
                  <select
                    className="status-sel"
                    value={o.status}
                    onChange={e => handleStatusChange(o.id, e.target.value)}
                    style={{ borderColor: STATUS_COLORS[o.status], color: STATUS_COLORS[o.status] }}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{slabel(s)}</option>)}
                  </select>
                </td>
                <td>{fmtD(o.created_at)}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => setDetail(o)}>👁 View</button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="empty">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="overlay" onClick={() => setDetail(null)}>
          <div className="modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Order #{detail.id}</h3>
                <span className={`badge ${scls(detail.status)}`}>{slabel(detail.status)}</span>
              </div>
              <button className="modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div>
                  <h4>Client Info</h4>
                  <p><span className="detail-key">Email:</span> {detail.client_email||detail.client||'—'}</p>
                  <p><span className="detail-key">Order Date:</span> {fmtDT(detail.created_at)}</p>
                  <p><span className="detail-key">Total:</span> <b>{fmt$(detail.total_price)}</b></p>
                </div>
                <div>
                  <h4>Change Status</h4>
                  <select
                    className="status-sel wide"
                    value={detail.status}
                    onChange={e => { handleStatusChange(detail.id, e.target.value); setDetail(p => ({...p, status:e.target.value})); }}
                    style={{ borderColor: STATUS_COLORS[detail.status] }}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{slabel(s)}</option>)}
                  </select>
                </div>
              </div>
              <h4>Order Items ({detail.items?.length||0})</h4>
              <table className="admin-table">
                <thead><tr><th>Service</th><th>Qty</th><th>Price</th></tr></thead>
                <tbody>
                  {(detail.items||[]).map((item, i) => (
                    <tr key={i}>
                      <td>{item.service?.name||item.service||`Item ${i+1}`}</td>
                      <td>{item.quantity||1}</td>
                      <td>{fmt$(item.service?.price||item.price||0)}</td>
                    </tr>
                  ))}
                  {!detail.items?.length && <tr><td colSpan={3} className="empty">No items.</td></tr>}
                </tbody>
              </table>
              <h4>Admin Notes</h4>
              <Alert text={msg.text} ok={msg.ok} />
              <div className="notes-list">
                {(notes[detail.id]||[]).map((n,i) => (
                  <div key={i} className="note-item">
                    <span className="note-time">{fmtDT(n.time)}</span>
                    <span>{n.text}</span>
                  </div>
                ))}
                {!(notes[detail.id]||[]).length && <p className="empty">No admin notes yet.</p>}
              </div>
              <div className="note-input-row">
                <input
                  placeholder="Write an internal note..."
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && saveNote(detail.id)}
                />
                <button className="btn btn-primary btn-sm" onClick={() => saveNote(detail.id)}>Add Note</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 3. SERVICES TAB ────────────────────────────────────────────────────────
const ServicesTab = ({ services, categories, onRefresh }) => {
  const EMPTY = { name:'', description:'', price:'', category:'', duration:'60', is_popular:false, available:true };
  const [form, setForm]         = useState(EMPTY);
  const [imgFile, setImgFile]   = useState(null);
  const [imgPrev, setImgPrev]   = useState('');
  const [currImg, setCurrImg]   = useState('');
  const [editId, setEditId]     = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg]           = useState({ text:'', ok:true });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('');

  const filtered = useMemo(() => {
    let r = services;
    if (filterCat) r = r.filter(s => (s.category?.id||s.category) === parseInt(filterCat));
    if (search.trim()) r = r.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [services, search, filterCat]);

  const reset = () => { setForm(EMPTY); setImgFile(null); setImgPrev(''); setCurrImg(''); setEditId(null); };

  const handleImg = e => {
    const f = e.target.files[0]; if (!f) return;
    setImgFile(f); setImgPrev(URL.createObjectURL(f));
  };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { name:form.name, description:form.description, price:parseFloat(form.price), category_id:form.category||null };
      let res;
      if (editId) res = await api.patch(`/services/${editId}/`, payload);
      else        res = await api.post('/services/', payload);
      if (imgFile) {
        const id = editId || res.data.id;
        const fd = new FormData(); fd.append('image', imgFile);
        await api.post(`/services/${id}/images/`, fd, { headers:{'Content-Type':'multipart/form-data'} });
      }
      setMsg({ text: editId ? '✅ Service updated!' : '✅ Service created!', ok:true });
      reset(); onRefresh();
    } catch(err) {
      setMsg({ text:'❌ Error: '+JSON.stringify(err.response?.data||err.message), ok:false });
    } finally { setSaving(false); }
  };

  const handleEdit = s => {
    setEditId(s.id);
    setForm({ name:s.name, description:s.description, price:s.price, category:s.category?.id||s.category||'', duration:'60', is_popular:false, available:true });
    setCurrImg(s.images?.[0]?.image||'');
    setImgFile(null); setImgPrev('');
    window.scrollTo(0,0);
  };

  const handleDelete = async () => {
    try { await api.delete(`/services/${deleteId}/`); setDeleteId(null); setMsg({text:'✅ Deleted.',ok:true}); onRefresh(); }
    catch { setMsg({text:'❌ Delete failed.',ok:false}); setDeleteId(null); }
  };

  return (
    <div className="tab-content">
      {deleteId && <ConfirmModal msg="Delete this service permanently?" onOk={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="section-card">
        <h3>{editId ? '✏️ Edit Service' : '➕ Add New Service'}</h3>
        <Alert text={msg.text} ok={msg.ok} />
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Service Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            <div className="form-group"><label>Base Price (৳) *</label><input type="number" step="0.01" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                <option value="">— No Category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Duration (minutes)</label><input type="number" min="15" step="15" value={form.duration} placeholder="e.g. 60" onChange={e=>setForm({...form,duration:e.target.value})} /></div>
          </div>
          <div className="form-group"><label>Description *</label><textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required /></div>
          <div className="form-row">
            <div className="form-group">
              <label>Service Image {editId ? '(leave empty to keep current)' : ''}</label>
              <input type="file" accept="image/*" onChange={handleImg} style={{padding:'4px 0'}} />
              {(imgPrev || currImg) && (
                <div className="img-preview-wrap">
                  <img src={imgPrev||currImg} alt="preview" className="img-preview" />
                  <span className="img-label">{imgPrev ? '🆕 New image' : '📌 Current image'}</span>
                </div>
              )}
            </div>
            <div className="form-group toggles-group">
              <label className="toggle-label">
                <input type="checkbox" checked={form.is_popular} onChange={e=>setForm({...form,is_popular:e.target.checked})} />
                <span>⭐ Mark as Popular</span>
              </label>
              <label className="toggle-label">
                <input type="checkbox" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})} />
                <span>✅ Available</span>
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update Service' : 'Create Service'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="section-card">
        <div className="toolbar">
          <h3>All Services <span className="count-badge">{filtered.length}/{services.length}</span></h3>
          <input className="search-box" placeholder="🔍 Search services..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="filter-sel" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  {s.images?.[0]?.image
                    ? <img src={s.images[0].image} alt={s.name} className="tbl-thumb" />
                    : <div className="no-img">📷</div>}
                </td>
                <td><b>{s.name}</b></td>
                <td>{s.category?.name || '—'}</td>
                <td><b>{fmt$(s.price)}</b></td>
                <td><span className="stars-sm">{stars(s.avg_rating)}</span> <small>{parseFloat(s.avg_rating||0).toFixed(1)}</small></td>
                <td><span className="badge st-delivered">Active</span></td>
                <td className="actions">
                  <button className="btn btn-sm btn-outline" onClick={() => handleEdit(s)}>✏️ Edit</button>
                  <button className="btn btn-sm btn-danger"  onClick={() => setDeleteId(s.id)}>🗑️</button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="empty">No services found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 4. CATEGORIES TAB ──────────────────────────────────────────────────────
const CategoriesTab = ({ categories, services, onRefresh }) => {
  const EMPTY = { name:'', description:'', icon:'🏠', priority:0 };
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg]           = useState({ text:'', ok:true });
  const svcCount = id => services.filter(s => (s.category?.id||s.category) === id).length;

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = { name:form.name, description:form.description };
      editId ? await api.patch(`/categories/${editId}/`, payload) : await api.post('/categories/', payload);
      setMsg({ text: editId ? '✅ Category updated!' : '✅ Category created!', ok:true });
      setForm(EMPTY); setEditId(null); onRefresh();
    } catch(err) { setMsg({ text:'❌ Error: '+JSON.stringify(err.response?.data||err.message), ok:false }); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/categories/${deleteId}/`); setDeleteId(null); setMsg({text:'✅ Deleted.',ok:true}); onRefresh(); }
    catch { setMsg({text:'❌ Delete failed.',ok:false}); setDeleteId(null); }
  };

  return (
    <div className="tab-content">
      {deleteId && <ConfirmModal msg="Delete this category?" onOk={handleDelete} onCancel={() => setDeleteId(null)} />}
      <div className="section-card">
        <h3>{editId ? '✏️ Edit Category' : '➕ New Category'}</h3>
        <Alert text={msg.text} ok={msg.ok} />
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Category Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            <div className="form-group" style={{flex:'0 0 80px'}}><label>Icon</label><input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="🏠" style={{fontSize:'1.4rem',textAlign:'center'}} /></div>
            <div className="form-group" style={{flex:'0 0 160px'}}><label>Homepage Priority</label><input type="number" min="0" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} /></div>
          </div>
          <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Create'}</button>
            {editId && <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="section-card">
        <h3>All Categories ({categories.length})</h3>
        <div className="cat-grid">
          {categories.map(c => (
            <div key={c.id} className="cat-card">
              <div className="cat-icon">🏷️</div>
              <div className="cat-info">
                <h4>{c.name}</h4>
                <p>{c.description || <em>No description</em>}</p>
                <span className="badge c-blue">{svcCount(c.id)} services</span>
              </div>
              <div className="cat-actions">
                <button className="btn btn-sm btn-outline" onClick={() => { setEditId(c.id); setForm({name:c.name,description:c.description||'',icon:'🏷️',priority:0}); window.scrollTo(0,0); }}>Edit</button>
                <button className="btn btn-sm btn-danger"  onClick={() => setDeleteId(c.id)}>Delete</button>
              </div>
            </div>
          ))}
          {!categories.length && <p className="empty">No categories yet.</p>}
        </div>
      </div>
    </div>
  );
};

// ─── 5. USERS TAB ───────────────────────────────────────────────────────────
const UsersTab = ({ users, onRefresh }) => {
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('all');
  const [selected,    setSelected]    = useState(null);
  const [blocked,     setBlocked]     = useState({});
  const [msg,         setMsg]         = useState({ text:'', ok:true });

  const filtered = useMemo(() => {
    let r = users;
    if (roleFilter !== 'all') r = r.filter(u => u.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(u => (u.email||'').toLowerCase().includes(q) || (`${u.first_name||''} ${u.last_name||''}`).toLowerCase().includes(q));
    }
    return r;
  }, [users, search, roleFilter]);

  const toggleBlock = u => {
    const isBlocked = blocked[u.id] !== undefined ? blocked[u.id] : !u.is_active;
    setBlocked(p => ({...p, [u.id]: !isBlocked}));
    setMsg({ text: `User ${!isBlocked ? 'blocked' : 'unblocked'}.`, ok:true });
    setTimeout(() => setMsg({text:'',ok:true}), 2500);
  };

  const roleCount = r => users.filter(u => u.role === r).length;

  return (
    <div className="tab-content">
      <div className="stats-grid sm">
        <div className="stat-card c-blue">  <div className="stat-num">{users.length}</div>        <div className="stat-label">Total Users</div></div>
        <div className="stat-card c-green"> <div className="stat-num">{roleCount('client')}</div> <div className="stat-label">Clients</div></div>
        <div className="stat-card c-purple"><div className="stat-num">{roleCount('admin')}</div>  <div className="stat-label">Admins/Staff</div></div>
        <div className="stat-card c-red">   <div className="stat-num">{Object.values(blocked).filter(Boolean).length}</div><div className="stat-label">Blocked</div></div>
      </div>
      <Alert text={msg.text} ok={msg.ok} />
      <div className="section-card">
        <div className="toolbar">
          <h3>User Management</h3>
          <input className="search-box" placeholder="🔍 Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="filter-sel" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="client">Clients</option>
            <option value="admin">Admins</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>🔄</button>
        </div>
        <table className="admin-table">
          <thead><tr><th>#</th><th>Avatar</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(u => {
              const isBlocked = blocked[u.id] !== undefined ? blocked[u.id] : !u.is_active;
              return (
                <tr key={u.id} className={isBlocked ? 'row-blocked' : ''}>
                  <td>{u.id}</td>
                  <td><div className="user-mini-avatar">{(u.first_name||'U')[0].toUpperCase()}</div></td>
                  <td><b>{u.first_name} {u.last_name}</b></td>
                  <td>{u.email}</td>
                  <td><span className={`badge role-${u.role}`}>{u.role}</span></td>
                  <td>{u.phone_number || '—'}</td>
                  <td><span className={`badge ${isBlocked ? 'st-cancelled' : 'st-delivered'}`}>{isBlocked ? 'Blocked' : 'Active'}</span></td>
                  <td className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => setSelected(u)}>👁 View</button>
                    <button className={`btn btn-sm ${isBlocked ? 'btn-outline' : 'btn-danger'}`} onClick={() => toggleBlock(u)}>
                      {isBlocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={8} className="empty">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="user-profile-card">
                <div className="user-big-avatar">{(selected.first_name||'U')[0].toUpperCase()}</div>
                <div>
                  <h3>{selected.first_name} {selected.last_name}</h3>
                  <p className="user-email">{selected.email}</p>
                  <span className={`badge role-${selected.role}`}>{selected.role}</span>
                </div>
              </div>
              <div className="detail-grid">
                <div><span className="detail-key">User ID:</span> #{selected.id}</div>
                <div><span className="detail-key">Phone:</span> {selected.phone_number||'—'}</div>
                <div><span className="detail-key">Address:</span> {selected.address||'—'}</div>
                <div><span className="detail-key">Account:</span> {(blocked[selected.id] !== undefined ? blocked[selected.id] : !selected.is_active) ? <span className="badge st-cancelled">Blocked</span> : <span className="badge st-delivered">Active</span>}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 6. PAYMENTS TAB ────────────────────────────────────────────────────────
const PaymentsTab = ({ orders }) => {
  const totalRevenue = orders.reduce((s,o) => s+parseFloat(o.total_price||0), 0);
  const collected    = orders.filter(o=>o.status==='DELIVERED').reduce((s,o)=>s+parseFloat(o.total_price||0),0);
  const pendingAmt   = orders.filter(o=>o.status==='NOT_PAID').reduce((s,o)=>s+parseFloat(o.total_price||0),0);
  const commission   = totalRevenue * 0.10;

  const revenueByDay = useMemo(() => Array.from({length:14}, (_, i) => {
    const d = daysAgo(13-i);
    const v = orders
      .filter(o => o.created_at && new Date(o.created_at).toDateString()===d.toDateString())
      .reduce((s,o) => s+parseFloat(o.total_price||0), 0);
    return { l: d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}), v:Math.round(v), c:'#22c55e' };
  }), [orders]);

  return (
    <div className="tab-content">
      <div className="stats-grid">
        <div className="stat-card c-green"> <div className="stat-icon">💰</div><div className="stat-num">{fmt$(totalRevenue)}</div><div className="stat-label">Total Revenue</div></div>
        <div className="stat-card c-blue">  <div className="stat-icon">✅</div><div className="stat-num">{fmt$(collected)}</div>   <div className="stat-label">Collected</div></div>
        <div className="stat-card c-gold">  <div className="stat-icon">⏳</div><div className="stat-num">{fmt$(pendingAmt)}</div>   <div className="stat-label">Pending</div></div>
        <div className="stat-card c-purple"><div className="stat-icon">🏦</div><div className="stat-num">{fmt$(commission)}</div>   <div className="stat-label">Commission (10%)</div></div>
      </div>
      <div className="charts-row">
        <div className="chart-card wide">
          <h4 className="chart-title">📈 Revenue – Last 14 Days</h4>
          <BarChart data={revenueByDay} height={150} />
        </div>
      </div>
      <div className="section-card">
        <h3>Payment Records</h3>
        <table className="admin-table">
          <thead><tr><th>#</th><th>Client</th><th>Amount</th><th>Status</th><th>Date</th><th>Invoice</th></tr></thead>
          <tbody>
            {[...orders].sort((a,b)=>b.id-a.id).slice(0,25).map(o => (
              <tr key={o.id}>
                <td><b>#{o.id}</b></td>
                <td>{o.client_email||o.client||'—'}</td>
                <td><b>{fmt$(o.total_price)}</b></td>
                <td><span className={`badge ${scls(o.status)}`}>{slabel(o.status)}</span></td>
                <td>{fmtD(o.created_at)}</td>
                <td><button className="btn btn-sm btn-ghost">📄 Invoice</button></td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={6} className="empty">No payment records.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 7. REVIEWS TAB ─────────────────────────────────────────────────────────
const ReviewsTab = ({ reviews, onRefresh, onDelete }) => {
  const [ratingFilter, setRatingFilter] = useState(0);
  const [search,       setSearch]       = useState('');

  const filtered = useMemo(() => {
    let r = reviews;
    if (ratingFilter > 0) r = r.filter(x => x.rating === ratingFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => (x.comment||'').toLowerCase().includes(q) || (x.service_name||'').toLowerCase().includes(q) || (x.client_email||'').toLowerCase().includes(q));
    }
    return [...r].sort((a,b) => b.id-a.id);
  }, [reviews, ratingFilter, search]);

  const avg = reviews.length
    ? (reviews.reduce((s,x) => s+x.rating, 0)/reviews.length).toFixed(1)
    : '—';

  const ratingDist = [5,4,3,2,1].map(r => ({
    r,
    count: reviews.filter(x => x.rating===r).length,
    pct:   reviews.length ? Math.round(reviews.filter(x=>x.rating===r).length/reviews.length*100) : 0,
  }));

  return (
    <div className="tab-content">
      <div className="reviews-summary">
        <div className="avg-rating-card">
          <div className="avg-rating-num">{avg}</div>
          <div className="avg-rating-stars">{stars(parseFloat(avg)||0)}</div>
          <div className="avg-rating-label">{reviews.length} reviews total</div>
        </div>
        <div className="rating-bars">
          {ratingDist.map(({r,count,pct}) => (
            <div key={r} className="rating-row" onClick={() => setRatingFilter(r===ratingFilter?0:r)} style={{cursor:'pointer'}}>
              <span className="rating-key">{'★'.repeat(r)} {r}</span>
              <div className="rating-bar-bg">
                <div className="rating-bar-fill" style={{width:`${pct}%`, background: r>=4?'#22c55e':r===3?'#f59e0b':'#ef4444'}} />
              </div>
              <span className="rating-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="section-card">
        <div className="toolbar">
          <h3>All Reviews <span className="count-badge">{filtered.length}</span></h3>
          <input className="search-box" placeholder="🔍 Search reviews, services, users..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="filter-sel" value={ratingFilter} onChange={e=>setRatingFilter(Number(e.target.value))}>
            <option value={0}>All Ratings</option>
            {[5,4,3,2,1].map(r => <option key={r} value={r}>{'★'.repeat(r)} {r} Star</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>🔄</button>
        </div>
        <table className="admin-table">
          <thead><tr><th>#</th><th>Service</th><th>Client</th><th>Rating</th><th>Comment</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.service_name||r.service||'—'}</td>
                <td>{r.client_email||r.client||'—'}</td>
                <td>
                  <span style={{color: r.rating>=4?'#22c55e':r.rating===3?'#f59e0b':'#ef4444', letterSpacing:'1px'}}>
                    {stars(r.rating)}
                  </span> <small>{r.rating}/5</small>
                </td>
                <td className="comment-cell">{r.comment||'—'}</td>
                <td>{fmtD(r.created_at)}</td>
                <td><button className="btn btn-sm btn-danger" onClick={() => onDelete(r.id)}>🗑️ Delete</button></td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="empty">No reviews found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 8. SUPPORT TAB ─────────────────────────────────────────────────────────
const SupportTab = () => {
  const [tickets, setTickets] = useState([
    { id:1, type:'complaint', subject:'Service provider did not arrive on time', status:'open', priority:'high', from:'client1@example.com', created:'2026-02-20', messages:[{from:'client',text:'The provider never showed up. Very disappointed.',time:'2026-02-20 10:00'}] },
    { id:2, type:'billing',   subject:'Charged twice for the same order #15',   status:'open', priority:'high', from:'user2@example.com',  created:'2026-02-21', messages:[{from:'client',text:'I was charged twice. Please refund.',time:'2026-02-21 14:30'}] },
    { id:3, type:'complaint', subject:'Provider was rude and unprofessional',    status:'resolved', priority:'medium', from:'user3@example.com', created:'2026-02-10', messages:[{from:'client',text:'Very unprofessional behavior.',time:'2026-02-10 09:00'},{from:'admin',text:'We have addressed this with the provider.',time:'2026-02-11 10:00'}] },
    { id:4, type:'support',   subject:'Cannot cancel my booking',               status:'open', priority:'low', from:'user4@example.com', created:'2026-02-22', messages:[{from:'client',text:'I cannot find the cancel button.',time:'2026-02-22 08:00'}] },
  ]);
  const [selected,    setSelected]    = useState(null);
  const [reply,       setReply]       = useState('');
  const [filter,      setFilter]      = useState('all');
  const [typeFilter,  setTypeFilter]  = useState('all');

  const filtered = useMemo(() => {
    let r = tickets;
    if (filter     !== 'all') r = r.filter(t => t.status === filter);
    if (typeFilter !== 'all') r = r.filter(t => t.type   === typeFilter);
    return r;
  }, [tickets, filter, typeFilter]);

  const sendReply = () => {
    if (!reply.trim() || !selected) return;
    const newMsg = { from:'admin', text:reply, time:new Date().toLocaleString() };
    setTickets(p => p.map(t => t.id===selected.id ? {...t, messages:[...t.messages,newMsg], status:'resolved'} : t));
    setSelected(p => p ? {...p, messages:[...p.messages,newMsg], status:'resolved'} : null);
    setReply('');
  };

  const openCount = tickets.filter(t => t.status==='open').length;

  return (
    <div className="tab-content">
      <div className="stats-grid sm">
        <div className="stat-card c-red">   <div className="stat-num">{openCount}</div>                                              <div className="stat-label">Open Tickets</div></div>
        <div className="stat-card c-green"> <div className="stat-num">{tickets.filter(t=>t.status==='resolved').length}</div>        <div className="stat-label">Resolved</div></div>
        <div className="stat-card c-blue">  <div className="stat-num">{tickets.length}</div>                                         <div className="stat-label">Total</div></div>
        <div className="stat-card c-gold">  <div className="stat-num">{tickets.filter(t=>t.priority==='high').length}</div>          <div className="stat-label">High Priority</div></div>
      </div>
      <div className="support-layout">
        <div className="ticket-list">
          <div className="ticket-list-header">
            <h3>Tickets</h3>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
              <select className="filter-sel sm" value={filter} onChange={e=>setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
              <select className="filter-sel sm" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="complaint">Complaint</option>
                <option value="billing">Billing</option>
                <option value="support">Support</option>
              </select>
            </div>
          </div>
          {filtered.map(t => (
            <div key={t.id} className={`ticket-item ${selected?.id===t.id?'active':''} priority-${t.priority}`} onClick={() => setSelected(t)}>
              <div className="ticket-top">
                <span className="ticket-id">#{t.id}</span>
                <span className={`badge ${t.status==='open'?'st-notpaid':'st-delivered'}`}>{t.status}</span>
              </div>
              <p className="ticket-subject">{t.subject}</p>
              <div className="ticket-meta">
                <span>{t.from}</span>
                <span className={`ticket-type tt-${t.type}`}>{t.type}</span>
              </div>
            </div>
          ))}
          {!filtered.length && <p className="empty" style={{padding:'1rem'}}>No tickets.</p>}
        </div>
        <div className="ticket-chat">
          {selected ? (
            <>
              <div className="chat-header">
                <h4>{selected.subject}</h4>
                <p className="chat-from">
                  {selected.from} · <span className={`badge ${selected.status==='open'?'st-notpaid':'st-delivered'}`}>{selected.status}</span> ·{' '}
                  <span className={`ticket-type tt-${selected.type}`}>{selected.type}</span>
                </p>
              </div>
              <div className="chat-messages">
                {selected.messages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.from==='admin'?'admin-msg':'user-msg'}`}>
                    <span className="msg-from">{m.from==='admin'?'👮 Admin':'👤 User'}</span>
                    <p>{m.text}</p>
                    <span className="msg-time">{m.time}</span>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <textarea
                  placeholder="Type reply… (Enter to send, Shift+Enter for new line)"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  rows={2}
                  onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                />
                <button className="btn btn-primary" onClick={sendReply}>Send ↩</button>
              </div>
            </>
          ) : (
            <div className="empty-chat">
              <span style={{fontSize:'3rem'}}>🎧</span>
              <p>Select a ticket to view and reply</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── 9. REPORTS TAB ─────────────────────────────────────────────────────────
const ReportsTab = ({ orders, services, users, categories }) => {
  const [period, setPeriod] = useState(30);

  const inRange = orders.filter(o => o.created_at && new Date(o.created_at) >= daysAgo(period));
  const revenue = inRange.reduce((s,o) => s+parseFloat(o.total_price||0), 0);

  const statusSegs = ORDER_STATUSES
    .map(s => ({ l: slabel(s), v: inRange.filter(o=>o.status===s).length, c: STATUS_COLORS[s] }))
    .filter(x => x.v > 0);

  const dailyOrders = useMemo(() => {
    const len = Math.min(period, 14);
    return Array.from({length:len}, (_, i) => {
      const d = daysAgo(len-1-i);
      return {
        l: d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),
        v: inRange.filter(o => o.created_at && new Date(o.created_at).toDateString()===d.toDateString()).length,
        c: '#6366f1',
      };
    });
  }, [inRange, period]);

  const exportCSV = () => {
    const rows = [['Order ID','Client','Total','Status','Date']];
    inRange.forEach(o => rows.push([o.id, o.client_email||o.client||'', o.total_price, slabel(o.status), fmtD(o.created_at)]));
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `orders_report_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="tab-content">
      <div className="toolbar" style={{marginBottom:'1rem'}}>
        <div className="filter-row" style={{margin:0}}>
          {[7,30,90].map(n => (
            <button key={n} className={`pill ${period===n?'active':''}`} onClick={() => setPeriod(n)}>Last {n} days</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={exportCSV}>📥 Export CSV</button>
      </div>
      <div className="stats-grid sm">
        <div className="stat-card c-blue">  <div className="stat-num">{inRange.length}</div>                                       <div className="stat-label">Total Orders</div></div>
        <div className="stat-card c-green"> <div className="stat-num">{fmt$(revenue)}</div>                                         <div className="stat-label">Revenue</div></div>
        <div className="stat-card c-purple"><div className="stat-num">{inRange.filter(o=>o.status==='DELIVERED').length}</div>       <div className="stat-label">Completed</div></div>
        <div className="stat-card c-red">   <div className="stat-num">{inRange.filter(o=>o.status==='CANCELLED').length}</div>       <div className="stat-label">Cancelled</div></div>
        <div className="stat-card c-teal">  <div className="stat-num">{services.length}</div>                                       <div className="stat-label">Services</div></div>
        <div className="stat-card c-indigo"><div className="stat-num">{users.length}</div>                                           <div className="stat-label">Users</div></div>
      </div>
      <div className="charts-row">
        <div className="chart-card wide">
          <h4 className="chart-title">📊 Daily Orders ({Math.min(period,14)} days)</h4>
          <BarChart data={dailyOrders} height={150} />
        </div>
        <div className="chart-card">
          <h4 className="chart-title">🥧 Order Status</h4>
          <DonutChart segs={statusSegs} />
        </div>
      </div>
    </div>
  );
};

// ─── 10. SETTINGS TAB ───────────────────────────────────────────────────────
const SettingsTab = () => {
  const [s, setS] = useState({
    platform_name: 'HomeCrew',
    support_email: 'support@homecrew.com',
    currency: 'BDT',
    commission_pct: 10,
    vat_pct: 5,
    min_order: 100,
    cancellation_hours: 24,
    email_notifications: true,
    sms_notifications: false,
    maintenance_mode: false,
  });
  const [msg, setMsg] = useState({ text:'', ok:true });

  const save = e => {
    e.preventDefault();
    setMsg({ text:'✅ Settings saved successfully!', ok:true });
    setTimeout(() => setMsg({text:'',ok:true}), 3000);
  };

  return (
    <div className="tab-content">
      <div className="section-card">
        <h3>⚙️ Platform Configuration</h3>
        <Alert text={msg.text} ok={msg.ok} />
        <form className="admin-form" onSubmit={save}>
          <h4 className="settings-heading">🌐 General</h4>
          <div className="form-row">
            <div className="form-group"><label>Platform Name</label><input value={s.platform_name} onChange={e=>setS({...s,platform_name:e.target.value})} /></div>
            <div className="form-group"><label>Support Email</label><input type="email" value={s.support_email} onChange={e=>setS({...s,support_email:e.target.value})} /></div>
            <div className="form-group">
              <label>Currency</label>
              <select value={s.currency} onChange={e=>setS({...s,currency:e.target.value})}>
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <h4 className="settings-heading">💰 Payments & Commission</h4>
          <div className="form-row">
            <div className="form-group"><label>Platform Commission (%)</label><input type="number" min="0" max="50" value={s.commission_pct} onChange={e=>setS({...s,commission_pct:e.target.value})} /></div>
            <div className="form-group"><label>VAT / Tax (%)</label><input type="number" min="0" max="30" value={s.vat_pct} onChange={e=>setS({...s,vat_pct:e.target.value})} /></div>
            <div className="form-group"><label>Minimum Order (৳)</label><input type="number" min="0" value={s.min_order} onChange={e=>setS({...s,min_order:e.target.value})} /></div>
          </div>
          <h4 className="settings-heading">📅 Booking Policy</h4>
          <div className="form-row">
            <div className="form-group"><label>Free Cancellation Window (hours before service)</label><input type="number" min="0" value={s.cancellation_hours} onChange={e=>setS({...s,cancellation_hours:e.target.value})} /></div>
          </div>
          <h4 className="settings-heading">🔔 Notifications</h4>
          <div className="toggles-row">
            <label className="toggle-label"><input type="checkbox" checked={s.email_notifications} onChange={e=>setS({...s,email_notifications:e.target.checked})} /><span>📧 Email Notifications</span></label>
            <label className="toggle-label"><input type="checkbox" checked={s.sms_notifications}   onChange={e=>setS({...s,sms_notifications:e.target.checked})}   /><span>📱 SMS Notifications</span></label>
            <label className="toggle-label"><input type="checkbox" checked={s.maintenance_mode}    onChange={e=>setS({...s,maintenance_mode:e.target.checked})}    /><span>🔧 Maintenance Mode</span></label>
          </div>
          <div className="form-actions" style={{marginTop:'1.5rem'}}>
            <button type="submit" className="btn btn-primary">💾 Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── ADMIN NAVBAR ────────────────────────────────────────────────────────────
const AdminNavbar = ({ orders, services, users, setActiveTab, onLogout, user }) => {
  const [search,      setSearch]      = useState('');
  const [results,     setResults]     = useState([]);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const searchRef  = useRef(null);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);
  const navigate   = useNavigate();

  const notifs = useMemo(() => {
    const n = [];
    orders.filter(o=>o.status==='NOT_PAID').slice(0,4)
      .forEach(o => n.push({ icon:'📦', text:`New booking #${o.id} awaiting payment`, time:fmtD(o.created_at), tab:'orders' }));
    orders.filter(o=>o.status==='CANCELLED').slice(0,3)
      .forEach(o => n.push({ icon:'❌', text:`Order #${o.id} was cancelled`, time:fmtD(o.created_at), tab:'orders' }));
    return n.slice(0, 8);
  }, [orders]);

  const handleSearch = e => {
    const q = e.target.value.toLowerCase();
    setSearch(e.target.value);
    if (!q.trim()) { setResults([]); return; }
    const r = [];
    orders.filter(o=>String(o.id).includes(q)||(o.client_email||'').toLowerCase().includes(q)).slice(0,3)
      .forEach(o => r.push({ type:'order',   label:`Order #${o.id} — ${o.client_email||'no email'}`, tab:'orders' }));
    services.filter(s=>s.name.toLowerCase().includes(q)).slice(0,3)
      .forEach(s => r.push({ type:'service', label:`Service: ${s.name}`, tab:'services' }));
    users.filter(u=>(u.email||'').toLowerCase().includes(q)||(`${u.first_name||''} ${u.last_name||''}`).toLowerCase().includes(q)).slice(0,3)
      .forEach(u => r.push({ type:'user',    label:`User: ${u.first_name} ${u.last_name} (${u.email})`, tab:'users' }));
    setResults(r);
  };

  const pickResult = r => { setActiveTab(r.tab); setSearch(''); setResults([]); };

  useEffect(() => {
    const h = e => {
      if (searchRef.current  && !searchRef.current.contains(e.target))  setResults([]);
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <nav className="admin-navbar">
      <div className="nav-brand" onClick={() => setActiveTab('dashboard')}>
        <span className="brand-icon">🏠</span>
        <span className="brand-text">HomeCrew <sup>Admin</sup></span>
      </div>

      <div className="nav-search" ref={searchRef}>
        <span className="search-icon-nav">🔍</span>
        <input
          className="nav-search-input"
          placeholder="Search orders, services, users..."
          value={search}
          onChange={handleSearch}
        />
        {results.length > 0 && (
          <div className="search-results-dropdown">
            {results.map((r, i) => (
              <div key={i} className="search-result-item" onClick={() => pickResult(r)}>
                <span className={`result-chip result-${r.type}`}>{r.type}</span>
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="nav-actions">
        <button
          className="nav-pill nav-home-btn"
          title="View public home page"
          onClick={() => navigate('/preview-home')}
        >
          🏠 <span>Home</span>
        </button>

        <div className="nav-pill-wrap" ref={notifRef}>
          <button className="nav-pill" onClick={() => { setShowNotifs(p=>!p); setShowProfile(false); }}>
            🔔{notifs.length > 0 && <span className="notif-dot">{notifs.length}</span>}
          </button>
          {showNotifs && (
            <div className="nav-dropdown notif-dropdown">
              <div className="dropdown-header">🔔 Notifications <span className="badge c-blue">{notifs.length}</span></div>
              {notifs.length
                ? notifs.map((n,i) => (
                    <div key={i} className="notif-item" onClick={() => { setActiveTab(n.tab); setShowNotifs(false); }}>
                      <span className="notif-ico">{n.icon}</span>
                      <div>
                        <p className="notif-text">{n.text}</p>
                        <span className="notif-time">{n.time}</span>
                      </div>
                    </div>
                  ))
                : <p className="empty" style={{padding:'1rem',textAlign:'center'}}>All clear!</p>
              }
            </div>
          )}
        </div>

        <div className="nav-pill-wrap" ref={profileRef}>
          <button className="nav-pill avatar-pill" onClick={() => { setShowProfile(p=>!p); setShowNotifs(false); }}>
            <span className="nav-avatar-circle">{(user?.first_name||'A')[0].toUpperCase()}</span>
            <span className="nav-username">{user?.first_name}</span>
            <span>▾</span>
          </button>
          {showProfile && (
            <div className="nav-dropdown profile-dropdown">
              <div className="dropdown-header">{user?.email}</div>
              <div className="dropdown-item" onClick={() => { setShowProfile(false); navigate('/profile'); }}>👤 My Profile</div>
              <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('settings'); }}>⚙️ Settings</div>
              <div className="dropdown-divider" />
              <div className="dropdown-item danger" onClick={onLogout}>🚪 Logout</div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key:'dashboard',  icon:'📊', label:'Dashboard' },
  { key:'orders',     icon:'📦', label:'Orders' },
  { key:'services',   icon:'🛠️', label:'Services' },
  { key:'categories', icon:'🏷️', label:'Categories' },
  { key:'users',      icon:'👥', label:'Users' },
  { key:'payments',   icon:'💰', label:'Payments' },
  { key:'reviews',    icon:'⭐', label:'Reviews' },
  { key:'support',    icon:'🎧', label:'Support' },
  { key:'reports',    icon:'📈', label:'Reports' },
  { key:'settings',   icon:'⚙️', label:'Settings' },
];

const AdminSidebar = ({ active, setActive, orders, reviews }) => {
  const badges = {
    orders:  orders.filter(o=>o.status==='NOT_PAID').length || null,
    support: 2,
    reviews: reviews.filter(r=>r.rating<=2).length || null,
  };

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo-ico">🏠</span>
        <div>
          <div className="sidebar-brand-name">HomeCrew</div>
          <div className="sidebar-brand-tag">Admin Panel</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {SIDEBAR_ITEMS.map(({ key, icon, label }) => (
          <button
            key={key}
            className={`sidebar-item ${active===key ? 'active' : ''}`}
            onClick={() => setActive(key)}
          >
            <span className="item-icon">{icon}</span>
            <span className="item-label">{label}</span>
            {badges[key] && <span className="item-badge">{badges[key]}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard: 'Dashboard Overview',
  orders:    'Orders & Bookings',
  services:  'Service Management',
  categories:'Category Management',
  users:     'User Management',
  payments:  'Payments & Revenue',
  reviews:   'Reviews & Ratings',
  support:   'Complaints & Support',
  reports:   'Reports & Analytics',
  settings:  'Platform Settings',
};

const AdminDashboard = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab,      setActiveTab]      = useState('dashboard');
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [data,           setData]           = useState({ orders:[], services:[], users:[], categories:[], reviews:[] });
  const [loading,        setLoading]        = useState(true);
  const [fetchErrors,    setFetchErrors]    = useState([]);
  const [deleteReviewId, setDeleteReviewId] = useState(null);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchAll();
  }, [isAdmin]);

  const fetchAllPages = async url => {
    let results = []; let next = url;
    while (next) {
      const res = await api.get(next);
      const d   = res.data;
      if (Array.isArray(d)) { results = results.concat(d); break; }
      results = results.concat(d.results ?? []);
      next = d.next ?? null;
    }
    return results;
  };

  const fetchAll = useCallback(async () => {
    setLoading(true); setFetchErrors([]);
    const [ordersR, svcsR, usersR, catsR, revR] = await Promise.allSettled([
      fetchAllPages('/orders/'),
      fetchAllPages('/services/?page_size=100'),
      fetchAllPages('/accounts/'),
      fetchAllPages('/categories/'),
      fetchAllPages('/reviews/').catch(() => []),
    ]);
    const errors = [];
    const safe = (r, k) => {
      if (r.status === 'fulfilled') return r.value;
      errors.push(`${k}: ${r.reason?.response?.status||r.reason?.message||'failed'}`);
      return [];
    };
    setData({
      orders:     safe(ordersR, 'Orders'),
      services:   safe(svcsR,   'Services'),
      users:      safe(usersR,  'Users'),
      categories: safe(catsR,   'Categories'),
      reviews:    safe(revR,    'Reviews'),
    });
    setFetchErrors(errors);
    setLoading(false);
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/update_status/`, { status });
      setData(p => ({ ...p, orders: p.orders.map(o => o.id===id ? {...o,status} : o) }));
    } catch(e) {
      alert('Failed to update status: ' + (e.response?.data?.detail||e.message));
    }
  };

  const handleDeleteReview = async id => {
    try { await api.delete(`/reviews/${id}/`); } catch { /* best-effort */ }
    setData(p => ({ ...p, reviews: p.reviews.filter(r => r.id!==id) }));
    setDeleteReviewId(null);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!isAdmin) return null;

  return (
    <div className={`admin-root ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <AdminNavbar
        orders={data.orders}
        services={data.services}
        users={data.users}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        user={user}
      />

      {deleteReviewId && (
        <ConfirmModal
          msg="Delete this review permanently? This cannot be undone."
          onOk={() => handleDeleteReview(deleteReviewId)}
          onCancel={() => setDeleteReviewId(null)}
        />
      )}

      <div className="admin-body">
        <AdminSidebar
          active={activeTab}
          setActive={setActiveTab}
          orders={data.orders}
          reviews={data.reviews}
        />

        <main className="admin-main">
          <div className="main-header">
            <div className="main-header-left">
              <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(p=>!p)} title="Toggle sidebar">☰</button>
              <h1 className="main-title">{PAGE_TITLES[activeTab]}</h1>
            </div>
            <div className="main-header-right">
              {fetchErrors.length > 0 && (
                <span className="err-pill" title={fetchErrors.join(' | ')}>
                  ⚠️ {fetchErrors.length} fetch error{fetchErrors.length > 1 ? 's' : ''}
                </span>
              )}
              <button className="btn btn-ghost btn-sm" onClick={fetchAll} disabled={loading}>
                {loading ? '…' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="admin-loading">
              <Spinner />
              <p>Loading data, please wait…</p>
            </div>
          ) : (
            <div className="main-content">
              {activeTab === 'dashboard'  && <DashboardTab {...data} />}
              {activeTab === 'orders'     && <OrdersTab    orders={data.orders}   onStatusChange={handleStatusChange} onRefresh={fetchAll} />}
              {activeTab === 'services'   && <ServicesTab  services={data.services} categories={data.categories} onRefresh={fetchAll} />}
              {activeTab === 'categories' && <CategoriesTab categories={data.categories} services={data.services} onRefresh={fetchAll} />}
              {activeTab === 'users'      && <UsersTab      users={data.users}     onRefresh={fetchAll} />}
              {activeTab === 'payments'   && <PaymentsTab   orders={data.orders} />}
              {activeTab === 'reviews'    && <ReviewsTab    reviews={data.reviews} onRefresh={fetchAll} onDelete={id => setDeleteReviewId(id)} />}
              {activeTab === 'support'    && <SupportTab />}
              {activeTab === 'reports'    && <ReportsTab    {...data} />}
              {activeTab === 'settings'   && <SettingsTab />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
