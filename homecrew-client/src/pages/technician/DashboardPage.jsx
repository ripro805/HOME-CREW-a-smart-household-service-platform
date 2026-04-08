import {
  ClipboardDocumentListIcon,
  CheckBadgeIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

export default function DashboardPage({ summary, recentJobs }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Technician Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Track your workload, job progress, and earnings in one place.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={summary.totalJobs} tone="teal" icon={ClipboardDocumentListIcon} />
        <StatCard title="Completed Jobs" value={summary.completedJobs} tone="green" icon={CheckBadgeIcon} />
        <StatCard title="Pending Jobs" value={summary.pendingJobs} tone="amber" icon={ClockIcon} />
        <StatCard title="Total Earnings" value={money(summary.totalEarnings)} tone="indigo" icon={BanknotesIcon} />
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
