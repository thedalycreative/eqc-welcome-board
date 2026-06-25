import { useState, useEffect, FormEvent } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Calendar,
  AlertCircle,
  Image as ImageIcon,
  Users,
  ClipboardList,
  Rss,
  Settings as SettingsIcon,
  LogOut,
  LogIn,
  ShieldQuestionIcon,
  X,
  Home,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';

import { ADMIN_PASSWORD } from '../lib/firebase';
import { useGlobalSettings, useResetCountdown } from '../lib/hooks';

const TRAINER_SIGN_ON_URL = `${import.meta.env.BASE_URL}trainer-sign-on.html`;
const MOBILE_URL = `${import.meta.env.BASE_URL}mobile`;
const STORAGE_KEY = 'eqc-admin-auth';
const ACTOR_KEY = 'eqc-admin-actor';

const NAV_TABS = [
  { path: '/admin/rooms', label: 'Rooms', icon: Layout },
  { path: '/admin/events', label: 'Events', icon: Calendar },
  { path: '/admin/alerts', label: 'Alerts', icon: AlertCircle },
  { path: '/admin/carousel', label: 'Carousel', icon: ImageIcon },
  { path: '/admin/trainers', label: 'Trainers', icon: Users },
  { path: '/admin/signon-log', label: 'Sign-On Log', icon: ClipboardList },
  { path: '/admin/rss', label: 'RSS Feeds', icon: Rss },
  { path: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

function LoginGate({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!ADMIN_PASSWORD) {
      setError('Admin access is not configured. Set VITE_ADMIN_PASSWORD.');
      return;
    }
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'ok');
      sessionStorage.setItem(ACTOR_KEY, JSON.stringify({ kind: 'admin' }));
      setError('');
      onSuccess();
      return;
    }
    setError('Invalid password. Please try again.');
  };

  return (
    <div className="fixed inset-0 bg-eqc-bg z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white p-6 sm:p-8 rounded-3xl max-w-md w-full shadow-2xl my-auto">
        <div className="flex justify-between items-center mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldQuestionIcon size={28} className="text-eqc-green shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold serif text-gray-800 truncate">Admin Login</h2>
          </div>
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-100 animate-shake">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-4 py-3 min-h-[48px] text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-eqc-green outline-none transition-shadow"
              placeholder="Enter your password"
            />
            <p className="text-xs text-gray-400 mt-2">
              Enter the admin password to continue.
            </p>
          </div>
          <button type="submit" className="w-full bg-eqc-green text-white py-3 min-h-[48px] rounded-xl font-bold hover:bg-eqc-green/90 transition-colors flex items-center justify-center gap-2">
            <LogIn size={20} /> Login
          </button>
        </form>
      </div>
    </div>
  );
}

// Hand-coded inline SVG icons for new mobile controls.
const HamburgerIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'ok');
  const [settings] = useGlobalSettings();
  const countdown = useResetCountdown(settings.resetTimeHour);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // If user lands on /admin without a tab, redirect to /admin/rooms
  useEffect(() => {
    if (authed && location.pathname === '/admin') {
      navigate('/admin/rooms', { replace: true });
    }
  }, [authed, location.pathname, navigate]);

  // Close mobile drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  if (!authed) {
    return <LoginGate onSuccess={() => setAuthed(true)} />;
  }

  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ACTOR_KEY);
    navigate('/');
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 font-sans overflow-hidden">
      {/* Persistent header with countdown */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0 shadow-sm gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Open navigation menu"
          >
            <HamburgerIcon />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <img src="/images/eqc-sheild.png" alt="EQC Institute" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
            <h1 className="text-base sm:text-lg lg:text-xl font-bold serif text-gray-800 truncate">Perth Dashboard Admin Panel</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resets in (WA)</span>
            <span className="font-timer text-xl xl:text-2xl font-bold tabular-nums text-eqc-green leading-none">{countdown}</span>
          </div>

          {/* View Campus Dashboard (primary green) */}
          <button
            onClick={() => navigate('/')}
            className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold text-white bg-eqc-green hover:bg-eqc-green/90 rounded-lg transition-colors"
            data-allow-dirty="true"
          >
            <Home size={16} /> <span className="hidden lg:inline">View Campus Dashboard</span><span className="lg:hidden">Dashboard</span>
          </button>

          {/* Mobile-friendly Dashboard (secondary) */}
          <a
            href={MOBILE_URL}
            className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            data-allow-dirty="true"
          >
            <Smartphone size={16} /> <span className="hidden xl:inline">Mobile-friendly Dashboard</span><span className="xl:hidden">Mobile</span>
          </a>

          {/* Trainer Sign-on (secondary) */}
          <a
            href={TRAINER_SIGN_ON_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-2 px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            data-allow-dirty="true"
          >
            <ExternalLink size={16} /> <span className="hidden xl:inline">Trainer Sign-on</span><span className="xl:hidden">Sign-on</span>
          </a>

          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors min-h-[44px]"
            data-allow-dirty="true"
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 relative">
        {/* Mobile drawer backdrop */}
        {drawerOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 top-[57px] bg-black/40 z-40 backdrop-blur-[1px]"
          />
        )}

        {/* Sidebar nav (desktop static; mobile slide-in drawer) */}
        <nav
          className={`
            bg-white border-r border-gray-200 p-3 flex flex-col gap-1 overflow-y-auto z-50
            md:relative md:translate-x-0 md:w-56 md:shrink-0
            fixed top-[57px] bottom-0 left-0 w-64 max-w-[80vw] shadow-2xl md:shadow-none transition-transform duration-200 ease-out
            ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          aria-hidden={!drawerOpen && typeof window !== 'undefined' && window.innerWidth < 768}
        >
          {/* Drawer close (mobile only) */}
          <div className="md:hidden flex items-center justify-between pb-2 mb-1 border-b border-gray-100">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Menu</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Mobile-only countdown chip */}
          <div className="md:hidden mb-2 px-3 py-2 bg-gray-50 rounded-lg flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resets in (WA)</span>
            <span className="font-timer text-base font-bold tabular-nums text-eqc-green leading-none">{countdown}</span>
          </div>

          {NAV_TABS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-bold transition-colors min-h-[44px] ${
                  isActive ? 'bg-eqc-green text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-1">
            <button
              onClick={() => navigate('/')}
              className="md:hidden flex items-center gap-2 px-3 py-3 rounded-lg text-xs font-bold text-white bg-eqc-green hover:bg-eqc-green/90 transition-colors min-h-[44px]"
              data-allow-dirty="true"
            >
              <Home size={14} /> View Campus Dashboard
            </button>
            <a
              href={MOBILE_URL}
              className="md:hidden flex items-center gap-2 px-3 py-3 rounded-lg text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors min-h-[44px]"
              data-allow-dirty="true"
            >
              <Smartphone size={14} /> Mobile-friendly Dashboard
            </a>
            <a
              href={TRAINER_SIGN_ON_URL}
              target="_blank"
              rel="noreferrer"
              className="md:hidden flex items-center gap-2 px-3 py-3 rounded-lg text-xs font-bold text-eqc-green hover:bg-eqc-green/5 transition-colors min-h-[44px]"
              data-allow-dirty="true"
            >
              <ExternalLink size={14} /> Trainer Sign-on
            </a>
          </div>
        </nav>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}

// Re-use motion for sub-tabs if needed
export { motion };
