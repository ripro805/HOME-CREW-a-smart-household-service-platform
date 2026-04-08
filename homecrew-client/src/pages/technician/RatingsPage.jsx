const stars = (rating) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));

export default function RatingsPage({ reviews }) {
  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDist = [5, 4, 3, 2, 1].map((value) => {
    const count = reviews.filter((review) => Math.round(Number(review.rating || 0)) === value).length;
    const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
    return { value, count, pct };
  });

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold text-slate-800">Ratings & Reviews</h3>
        <p className="text-sm text-slate-500 mt-1">Monitor customer feedback and service quality.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-sm text-slate-500">Average Rating</p>
          <h3 className="text-3xl font-bold text-slate-800 mt-1">⭐ {avg} / 5</h3>
          <p className="text-sm text-amber-500 mt-2">{stars(Number(avg || 0))}</p>
          <p className="text-xs text-slate-400 mt-2">Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2">
          <h4 className="text-base font-semibold text-slate-800 mb-4">Rating Distribution</h4>
          <div className="space-y-2.5">
            {ratingDist.map((row) => (
              <div key={row.value} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 w-10">{row.value}★</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-10 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((review) => (
          <article key={review.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-800">{review.client}</h4>
              <span className="text-amber-500 font-bold">{review.rating} ★</span>
            </div>
            <p className="text-sm text-slate-600">{review.comment}</p>
            <p className="text-xs text-slate-400 mt-3">{review.date}</p>
          </article>
        ))}
        {!reviews.length && (
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-500">
            No reviews received yet.
          </div>
        )}
      </div>
    </section>
  );
}
