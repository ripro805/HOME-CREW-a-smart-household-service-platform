import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';

export default function VoiceButton({ isListening, isSupported, onToggle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!isSupported || disabled}
      title={!isSupported ? 'Voice input is not supported in this browser' : isListening ? 'Stop listening' : 'Start voice input'}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        isListening
          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
      }`}
    >
      {isListening ? <StopIcon className="h-4 w-4" /> : <MicrophoneIcon className="h-4 w-4" />}
      {isListening ? 'Listening...' : 'Voice'}
    </button>
  );
}
