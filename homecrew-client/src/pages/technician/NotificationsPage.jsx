export default function NotificationsPage({ notifications, onMarkRead }) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAllRead = () => {
    notifications.filter((notification) => !notification.read).forEach((notification) => {
      onMarkRead(notification.id);
    });
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Notifications</h3>
          <p className="text-sm text-slate-500 mt-1">Stay updated with your latest technician activities.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 text-rose-700">
            {unreadCount} unread
          </span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`bg-white rounded-2xl border shadow-sm p-4 ${
              notification.read ? 'border-slate-100' : 'border-teal-200 bg-teal-50/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-semibold text-slate-800">{notification.title}</h4>
                <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                <p className="text-xs text-slate-400 mt-2">{notification.time}</p>
              </div>
              {!notification.read && (
                <button
                  onClick={() => onMarkRead(notification.id)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700"
                >
                  Mark Read
                </button>
              )}
            </div>
          </article>
        ))}

        {!notifications.length && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-500">
            No notifications right now.
          </div>
        )}
      </div>
    </section>
  );
}
