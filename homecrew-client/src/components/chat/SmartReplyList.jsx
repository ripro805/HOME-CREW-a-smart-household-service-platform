export default function SmartReplyList({ replies = [], onSelect }) {
  if (!replies.length) return null;

  return (
    <div className="rounded-2xl border border-teal-100 bg-white/80 p-3 shadow-sm backdrop-blur transition-all duration-300 animate-[fadeIn_0.25s_ease]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-600">Smart Replies</p>
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => (
          <button
            key={reply}
            type="button"
            onClick={() => onSelect?.(reply)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
}
