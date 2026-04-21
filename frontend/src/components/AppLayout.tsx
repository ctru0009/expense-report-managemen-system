import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-surface-container-high flex-col justify-between py-8">
        <div className="flex flex-col gap-8">
          <div className="px-6">
            <span className="text-xl font-black tracking-tighter text-on-surface">Precision Ledger</span>
            <p className="text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold opacity-60">Expense Management</p>
          </div>
          <div className="px-6">
            <Link
              to="/reports/new"
              className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 hover:opacity-90"
            >
              <span className="text-xl leading-none">+</span>
              <span>New Report</span>
            </Link>
          </div>
          <nav className="flex flex-col">
            <Link
              to="/reports"
              className={`flex items-center gap-3 px-6 py-4 font-medium transition-all ${
                isActive('/reports')
                  ? 'border-l-4 border-primary text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" />
              </svg>
              <span>Reports</span>
            </Link>
            {user?.role === 'ADMIN' && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-6 py-4 font-medium transition-all ${
                  isActive('/admin')
                    ? 'border-l-4 border-primary text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
                <span>All Reports</span>
              </Link>
            )}
          </nav>
        </div>
        <div className="px-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 py-4 text-on-surface-variant font-medium hover:bg-surface-container-low w-full transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
            <span>Logout</span>
          </button>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
              {user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.email}</p>
              <p className="text-[10px] text-on-surface-variant uppercase">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between w-full px-8 py-4 sticky top-0 z-40 bg-surface">
          <span className="text-lg font-black text-primary">The Precision Ledger</span>
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5z" />
              </svg>
              <input
                className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                placeholder="Search reports..."
                type="text"
                readOnly
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
