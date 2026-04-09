import { StarIcon } from '@heroicons/react/24/solid';

export default function RecommendationCard({ recommendation, onBookNow }) {
  if (!recommendation) return null;

  return (
    <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-600">Recommended Service</p>
      <h4 className="mt-1 text-base font-bold text-slate-800">{recommendation.serviceType}</h4>

      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
        <p><span className="font-semibold text-slate-700">Technician:</span> {recommendation.technicianName}</p>
        <p className="inline-flex items-center gap-1">
          <StarIcon className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-slate-700">{Number(recommendation.rating || 0).toFixed(1)}</span>
        </p>
        <p><span className="font-semibold text-slate-700">Estimated Price:</span> {recommendation.priceEstimate}</p>
      </div>

      <button
        type="button"
        onClick={() => onBookNow?.(recommendation)}
        className="mt-4 inline-flex rounded-full bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
      >
        Book Now
      </button>
    </div>
  );
}
