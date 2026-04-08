import { BellIcon, Bars3Icon } from '@heroicons/react/24/outline';

export default function TechnicianTopbar({ name, online, setOnline, unreadCount, onOpenSidebar, onGotoNotifications }) {
  const initials = name
    ?.split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Open sidebar"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <div>
          <p className="text-xs text-slate-500">Welcome back</p>
          <h2 className="text-base md:text-lg font-bold text-slate-800">{name}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button onClick={onGotoNotifications} className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors" title="Notifications">
          <BellIcon className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs md:text-sm font-semibold text-slate-600">{online ? 'Online' : 'Offline'}</span>
          <button
            onClick={() => setOnline((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${online ? 'bg-teal-600' : 'bg-slate-300'}`}
            aria-label="Toggle online status"
            type="button"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${online ? 'translate-x-6' : 'translate-x-0.5'}`}
            />
          </button>
        </label>

        <div className="w-10 h-10 rounded-full bg-teal-600 text-white grid place-items-center font-bold">
          {initials || 'T'}
        </div>
      </div>
    </header>
  );
}
