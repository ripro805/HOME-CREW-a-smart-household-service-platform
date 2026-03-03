import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import './AdminDashboard.css';
import logo from '../assets/images/logo.png';
import {
  LineChart, Line, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  ChartBarIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  UsersIcon,
  CreditCardIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  DocumentChartBarIcon,
  CogIcon,
  HomeIcon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  CubeIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon as CheckCircleSolid,
  XCircleIcon as XCircleSolid,
  ChartPieIcon,
} from '@heroicons/react/24/solid';

// ─── CONSTANTS & HELPERS ────────────────────────────────────────────────────
const ORDER_STATUSES = ['NOT_PAID', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const STATUS_LABELS  = { NOT_PAID:'Pending Payment', READY_TO_SHIP:'Confirmed', SHIPPED:'Ongoing', DELIVERED:'Completed', CANCELLED:'Cancelled' };
const STATUS_COLORS  = { NOT_PAID:'#C4B5FD', READY_TO_SHIP:'#FB923C', SHIPPED:'#93C5FD', DELIVERED:'#FBBF24', CANCELLED:'#EF4444' };

const fmt$   = n  => `৳${parseFloat(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtD   = d  => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtDT  = d  => d ? new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
const slabel = s  => STATUS_LABELS[s] || (s||'').replace(/_/g,' ');
const stars  = r  => '★'.repeat(Math.round(r||0)) + '☆'.repeat(5-Math.round(r||0));
const daysAgo = n => new Date(Date.now() - n * 864e5);

const getStatusBadgeClass = status => {
  const classes = {
    NOT_PAID: 'bg-amber-100 text-amber-700 border-amber-200',
    READY_TO_SHIP: 'bg-blue-100 text-blue-700 border-blue-200',
    SHIPPED: 'bg-purple-100 text-purple-700 border-purple-200',
    DELIVERED: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  };
  return `inline-block px-3 py-1 rounded-full text-xs font-medium border ${classes[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`;
};

// ─── PRIMITIVES ─────────────────────────────────────────────────────────────
const Spinner = () => <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />;

const ConfirmModal = ({ msg, onOk, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
      <p className="text-gray-700 mb-6">{msg}</p>
      <div className="flex gap-3 justify-end">
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium" onClick={onOk}>Confirm</button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
);

const Alert = ({ text, ok }) => text
  ? <div className={`p-3 rounded-lg text-sm mb-4 ${ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{text}</div>
  : null;

// ─── CSS CHARTS ─────────────────────────────────────────────────────────────
const BarChart = ({ data = [], height = 130 }) => {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="flex items-end justify-around gap-2 px-4" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${d.l}: ${d.v}`}>
          <div className="w-full rounded-t transition-all" style={{ height:`${Math.round(d.v/max*100)}%`, background: d.c||'#6366f1' }} />
          <div className="text-xs text-gray-600 mt-2 text-center truncate w-full">{d.l}</div>
        </div>
      ))}
      {data.length === 0 && <p className="text-gray-400 text-center text-sm w-full">No data</p>}
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
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative w-32 h-32 rounded-full" style={{ background:`conic-gradient(${grad})` }}>
        <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-gray-800">{segs.reduce((s,x)=>s+x.v,0)}</div>
      </div>
      <div className="flex flex-col gap-2">
        {segs.map((x, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ background: x.c }} />
            <span className="text-gray-700">{x.l}: <b>{x.v}</b></span>
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
      date: d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}),
      orders: orders.filter(o => o.created_at && new Date(o.created_at).toDateString()===d.toDateString()).length,
    };
  }), [orders]);

  const categoryData = useMemo(() =>
    categories.slice(0,8).map((cat, i) => ({
      name: cat.name.length > 12 ? cat.name.slice(0,12)+'...' : cat.name,
      count: services.filter(s => (s.category?.id||s.category) === cat.id).length,
    })),
    [categories, services]);

  const statusSegs = ORDER_STATUSES
    .map(s => ({ l: slabel(s), v: inRange.filter(o=>o.status===s).length, c: STATUS_COLORS[s] }))
    .filter(x => x.v > 0);

  const recent = [...orders].sort((a,b) => b.id-a.id).slice(0,8);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-700 font-medium">Show data for:</span>
        {[1,7,30,90].map(n => (
          <button key={n} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${range===n?'bg-indigo-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setRange(n)}>
            {n===1 ? 'Today' : `Last ${n} days`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-orange-50/50 backdrop-blur-sm rounded-2xl p-6 border border-orange-100 shadow-sm">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4">
            <CubeIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{inRange.length}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </div>
        <div className="bg-purple-50/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-4">
            <ClockIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-red-50/50 backdrop-blur-sm rounded-2xl p-6 border border-red-100 shadow-sm">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <XCircleSolid className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{cancelled}</div>
          <div className="text-sm text-gray-600">Cancelled</div>
        </div>
        <div className="bg-pink-50/50 backdrop-blur-sm rounded-2xl p-6 border border-pink-100 shadow-sm">
          <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mb-4">
            <CurrencyDollarIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{fmt$(revenue)}</div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
        <div className="bg-blue-50/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <ArrowPathIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{ongoing}</div>
          <div className="text-sm text-gray-600">Ongoing</div>
        </div>
        <div className="bg-teal-50/50 backdrop-blur-sm rounded-2xl p-6 border border-teal-100 shadow-sm">
          <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircleSolid className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-indigo-50/50 backdrop-blur-sm rounded-2xl p-6 border border-indigo-100 shadow-sm">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mb-4">
            <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{services.length}</div>
          <div className="text-sm text-gray-600">Services</div>
        </div>
        <div className="bg-rose-50/50 backdrop-blur-sm rounded-2xl p-6 border border-rose-100 shadow-sm">
          <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center mb-4">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{users.length}</div>
          <div className="text-sm text-gray-600">Users</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-indigo-600" />
            <h4 className="text-lg font-semibold text-gray-800">Daily Orders (Last 7 Days)</h4>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last7}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '11px' }}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '11px' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [value, 'Orders']}
              />
              <Area 
                type="monotone" 
                dataKey="orders" 
                stroke="#6366f1" 
                strokeWidth={2}
                fill="url(#colorOrders)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <ChartPieIcon className="w-5 h-5 text-green-600" />
            <h4 className="text-lg font-semibold text-gray-800">Order Status Distribution</h4>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusSegs.map(seg => ({ name: seg.l, value: seg.v, color: seg.c }))}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
                label={({cx, cy}) => {
                  const total = statusSegs.reduce((sum, seg) => sum + seg.v, 0);
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={cx} dy="-0.5em" fontSize="28" fontWeight="bold" fill="#1f2937">
                        {total}
                      </tspan>
                      <tspan x={cx} dy="1.5em" fontSize="13" fill="#6b7280">
                        Total Bookings
                      </tspan>
                    </text>
                  );
                }}
              >
                {statusSegs.map((seg, index) => (
                  <Cell key={`cell-${index}`} fill={seg.c} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2.5">
            {statusSegs.map(seg => {
              const total = statusSegs.reduce((sum, s) => sum + s.v, 0);
              const percentage = ((seg.v / total) * 100).toFixed(0);
              return (
                <div key={seg.l} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded" style={{backgroundColor: seg.c}} />
                    <span className="text-sm text-gray-700">{seg.l}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">{seg.v.toLocaleString()}</span>
                    <span className="text-sm font-bold min-w-[40px] text-right" style={{color: seg.c}}>
                      {percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TagIcon className="w-5 h-5 text-purple-600" />
            <h4 className="text-lg font-semibold text-gray-800">Services by Category</h4>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsBarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280" 
                style={{ fontSize: '11px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#6b7280" 
                style={{ fontSize: '11px' }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => [value, 'Services']}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Recent Bookings</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200"><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Items</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th></tr></thead>
            <tbody>
              {recent.map(o => (
                <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-sm"><b>#{o.id}</b></td>
                  <td className="py-3 px-4 text-sm text-gray-700">{o.client_email || o.client || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{o.items?.length || 0}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-800">{fmt$(o.total_price)}</td>
                  <td className="py-3 px-4"><span className={getStatusBadgeClass(o.status)}>{slabel(o.status)}</span></td>
                  <td className="py-3 px-4 text-sm text-gray-600">{fmtD(o.created_at)}</td>
                </tr>
              ))}
              {!recent.length && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
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
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(SUB_LABELS).map(([key, label]) => (
          <button key={key} className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${sub===key?'bg-indigo-600 text-white shadow-md':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => setSub(key)}>
            {label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sub===key?'bg-white/20':'bg-gray-200 text-gray-600'}`}>{counts[key]||0}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3 items-center flex-wrap">
        <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="Search by order ID or client email..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-1" onClick={onRefresh}>
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <table className="w-full">
          <thead><tr className="border-b border-gray-200"><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Client</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Items</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-sm font-semibold"><b>#{o.id}</b></td>
                <td className="py-3 px-4 text-sm text-gray-700">{o.client_email || o.client || '—'}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{o.items?.length||0} item(s)</td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-800"><b>{fmt$(o.total_price)}</b></td>
                <td className="py-3 px-4">
                  <select
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white text-sm font-medium"
                    value={o.status}
                    onChange={e => handleStatusChange(o.id, e.target.value)}
                    style={{ borderColor: STATUS_COLORS[o.status], color: STATUS_COLORS[o.status] }}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s} disabled={s === 'CANCELLED' && ['SHIPPED','DELIVERED'].includes(o.status)}>{slabel(s)}</option>)}
                  </select>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">{fmtD(o.created_at)}</td>
                <td className="py-3 px-4">
                  <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-1" onClick={() => setDetail(o)}>
                    <MagnifyingGlassIcon className="w-4 h-4" /> View
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Order #{detail.id}</h3>
                <span className={getStatusBadgeClass(detail.status)}>{slabel(detail.status)}</span>
              </div>
              <button className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Client Info</h4>
                  <p className="text-sm text-gray-700 mb-2"><span className="font-medium text-gray-900">Email:</span> {detail.client_email||detail.client||'—'}</p>
                  <p className="text-sm text-gray-700 mb-2"><span className="font-medium text-gray-900">Order Date:</span> {fmtDT(detail.created_at)}</p>
                  <p className="text-sm text-gray-700"><span className="font-medium text-gray-900">Total:</span> <b>{fmt$(detail.total_price)}</b></p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Change Status</h4>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white font-medium"
                    value={detail.status}
                    onChange={e => { handleStatusChange(detail.id, e.target.value); setDetail(p => ({...p, status:e.target.value})); }}
                    style={{ borderColor: STATUS_COLORS[detail.status] }}
                  >
                    {ORDER_STATUSES.map(s => <option key={s} value={s} disabled={s === 'CANCELLED' && ['SHIPPED','DELIVERED'].includes(detail.status)}>{slabel(s)}</option>)}
                  </select>
                </div>
              </div>
              <h4 className="text-lg font-semibold text-gray-800">Order Items ({detail.items?.length||0})</h4>
              <table className="w-full">
                <thead><tr className="border-b border-gray-200"><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Service</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Qty</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Price</th></tr></thead>
                <tbody>
                  {(detail.items||[]).map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-700">{item.service?.name||item.service||`Item ${i+1}`}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{item.quantity||1}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-800">{fmt$(item.service?.price||item.price||0)}</td>
                    </tr>
                  ))}
                  {!detail.items?.length && <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">No items.</td></tr>}
                </tbody>
              </table>
              <h4 className="text-lg font-semibold text-gray-800">Admin Notes</h4>
              <Alert text={msg.text} ok={msg.ok} />
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(notes[detail.id]||[]).map((n,i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500">{fmtDT(n.time)}</span>
                    <span className="text-sm text-gray-700">{n.text}</span>
                  </div>
                ))}
                {!(notes[detail.id]||[]).length && <p className="text-center py-4 text-gray-400 text-sm">No admin notes yet.</p>}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="Write an internal note..."
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && saveNote(detail.id)}
                />
                <button className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium" onClick={() => saveNote(detail.id)}>Add Note</button>
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
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [createdService, setCreatedService] = useState(null);
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
      setShowModal(false);
      setShowSuccess(true);
      const fullService = await api.get(`/services/${editId || res.data.id}/`);
      setCreatedService(fullService.data);
      setTimeout(() => {
        setShowSuccess(false);
        setShowDetails(true);
      }, 1500);
      reset(); onRefresh();
    } catch(err) {
      setMsg({ text:'Error: '+JSON.stringify(err.response?.data||err.message), ok:false });
    } finally { setSaving(false); }
  };

  const handleEdit = s => {
    setEditId(s.id);
    setForm({ name:s.name, description:s.description, price:s.price, category:s.category?.id||s.category||'', duration:'60', is_popular:false, available:true });
    setCurrImg(s.images?.[0]?.image||'');
    setImgFile(null); setImgPrev('');
    setShowModal(true);
  };

  const handleDelete = async () => {
    try { await api.delete(`/services/${deleteId}/`); setDeleteId(null); onRefresh(); }
    catch { setDeleteId(null); }
  };

  const openAddModal = () => {
    reset();
    setMsg({ text:'', ok:true });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {deleteId && <ConfirmModal msg="Delete this service permanently?" onOk={handleDelete} onCancel={() => setDeleteId(null)} />}
      
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Success!</h3>
            <p className="text-gray-600">Service {editId ? 'updated' : 'created'} successfully</p>
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      {showDetails && createdService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Service Details</h3>
              <button onClick={() => { setShowDetails(false); setCreatedService(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              {createdService.images?.[0]?.image && (
                <div className="w-full h-64 rounded-xl overflow-hidden bg-gray-100">
                  <img src={createdService.images[0].image} alt={createdService.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">{createdService.name}</h4>
                <p className="text-gray-600 mb-4">{createdService.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Price</p>
                    <p className="text-2xl font-bold text-indigo-600">{fmt$(createdService.price)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Category</p>
                    <p className="text-lg font-semibold text-gray-800">{createdService.category?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => { setShowDetails(false); setCreatedService(null); }} className="mt-6 w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-xl my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                {editId ? <PencilIcon className="w-6 h-6 text-indigo-600" /> : <PlusIcon className="w-6 h-6 text-indigo-600" />}
                <h3 className="text-2xl font-bold text-gray-800">{editId ? 'Edit Service' : 'Add New Service'}</h3>
              </div>
              <button onClick={() => { setShowModal(false); reset(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <Alert text={msg.text} ok={msg.ok} />
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label><input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Base Price (৳) *</label><input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" type="number" step="0.01" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option value="">— No Category —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label><input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" type="number" min="15" step="15" value={form.duration} placeholder="e.g. 60" onChange={e=>setForm({...form,duration:e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description *</label><textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Image {editId ? '(leave empty to keep current)' : '*'}</label>
                <div className="flex items-start gap-4">
                  <label className="flex-shrink-0 w-40 h-40 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors flex flex-col items-center justify-center bg-gray-50 hover:bg-indigo-50 overflow-hidden">
                    {(imgPrev || currImg) ? (
                      <img src={imgPrev||currImg} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <PlusIcon className="w-12 h-12 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Upload Image</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleImg} className="hidden" />
                  </label>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">Upload a square image (recommended: 500x500px)</p>
                    <p className="text-xs text-gray-500">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
                    {(imgPrev || currImg) && (
                      <button type="button" onClick={() => { setImgFile(null); setImgPrev(''); setCurrImg(''); }} className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium">
                        Remove Image
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={form.is_popular} onChange={e=>setForm({...form,is_popular:e.target.checked})} />
                  <StarIcon className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700">Mark as Popular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})} />
                  <CheckCircleSolid className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Available</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={saving}>
                  {saving ? 'Saving…' : editId ? 'Update Service' : 'Create Service'}
                </button>
                <button type="button" className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold" onClick={() => { setShowModal(false); reset(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">All Services <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">{filtered.length}/{services.length}</span></h3>
          <button onClick={openAddModal} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2 shadow-sm">
            <PlusIcon className="w-5 h-5" /> Add Service
          </button>
        </div>
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <input className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="Search services..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-200"><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Image</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Price</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rating</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th></tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  {s.images?.[0]?.image
                    ? <img src={s.images[0].image} alt={s.name} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                    : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><WrenchScrewdriverIcon className="w-6 h-6 text-gray-400" /></div>}
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-800"><b>{s.name}</b></td>
                <td className="py-3 px-4 text-sm text-gray-700">{s.category?.name || '—'}</td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-800"><b>{fmt$(s.price)}</b></td>
                <td className="py-3 px-4 text-sm"><span className="text-amber-400">{stars(s.avg_rating)}</span> <small className="text-gray-600">{parseFloat(s.avg_rating||0).toFixed(1)}</small></td>
                <td className="py-3 px-4"><span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-700 border-green-200">Active</span></td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-1" onClick={() => handleEdit(s)}>
                      <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium" onClick={() => setDeleteId(s.id)}>
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No services found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── 4. CATEGORIES TAB ──────────────────────────────────────────────────────
const CategoriesTab = ({ categories, services, onRefresh }) => {
  const EMPTY = { name:'', description:'', icon:'', priority:0 };
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [createdCategory, setCreatedCategory] = useState(null);
  const [msg, setMsg]           = useState({ text:'', ok:true });
  const [saving, setSaving]     = useState(false);
  const svcCount = id => services.filter(s => (s.category?.id||s.category) === id).length;

  const reset = () => { setForm(EMPTY); setEditId(null); };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { name:form.name, description:form.description };
      let res;
      if (editId) res = await api.patch(`/categories/${editId}/`, payload);
      else        res = await api.post('/categories/', payload);
      setShowModal(false);
      setShowSuccess(true);
      const fullCategory = await api.get(`/categories/${editId || res.data.id}/`);
      setCreatedCategory(fullCategory.data);
      setTimeout(() => {
        setShowSuccess(false);
        setShowDetails(true);
      }, 1500);
      reset(); onRefresh();
    } catch(err) {
      setMsg({ text:'Error: '+JSON.stringify(err.response?.data||err.message), ok:false });
    } finally { setSaving(false); }
  };

  const handleEdit = c => {
    setEditId(c.id);
    setForm({name:c.name,description:c.description||'',icon:'',priority:0});
    setShowModal(true);
  };

  const handleDelete = async () => {
    try { await api.delete(`/categories/${deleteId}/`); setDeleteId(null); onRefresh(); }
    catch { setDeleteId(null); }
  };

  const openAddModal = () => {
    reset();
    setMsg({ text:'', ok:true });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {deleteId && <ConfirmModal msg="Delete this category?" onOk={handleDelete} onCancel={() => setDeleteId(null)} />}
      
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Success!</h3>
            <p className="text-gray-600">Category {editId ? 'updated' : 'created'} successfully</p>
          </div>
        </div>
      )}

      {/* Category Details Modal */}
      {showDetails && createdCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Category Details</h3>
              <button onClick={() => { setShowDetails(false); setCreatedCategory(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-xl p-6 text-center">
                <TagIcon className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                <h4 className="text-2xl font-bold text-gray-800 mb-2">{createdCategory.name}</h4>
                <p className="text-gray-600 mb-4">{createdCategory.description || 'No description'}</p>
                <span className="inline-block px-4 py-2 rounded-full text-sm font-medium border bg-blue-100 text-blue-700 border-blue-200">
                  {svcCount(createdCategory.id)} services
                </span>
              </div>
            </div>
            <button onClick={() => { setShowDetails(false); setCreatedCategory(null); }} className="mt-6 w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl my-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                {editId ? <PencilIcon className="w-6 h-6 text-indigo-600" /> : <PlusIcon className="w-6 h-6 text-indigo-600" />}
                <h3 className="text-2xl font-bold text-gray-800">{editId ? 'Edit Category' : 'Add New Category'}</h3>
              </div>
              <button onClick={() => { setShowModal(false); reset(); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <Alert text={msg.text} ok={msg.ok} />
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                  <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
                </div>
                <div style={{flex:'0 0 80px'}}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="🏠" style={{fontSize:'1.4rem',textAlign:'center'}} />
                </div>
                <div style={{flex:'0 0 160px'}}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Homepage Priority</label>
                  <input className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" type="number" min="0" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={saving}>
                  {saving ? 'Saving…' : editId ? 'Update Category' : 'Create Category'}
                </button>
                <button type="button" className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold" onClick={() => { setShowModal(false); reset(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">All Categories <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">{categories.length}</span></h3>
          <button onClick={openAddModal} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2 shadow-sm">
            <PlusIcon className="w-5 h-5" /> Add Category
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(c => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
              <TagIcon className="w-10 h-10 text-indigo-600 mb-3" />
              <div className="mb-3">
                <h4 className="text-lg font-semibold text-gray-800 mb-1">{c.name}</h4>
                <p className="text-sm text-gray-600">{c.description || <em>No description</em>}</p>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200 mt-2">{svcCount(c.id)} services</span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium" onClick={() => handleEdit(c)}>Edit</button>
                <button className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"  onClick={() => setDeleteId(c.id)}>Delete</button>
              </div>
            </div>
          ))}
          {!categories.length && <p className="text-center py-8 text-gray-400 text-sm col-span-full">No categories yet.</p>}
        </div>
      </div>
    </div>
  );
};

// ─── 5. USERS TAB ───────────────────────────────────────────────────────────
const UsersTab = ({ users, onRefresh }) => {
  const [search,        setSearch]        = useState('');
  const [roleFilter,    setRoleFilter]    = useState('all');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [selected,      setSelected]      = useState(null);
  const [blocked,       setBlocked]       = useState({});
  const [msg,           setMsg]           = useState({ text:'', ok:true });

  const isUserBlocked = u => blocked[u.id] !== undefined ? blocked[u.id] : !u.is_active;

  const filtered = useMemo(() => {
    let r = users;
    if (roleFilter !== 'all')   r = r.filter(u => u.role === roleFilter);
    if (statusFilter === 'blocked')  r = r.filter(u => isUserBlocked(u));
    if (statusFilter === 'active')   r = r.filter(u => !isUserBlocked(u));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(u => (u.email||'').toLowerCase().includes(q) || (`${u.first_name||''} ${u.last_name||''}`).toLowerCase().includes(q));
    }
    return r;
  }, [users, search, roleFilter, statusFilter, blocked]);

  const toggleBlock = u => {
    const isBlocked = isUserBlocked(u);
    setBlocked(p => ({...p, [u.id]: !isBlocked}));
    setMsg({ text: `User ${!isBlocked ? 'blocked' : 'unblocked'}.`, ok:true });
    setTimeout(() => setMsg({text:'',ok:true}), 2500);
  };

  const roleCount   = r => users.filter(u => u.role === r).length;
  const blockedCount = useMemo(() => users.filter(u => isUserBlocked(u)).length, [users, blocked]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{users.length}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="bg-green-50/50 backdrop-blur-sm rounded-2xl p-6 border border-green-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('all'); setRoleFilter('client'); }}>
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <UserCircleIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{roleCount('client')}</div>
          <div className="text-sm text-gray-600">Clients</div>
        </div>
        <div className="bg-purple-50/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('all'); setRoleFilter('admin'); }}>
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-4">
            <CogIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{roleCount('admin')}</div>
          <div className="text-sm text-gray-600">Admins / Staff</div>
        </div>
        <div className="bg-red-50/50 backdrop-blur-sm rounded-2xl p-6 border border-red-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setStatusFilter('blocked'); setRoleFilter('all'); }}>
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4">
            <XCircleSolid className="w-6 h-6 text-white" />
          </div>
          <div className="text-3xl font-bold text-gray-800 mb-1">{blockedCount}</div>
          <div className="text-sm text-gray-600">Blocked</div>
        </div>
      </div>
      <Alert text={msg.text} ok={msg.ok} />
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800">User Management</h3>
          <input className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="Search by name or email..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option>
            <option value="client">Clients</option>
            <option value="admin">Admins</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium" onClick={onRefresh}>
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-200"><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">#</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Avatar</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Phone</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th><th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th></tr></thead>
          <tbody>
            {filtered.map(u => {
              const isBlocked = isUserBlocked(u);
              return (
                <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isBlocked ? 'opacity-60' : ''}`}>
                  <td className="py-3 px-4 text-sm">{u.id}</td>
                  <td className="py-3 px-4"><div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">{(u.first_name||'U')[0].toUpperCase()}</div></td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-800"><b>{u.first_name} {u.last_name}</b></td>
                  <td className="py-3 px-4 text-sm text-gray-700">{u.email}</td>
                  <td className="py-3 px-4"><span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${u.role==='admin'?'bg-purple-100 text-purple-700 border-purple-200':'bg-blue-100 text-blue-700 border-blue-200'}`}>{u.role}</span></td>
                  <td className="py-3 px-4 text-sm text-gray-700">{u.phone_number || '—'}</td>
                  <td className="py-3 px-4"><span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${isBlocked ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{isBlocked ? 'Blocked' : 'Active'}</span></td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-1" onClick={() => setSelected(u)}>
                        <MagnifyingGlassIcon className="w-4 h-4" /> View
                      </button>
                      <button className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${isBlocked ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-600 text-white hover:bg-red-700'}`} onClick={() => toggleBlock(u)}>
                        {isBlocked ? 'Unblock' : 'Block'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-sm">No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-800">User Profile</h3>
              <button className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-2xl">{(selected.first_name||'U')[0].toUpperCase()}</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">{selected.first_name} {selected.last_name}</h3>
                  <p className="text-gray-600">{selected.email}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mt-2 ${selected.role==='admin'?'bg-purple-100 text-purple-700 border-purple-200':'bg-blue-100 text-blue-700 border-blue-200'}`}>{selected.role}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm text-gray-700"><span className="font-medium text-gray-900">User ID:</span> #{selected.id}</div>
                <div className="text-sm text-gray-700"><span className="font-medium text-gray-900">Phone:</span> {selected.phone_number||'—'}</div>
                <div className="text-sm text-gray-700"><span className="font-medium text-gray-900">Address:</span> {selected.address||'—'}</div>
                <div className="text-sm text-gray-700"><span className="font-medium text-gray-900">Account:</span> {(blocked[selected.id] !== undefined ? blocked[selected.id] : !selected.is_active) ? <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-red-100 text-red-700 border-red-200">Blocked</span> : <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-700 border-green-200">Active</span>}</div>
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
        <div className="stat-card c-green"> <CurrencyDollarIcon className="stat-icon w-8 h-8" /><div className="stat-num">{fmt$(totalRevenue)}</div><div className="stat-label">Total Revenue</div></div>
        <div className="stat-card c-blue">  <CheckCircleSolid className="stat-icon w-8 h-8" /><div className="stat-num">{fmt$(collected)}</div>   <div className="stat-label">Collected</div></div>
        <div className="stat-card c-gold">  <ClockIcon className="stat-icon w-8 h-8" /><div className="stat-num">{fmt$(pendingAmt)}</div>   <div className="stat-label">Pending</div></div>
        <div className="stat-card c-purple"><CreditCardIcon className="stat-icon w-8 h-8" /><div className="stat-num">{fmt$(commission)}</div>   <div className="stat-label">Commission (10%)</div></div>
      </div>
      <div className="charts-row">
        <div className="chart-card wide">
          <div className="flex items-center gap-2 mb-3">
            <ChartBarIcon className="w-5 h-5 text-gray-600" />
            <h4 className="chart-title">Revenue – Last 14 Days</h4>
          </div>
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
                <td><button className="btn btn-sm btn-ghost flex items-center gap-1">
                  <DocumentChartBarIcon className="w-4 h-4" /> Invoice
                </button></td>
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
          <input className="search-box" placeholder="Search reviews, services, users..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select className="filter-sel" value={ratingFilter} onChange={e=>setRatingFilter(Number(e.target.value))}>
            <option value={0}>All Ratings</option>
            {[5,4,3,2,1].map(r => <option key={r} value={r}>{'★'.repeat(r)} {r} Star</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
            <ArrowPathIcon className="w-4 h-4" />
          </button>
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
                <td><button className="btn btn-sm btn-danger flex items-center gap-1" onClick={() => onDelete(r.id)}>
                  <TrashIcon className="w-4 h-4" /> Delete
                </button></td>
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
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <span className="msg-from">{m.from==='admin'?<span className="flex items-center gap-1"><UserCircleIcon className="w-4 h-4" /> Admin</span>:<span className="flex items-center gap-1"><UserCircleIcon className="w-4 h-4" /> User</span>}</span>
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
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400" />
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
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await api.get('/analytics/');
        setAnalyticsData(response.data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
        <p className="ml-3">Loading analytics...</p>
      </div>
    );
  }

  if (!analyticsData) {
    return <div className="p-6 text-center text-gray-500">Failed to load analytics data</div>;
  }

  const { revenue_over_time, orders_over_time, status_distribution, top_services, summary } = analyticsData;

  // Format data for revenue chart
  const revenueChartData = revenue_over_time.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    revenue: parseFloat(item.revenue || 0)
  }));

  // Format data for orders chart
  const ordersChartData = orders_over_time.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    orders: item.count
  }));

  // Format data for status pie chart
  const statusLabels = {
    'NOT_PAID': 'Pending Payment',
    'READY_TO_SHIP': 'Confirmed',
    'SHIPPED': 'Ongoing',
    'DELIVERED': 'Completed',
    'CANCELLED': 'Cancelled'
  };

  const statusColors = {
    'NOT_PAID': '#f59e0b',
    'READY_TO_SHIP': '#3b82f6',
    'SHIPPED': '#8b5cf6',
    'DELIVERED': '#10b981',
    'CANCELLED': '#ef4444'
  };

  const statusChartData = status_distribution.map(item => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    color: statusColors[item.status] || '#6b7280'
  }));

  // Format data for top services chart
  const topServicesData = top_services.map(item => ({
    name: item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name,
    orders: item.order_count
  }));

  const exportCSV = () => {
    const rows = [['Order ID','Client','Total','Status','Date']];
    orders.forEach(o => rows.push([
      o.id, 
      o.client_email||o.client||'', 
      o.total_price, 
      statusLabels[o.status] || o.status, 
      fmtD(o.created_at)
    ]));
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); 
    a.download = `orders_report_${Date.now()}.csv`; 
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const revenueChangeColor = summary.revenue_change_percentage >= 0 ? 'text-green-600' : 'text-red-600';
  const revenueChangeIcon = summary.revenue_change_percentage >= 0 ? '↑' : '↓';

  return (
    <div className="tab-content">
      <div className="toolbar" style={{marginBottom:'1.5rem'}}>
        <h2 className="text-xl font-semibold text-gray-800">Reports & Analytics</h2>
        <button className="btn btn-primary btn-sm flex items-center gap-1" onClick={exportCSV}>
          <DocumentChartBarIcon className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid sm" style={{marginBottom: '2rem'}}>
        <div className="stat-card c-blue">
          <div className="stat-num">৳{Math.round(summary.total_revenue)}</div>
          <div className="stat-label">Total Revenue</div>
          <div className={`text-sm mt-1 ${revenueChangeColor}`}>
            {revenueChangeIcon} {Math.abs(summary.revenue_change_percentage)}% vs last week
          </div>
        </div>
        <div className="stat-card c-purple">
          <div className="stat-num">{summary.total_orders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-num">{summary.total_clients}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="stat-card c-teal">
          <div className="stat-num">{summary.total_services}</div>
          <div className="stat-label">Active Services</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100" style={{marginBottom: '1.5rem'}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-indigo-600" />
            <h4 className="text-lg font-semibold text-gray-800">Revenue</h4>
          </div>
          <div className="text-sm text-gray-500">Last 30 days</div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueChartData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280" 
              style={{ fontSize: '12px' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="#6b7280" 
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `৳${value}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              formatter={(value) => [`৳${Math.round(value)}`, 'Revenue']}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#6366f1" 
              strokeWidth={2}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders and Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{marginBottom: '1.5rem'}}>
        {/* Orders Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBagIcon className="w-5 h-5 text-purple-600" />
            <h4 className="text-lg font-semibold text-gray-800">Orders Over Time</h4>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsBarChart data={ordersChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                style={{ fontSize: '11px' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => [value, 'Orders']}
              />
              <Bar dataKey="orders" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-green-600" />
            <h4 className="text-lg font-semibold text-gray-800">Order Status Distribution</h4>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Services */}
      {topServicesData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <WrenchScrewdriverIcon className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-gray-800">Top Services</h4>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsBarChart data={topServicesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="#6b7280" 
                style={{ fontSize: '12px' }}
                width={150}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => [value, 'Orders']}
              />
              <Bar dataKey="orders" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      )}
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
    setMsg({ text:'Settings saved successfully!', ok:true });
    setTimeout(() => setMsg({text:'',ok:true}), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <CogIcon className="w-6 h-6 text-gray-700" />
          <h3>Platform Configuration</h3>
        </div>
        <Alert text={msg.text} ok={msg.ok} />
        <form className="admin-form" onSubmit={save}>
          <div className="flex items-center gap-2 mb-3">
            <CogIcon className="w-5 h-5 text-gray-600" />
            <h4 className="settings-heading">General</h4>
          </div>
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
          <div className="flex items-center gap-2 mb-3">
            <CurrencyDollarIcon className="w-5 h-5 text-gray-600" />
            <h4 className="settings-heading">Payments & Commission</h4>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Platform Commission (%)</label><input type="number" min="0" max="50" value={s.commission_pct} onChange={e=>setS({...s,commission_pct:e.target.value})} /></div>
            <div className="form-group"><label>VAT / Tax (%)</label><input type="number" min="0" max="30" value={s.vat_pct} onChange={e=>setS({...s,vat_pct:e.target.value})} /></div>
            <div className="form-group"><label>Minimum Order (৳)</label><input type="number" min="0" value={s.min_order} onChange={e=>setS({...s,min_order:e.target.value})} /></div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="w-5 h-5 text-gray-600" />
            <h4 className="settings-heading">Booking Policy</h4>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Free Cancellation Window (hours before service)</label><input type="number" min="0" value={s.cancellation_hours} onChange={e=>setS({...s,cancellation_hours:e.target.value})} /></div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <BellIcon className="w-5 h-5 text-gray-600" />
            <h4 className="settings-heading">Notifications</h4>
          </div>
          <div className="toggles-row">
            <label className="toggle-label">
              <input type="checkbox" checked={s.email_notifications} onChange={e=>setS({...s,email_notifications:e.target.checked})} />
              <span className="flex items-center gap-1">
                <EnvelopeIcon className="w-4 h-4" /> Email Notifications
              </span>
            </label>
            <label className="toggle-label">
              <input type="checkbox" checked={s.sms_notifications} onChange={e=>setS({...s,sms_notifications:e.target.checked})} />
              <span className="flex items-center gap-1">
                <PhoneIcon className="w-4 h-4" /> SMS Notifications
              </span>
            </label>
            <label className="toggle-label">
              <input type="checkbox" checked={s.maintenance_mode} onChange={e=>setS({...s,maintenance_mode:e.target.checked})} />
              <span className="flex items-center gap-1">
                <WrenchScrewdriverIcon className="w-4 h-4" /> Maintenance Mode
              </span>
            </label>
          </div>
          <div className="form-actions" style={{marginTop:'1.5rem'}}>
            <button type="submit" className="btn btn-primary flex items-center gap-1">
              <CheckCircleSolid className="w-4 h-4" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── ADMIN PROFILE TAB ──────────────────────────────────────────────────────
const AdminProfileTab = ({ user }) => {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name:'', last_name:'', phone_number:'', address:'' });
  const [pwForm, setPwForm] = useState({ old_password:'', new_password:'', confirm_password:'' });
  const [msg, setMsg] = useState({ text:'', ok:true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/users/me/').then(r => {
      setProfile(r.data);
      setForm({ first_name:r.data.first_name||'', last_name:r.data.last_name||'', phone_number:r.data.phone_number||'', address:r.data.address||'' });
    });
  }, []);

  const showMsg = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg({text:'',ok:true}),3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/users/me/', form);
      setProfile(p => ({...p, ...form}));
      setEditing(false);
      showMsg('Profile updated successfully.');
    } catch { showMsg('Failed to update profile.', false); }
    setSaving(false);
  };

  const handlePwChange = async () => {
    if (pwForm.new_password !== pwForm.confirm_password) return showMsg('Passwords do not match.', false);
    setSaving(true);
    try {
      await api.post('/auth/users/set_password/', { current_password: pwForm.old_password, new_password: pwForm.new_password });
      setPwForm({ old_password:'', new_password:'', confirm_password:'' });
      showMsg('Password changed successfully.');
    } catch(e) { showMsg(e.response?.data?.current_password?.[0] || 'Failed to change password.', false); }
    setSaving(false);
  };

  if (!profile) return <div className="flex items-center justify-center h-40 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">Profile Information</h3>
          {!editing
            ? <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors" onClick={() => setEditing(true)}><PencilIcon className="w-4 h-4" /> Edit</button>
            : <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors" onClick={handleSave} disabled={saving}><CheckIcon className="w-4 h-4" /> Save</button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors" onClick={() => { setEditing(false); setForm({ first_name:profile.first_name||'', last_name:profile.last_name||'', phone_number:profile.phone_number||'', address:profile.address||'' }); }}><XMarkIcon className="w-4 h-4" /> Cancel</button>
              </div>
          }
        </div>
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-2xl">
            {(profile.first_name||'A')[0].toUpperCase()}
          </div>
          <div>
            <h4 className="text-xl font-semibold text-gray-800">{profile.first_name} {profile.last_name}</h4>
            <p className="text-gray-600 text-sm">{profile.email}</p>
            <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">Admin</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label:'First Name', key:'first_name' },
            { label:'Last Name',  key:'last_name' },
            { label:'Phone',      key:'phone_number' },
            { label:'Address',    key:'address' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              {editing
                ? <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" value={form[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} />
                : <p className="text-sm text-gray-800 px-3 py-2 bg-gray-50 rounded-lg">{profile[key] || '—'}</p>
              }
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <p className="text-sm text-gray-800 px-3 py-2 bg-gray-50 rounded-lg">{profile.email}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
            <p className="text-sm text-gray-800 px-3 py-2 bg-gray-50 rounded-lg capitalize">{profile.role}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Change Password</h3>
        <div className="space-y-3">
          {[
            { label:'Current Password',     key:'old_password' },
            { label:'New Password',          key:'new_password' },
            { label:'Confirm New Password',  key:'confirm_password' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" value={pwForm[key]} onChange={e => setPwForm(p => ({...p, [key]: e.target.value}))} />
            </div>
          ))}
          <button className="mt-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60" onClick={handlePwChange} disabled={saving}>
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ADMIN NAVBAR ────────────────────────────────────────────────────────────
const AdminNavbar = ({ orders, services, users, setActiveTab, onLogout, user }) => {
  const [search,        setSearch]        = useState('');
  const [results,       setResults]       = useState([]);
  const [showResults,   setShowResults]   = useState(false);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [seenNotifIds,  setSeenNotifIds]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_notif_seen') || '[]'); } catch { return []; }
  });
  const searchRef  = useRef(null);
  const notifRef   = useRef(null);
  const profileRef = useRef(null);
  const navigate   = useNavigate();

  const notifs = useMemo(() => {
    const n = [];
    orders.filter(o=>o.status==='NOT_PAID').slice(0,4)
      .forEach(o => n.push({ id:`order-${o.id}`, icon:<CubeIcon className="w-5 h-5 text-blue-600" />, text:`New booking #${o.id} awaiting payment`, time:fmtD(o.created_at), tab:'orders' }));
    orders.filter(o=>o.status==='CANCELLED').slice(0,3)
      .forEach(o => n.push({ id:`cancel-${o.id}`, icon:<XCircleSolid className="w-5 h-5 text-red-600" />, text:`Order #${o.id} was cancelled`, time:fmtD(o.created_at), tab:'orders' }));
    return n.slice(0, 8);
  }, [orders]);

  const unreadNotifs = notifs.filter(n => !seenNotifIds.includes(n.id));

  const markNotifSeen = (id) => {
    setSeenNotifIds(prev => {
      const updated = [...new Set([...prev, id])];
      localStorage.setItem('admin_notif_seen', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllNotifsSeen = () => {
    const allIds = notifs.map(n => n.id);
    setSeenNotifIds(prev => {
      const updated = [...new Set([...prev, ...allIds])];
      localStorage.setItem('admin_notif_seen', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = e => {
    const val = e.target.value;
    const q = val.toLowerCase();
    setSearch(val);
    if (!q.trim()) { setResults([]); setShowResults(false); return; }
    const r = [];
    orders.filter(o=>String(o.id).includes(q)||(o.client_email||'').toLowerCase().includes(q)||(o.client_name||'').toLowerCase().includes(q)).slice(0,3)
      .forEach(o => r.push({ type:'order',   label:`Order #${o.id} — ${o.client_email||o.client_name||'client'}`, tab:'orders' }));
    services.filter(s=>(s.name||'').toLowerCase().includes(q)).slice(0,3)
      .forEach(s => r.push({ type:'service', label:`Service: ${s.name}`, tab:'services' }));
    users.filter(u=>(u.email||'').toLowerCase().includes(q)||(`${u.first_name||''} ${u.last_name||''}`).toLowerCase().includes(q)).slice(0,3)
      .forEach(u => r.push({ type:'user',    label:`User: ${u.first_name||''} ${u.last_name||''} (${u.email})`, tab:'users' }));
    setResults(r);
    setShowResults(r.length > 0);
  };

  const pickResult = r => { setActiveTab(r.tab); setSearch(''); setResults([]); setShowResults(false); };

  useEffect(() => {
    const h = e => {
      if (searchRef.current  && !searchRef.current.contains(e.target))  { setShowResults(false); }
      if (notifRef.current   && !notifRef.current.contains(e.target))   setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-40">
      <div className="nav-brand" onClick={() => navigate('/preview-home')}>
        <img src={logo} alt="HomeCrew" className="h-10 w-auto object-contain" />
        <span className="brand-text">HomeCrew <sup>Admin</sup></span>
      </div>

      <div className="nav-search" ref={searchRef}>
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="nav-search-input"
          placeholder="Search orders, services, users..."
          value={search}
          onChange={handleSearch}
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
        {showResults && results.length > 0 && (
          <div className="search-results-dropdown">
            {results.map((r, i) => (
              <div key={i} className="search-result-item" onMouseDown={() => pickResult(r)}>
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
          <HomeIcon className="w-5 h-5" /> <span>Home</span>
        </button>

        <div className="nav-pill-wrap" ref={notifRef}>
          <button className="nav-pill" onClick={() => { setShowNotifs(p=>!p); setShowProfile(false); }}>
            <BellIcon className="w-5 h-5" />
            {unreadNotifs.length > 0 && <span className="notif-dot">{unreadNotifs.length}</span>}
          </button>
          {showNotifs && (
            <div className="nav-dropdown notif-dropdown">
              <div className="dropdown-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span><BellIcon className="w-5 h-5 inline" /> Notifications {unreadNotifs.length > 0 && <span className="badge c-blue">{unreadNotifs.length}</span>}</span>
                {unreadNotifs.length > 0 && (
                  <button onClick={markAllNotifsSeen} style={{fontSize:'11px',color:'#6366f1',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Mark all read</button>
                )}
              </div>
              {notifs.length
                ? notifs.map((n,i) => {
                    const isUnread = !seenNotifIds.includes(n.id);
                    return (
                      <div key={i} className="notif-item" style={{background: isUnread ? 'rgba(99,102,241,0.06)' : undefined}} onClick={() => { markNotifSeen(n.id); setActiveTab(n.tab); setShowNotifs(false); }}>
                        <span className="notif-ico">{n.icon}</span>
                        <div style={{flex:1}}>
                          <p className="notif-text" style={{fontWeight: isUnread ? 600 : undefined}}>{n.text}</p>
                          <span className="notif-time">{n.time}</span>
                        </div>
                        {isUnread && <span style={{width:8,height:8,borderRadius:'50%',background:'#6366f1',flexShrink:0,marginTop:4}} />}
                      </div>
                    );
                  })
                : <p className="empty" style={{padding:'1rem',textAlign:'center'}}>All clear!</p>
              }
            </div>
          )}
        </div>

        <div className="nav-pill-wrap" ref={profileRef}>
          <button className="nav-pill avatar-pill" onClick={() => { setShowProfile(p=>!p); setShowNotifs(false); }}>
            <span className="nav-avatar-circle">{(user?.first_name||'A')[0].toUpperCase()}</span>
            <span className="nav-username">{user?.first_name}</span>
            <ChevronDownIcon className="w-4 h-4" />
          </button>
          {showProfile && (
            <div className="nav-dropdown profile-dropdown">
              <div className="dropdown-header">{user?.email}</div>
              <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('profile'); }}>
                <UserCircleIcon className="w-5 h-5 inline mr-2" /> My Profile
              </div>
              <div className="dropdown-item" onClick={() => { setShowProfile(false); setActiveTab('settings'); }}>
                <CogIcon className="w-5 h-5 inline mr-2" /> Settings
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-item danger" onClick={onLogout}>
                <ArrowRightOnRectangleIcon className="w-5 h-5 inline mr-2" /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { key:'dashboard',  icon: ChartBarIcon, label:'Dashboard' },
  { key:'orders',     icon: ShoppingBagIcon, label:'Orders' },
  { key:'services',   icon: WrenchScrewdriverIcon, label:'Services' },
  { key:'categories', icon: TagIcon, label:'Categories' },
  { key:'users',      icon: UsersIcon, label:'Users' },
  { key:'payments',   icon: CreditCardIcon, label:'Payments' },
  { key:'reviews',    icon: StarIcon, label:'Reviews' },
  { key:'support',    icon: ChatBubbleLeftRightIcon, label:'Support' },
  { key:'reports',    icon: DocumentChartBarIcon, label:'Reports' },
  { key:'settings',   icon: CogIcon, label:'Settings' },
];

const AdminSidebar = ({ active, setActive, orders, reviews, seenIds, markSeen }) => {
  const badges = {
    orders:  orders.filter(o => o.status==='NOT_PAID' && !(seenIds.orders||[]).includes(o.id)).length || null,
    support: (seenIds.support ? 0 : 2) || null,
    reviews: reviews.filter(r => r.rating<=2 && !(seenIds.reviews||[]).includes(r.id)).length || null,
  };

  const handleClick = (key) => {
    markSeen(key);
    setActive(key);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto h-full">
      <nav className="sidebar-nav" style={{paddingTop:'12px'}}>
        {SIDEBAR_ITEMS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            className={`sidebar-item ${active===key ? 'active' : ''}`}
            onClick={() => handleClick(key)}
          >
            <Icon className="w-5 h-5" />
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
  profile:   'My Profile',
};

const AdminDashboard = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab,      setActiveTab]      = useState(location.state?.tab || 'dashboard');
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [data,           setData]           = useState({ orders:[], services:[], users:[], categories:[], reviews:[] });
  const [loading,        setLoading]        = useState(true);
  const [fetchErrors,    setFetchErrors]    = useState([]);
  const [deleteReviewId, setDeleteReviewId] = useState(null);
  const [seenIds,        setSeenIds]        = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_seen') || '{"orders":[],"reviews":[],"support":false}'); }
    catch { return { orders:[], reviews:[], support:false }; }
  });

  const markSeen = (key) => {
    setSeenIds(prev => {
      const updated = { ...prev };
      if (key === 'orders')  updated.orders  = data.orders.filter(o=>o.status==='NOT_PAID').map(o=>o.id);
      if (key === 'reviews') updated.reviews = data.reviews.filter(r=>r.rating<=2).map(r=>r.id);
      if (key === 'support') updated.support = true;
      localStorage.setItem('admin_seen', JSON.stringify(updated));
      return updated;
    });
  };

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

      <div className="pt-16 flex h-screen">
        <AdminSidebar
          active={activeTab}
          setActive={setActiveTab}
          orders={data.orders}
          reviews={data.reviews}
          seenIds={seenIds}
          markSeen={markSeen}
        />

        <main className="flex-1 overflow-auto">
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
                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : (
                  <div className="flex items-center gap-1">
                    <ArrowPathIcon className="w-4 h-4" /> Refresh
                  </div>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
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
              {activeTab === 'profile'    && <AdminProfileTab user={user} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
