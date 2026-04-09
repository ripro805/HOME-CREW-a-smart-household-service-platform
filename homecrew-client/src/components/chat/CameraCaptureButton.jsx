import { CameraIcon } from '@heroicons/react/24/outline';

export default function CameraCaptureButton({ onSelect, disabled = false }) {
  const handleCapture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onSelect?.(file);
    event.target.value = '';
  };

  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${disabled ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
      <CameraIcon className="h-4 w-4" />
      Camera
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
        disabled={disabled}
      />
    </label>
  );
}
