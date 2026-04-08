import { useMemo, useState } from 'react';

const tabs = [
  { key: 'pending', label: 'Pending' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
];

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

export default function MyJobsPage({ jobs, onStartJob, onCompleteJob }) {
  const [activeTab, setActiveTab] = useState('pending');

  const filtered = useMemo(() => jobs.filter((j) => j.status === activeTab), [jobs, activeTab]);
  const counts = useMemo(() => ({
    pending: jobs.filter((j) => j.status === 'pending').length,
    ongoing: jobs.filter((j) => j.status === 'ongoing').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
  }), [jobs]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">My Jobs</h3>
          <p className="text-sm text-slate-500 mt-1">Manage your assigned jobs and update progress quickly.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">Pending: {counts.pending}</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-100 text-cyan-700">Ongoing: {counts.ongoing}</span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700">Completed: {counts.completed}</span>
        </div>
      </div>

      <div className="inline-flex rounded-xl p-1 bg-slate-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === tab.key ? 'bg-white shadow text-teal-700' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((job) => (
          <article key={job.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-slate-500">{job.id}</p>
                <h4 className="text-base font-bold text-slate-800">{job.serviceType}</h4>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge(job.status)}`}>{capitalize(job.status)}</span>
            </div>
            <p className="text-sm text-slate-600 mb-1"><span className="font-semibold">Location:</span> {job.location}</p>
            <p className="text-sm text-slate-600 mb-1"><span className="font-semibold">Amount:</span> {money(job.amount)}</p>
            <p className="text-sm text-slate-600">{job.description}</p>

            <div className="mt-4 flex gap-2">
              {job.status === 'pending' && (
                <button
                  onClick={() => onStartJob(job.id)}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700"
                >
                  Start Job
                </button>
              )}
              {job.status === 'ongoing' && (
                <button
                  onClick={() => onCompleteJob(job.id)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                >
                  Complete Job
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {!filtered.length && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-500">
          No jobs in {activeTab} tab.
        </div>
      )}
    </section>
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
