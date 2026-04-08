const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

export default function EarningsPage({ completedJobs }) {
  const total = completedJobs.reduce((sum, job) => sum + Number(job.amount || 0), 0);
  const avgPerJob = completedJobs.length ? total / completedJobs.length : 0;

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold text-slate-800">Earnings</h3>
        <p className="text-sm text-slate-500 mt-1">Review completed jobs and your payout performance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl text-white p-6 shadow-sm">
          <p className="text-sm opacity-90">Total Earnings</p>
          <h3 className="text-3xl font-bold mt-1">{money(total)}</h3>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm text-slate-500">Completed Jobs</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{completedJobs.length}</h3>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm text-slate-500">Average Per Job</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{money(avgPerJob)}</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-x-auto">
        <h4 className="text-lg font-bold text-slate-800 mb-4">Completed Job Earnings</h4>
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Job ID</th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Service</th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Location</th>
              <th className="py-3 px-2 text-left text-xs font-semibold uppercase text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {completedJobs.map((job) => (
              <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-2 font-semibold text-slate-800">{job.id}</td>
                <td className="py-3 px-2 text-slate-700">{job.serviceType}</td>
                <td className="py-3 px-2 text-slate-600">{job.location}</td>
                <td className="py-3 px-2 font-semibold text-slate-800">{money(job.amount)}</td>
              </tr>
            ))}
            {!completedJobs.length && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">No completed jobs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
