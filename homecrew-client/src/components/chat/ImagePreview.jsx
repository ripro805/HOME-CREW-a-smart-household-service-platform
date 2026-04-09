import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ImagePreview({ previewUrl, fileName, onRemove }) {
  if (!previewUrl) return null;

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 animate-[fadeIn_0.25s_ease]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-600 truncate">{fileName || 'Selected image'}</p>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500 transition"
          aria-label="Remove selected image"
          title="Remove"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <img src={previewUrl} alt="Selected preview" className="max-h-52 w-full rounded-xl object-contain bg-slate-50" />
    </div>
  );
}
