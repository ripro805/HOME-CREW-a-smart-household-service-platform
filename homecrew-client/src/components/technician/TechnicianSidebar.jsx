import { NavLink } from 'react-router-dom';
import {
  Squares2X2Icon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  StarIcon,
  BellIcon,
  UserCircleIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  Bars3CenterLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import logo from '../../assets/images/logo.png';

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', to: '/technician-dashboard', icon: Squares2X2Icon, end: true },
  { key: 'available-jobs', label: 'Available Jobs', to: '/technician-dashboard/available-jobs', icon: BriefcaseIcon },
  { key: 'my-jobs', label: 'My Jobs', to: '/technician-dashboard/my-jobs', icon: ClipboardDocumentListIcon },
  { key: 'earnings', label: 'Earnings', to: '/technician-dashboard/earnings', icon: BanknotesIcon },
  { key: 'ratings', label: 'Ratings & Reviews', to: '/technician-dashboard/ratings', icon: StarIcon },
  { key: 'notifications', label: 'Notifications', to: '/technician-dashboard/notifications', icon: BellIcon },
  { key: 'profile', label: 'Profile Settings', to: '/technician-dashboard/profile-settings', icon: UserCircleIcon },
];

const linkClass = ({ isActive }, collapsed) =>
  `group flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border ${
    isActive
      ? 'bg-teal-600 text-white border-teal-600 shadow'
      : 'text-slate-600 border-transparent hover:bg-teal-50 hover:text-teal-700'
  }`;

export default function TechnicianSidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen, onLogout }) {
  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close technician sidebar overlay"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-40 bg-white border-r border-slate-200 shadow-sm transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-72'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-20 px-4 border-b border-slate-100 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src={logo} alt="HomeCrew" className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <h1 className="text-base font-bold text-slate-800 leading-tight">Technician Panel</h1>
                <p className="text-xs text-slate-500">HomeCrew Workspace</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden lg:inline-flex p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Toggle sidebar"
          >
            <Bars3CenterLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden inline-flex p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Close mobile sidebar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={(state) => linkClass(state, collapsed)}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
              </NavLink>
            );
          })}

          {!collapsed && (
            <div className="my-4 border-t border-slate-200" />
          )}

          <NavLink
            to="/"
            className={(state) => linkClass(state, collapsed)}
            onClick={() => setMobileOpen(false)}
          >
            <HomeIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">View Site</span>}
          </NavLink>

          <button
            onClick={onLogout}
            className={`w-full mt-4 group flex items-center ${collapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 border text-red-600 border-transparent hover:bg-red-50 hover:border-red-100`}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </nav>
      </aside>
    </>
  );
}
