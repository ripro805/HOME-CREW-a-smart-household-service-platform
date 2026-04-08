import { BriefcaseIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

export default function AvailableJobsPage({ jobs, onAccept }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Available Jobs</h3>
          <p className="text-sm text-slate-500 mt-1">Pick new assignments that match your skills and schedule.</p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 border border-teal-100">
          <BriefcaseIcon className="w-4 h-4" /> {jobs.length} jobs available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <article key={job.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-slate-500">{job.id}</p>
                <h4 className="text-base font-bold text-slate-800">{job.serviceType}</h4>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
                <CurrencyDollarIcon className="w-4 h-4" /> {money(job.budget)}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-2 flex items-center gap-1">
              <MapPinIcon className="w-4 h-4 text-slate-400" />
              <span><span className="font-semibold">Location:</span> {job.location}</span>
            </p>
            <p className="text-sm text-slate-600 flex-1">{job.description}</p>
            <button
              onClick={() => onAccept(job.id)}
              className="mt-4 w-full py-2.5 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
            >
              Accept Job
            </button>
          </article>
        ))}
        {!jobs.length && (
          <div className="md:col-span-2 xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-500">
            No available jobs right now.
          </div>
        )}
      </div>
    </section>
  );
}
