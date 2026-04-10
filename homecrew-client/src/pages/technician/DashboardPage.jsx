import { useMemo, useState } from 'react';
import {
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  ClockIcon,
  BanknotesIcon,
  StarIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

export default function DashboardPage({ summary, recentJobs }) {
  const [trendRange, setTrendRange] = useState('day');

  const trendData = useMemo(() => {
    const source = summary?.incomeTrends?.[trendRange] || [];
    return source.map((row) => ({
      ...row,
      income: Number(row.amount || 0),
    }));
  }, [summary, trendRange]);

  const avgRating = Number(summary?.averageRating || 0).toFixed(1);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Technician Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Track your workload, job progress, and earnings in one place.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard title="Total Jobs" value={summary.totalJobs} tone="teal" icon={ClipboardDocumentListIcon} />
        <StatCard title="Completed Jobs" value={summary.completedJobs} tone="green" icon={CheckBadgeIcon} />
        <StatCard title="Pending Jobs" value={summary.pendingJobs} tone="amber" icon={ClockIcon} />
        <StatCard title="Total Earnings" value={money(summary.totalEarnings)} tone="indigo" icon={BanknotesIcon} />
        <StatCard title="Average Rating" value={`${avgRating} ★`} tone="rose" icon={StarIcon} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Income Trend</h3>
            <p className="text-xs text-slate-500">Track earnings by দিন / সপ্তাহ / মাস</p>
          </div>
          <div className="flex items-center gap-2">
            {[{ key: 'day', label: 'দিন' }, { key: 'week', label: 'সপ্তাহ' }, { key: 'month', label: 'মাস' }].map((item) => (
              <button
                key={item.key}
                className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${trendRange === item.key ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                onClick={() => setTrendRange(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="techIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(value) => `৳${value}`} />
            <Tooltip
              formatter={(value) => [money(value), 'Income']}
              contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}
            />
            <Area type="monotone" dataKey="income" stroke="#0f766e" fill="url(#techIncome)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white grid place-items-center text-teal-700 border border-teal-100">
            <LightBulbIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">AI Suggestion</p>
            <p className="text-sm text-slate-700 mt-1">{summary.aiSuggestion || 'Keep accepting high-value jobs to increase your income trend.'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 overflow-x-auto">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Jobs</h3>
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Job ID</th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Service</th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Location</th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recentJobs.map((job) => (
              <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-2 font-semibold text-slate-800">{job.id}</td>
                <td className="py-3 px-2 text-slate-700">{job.serviceType}</td>
                <td className="py-3 px-2 text-slate-600">{job.location}</td>
                <td className="py-3 px-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge(job.status)}`}>{capitalize(job.status)}</span>
                </td>
                <td className="py-3 px-2 text-slate-800 font-semibold">{money(job.amount)}</td>
              </tr>
            ))}
            {!recentJobs.length && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                  No recent jobs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatCard({ title, value, tone, icon: Icon }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone] || tones.teal}`}>
      <div className="w-10 h-10 rounded-xl bg-white/70 grid place-items-center mb-3">
        {Icon ? <Icon className="w-5 h-5" /> : null}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function capitalize(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function badge(status = '') {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'ongoing') return 'bg-cyan-100 text-cyan-700';
  return 'bg-amber-100 text-amber-700';
}
