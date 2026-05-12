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
  Cog,
  LogOut,
  LogIn,
  ShieldQuestionIcon,
  X,
  Home,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

import { ADMIN_PASSWORD } from '../lib/firebase';
import { useGlobalSettings, useResetCountdown } from '../lib/hooks';

const TRAINER_SIGN_ON_URL = `${import.meta.env.BASE_URL}trainer-sign-on.html`;
const STORAGE_KEY = 'eqc-admin-auth';

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
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, 'ok');
      setError('');
      onSuccess();
    } else {
      setError('Invalid password. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-eqc-bg z-[100] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ShieldQuestionIcon size={30} className="text-eqc-green" />
            <h2 className="text-2xl font-bold serif text-gray-800">Admin Login</h2>
          </div>
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Close">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left mb-8">
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
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-eqc-green outline-none transition-shadow"
              placeholder="Enter admin password"
            />
          </div>
          <button type="submit" className="w-full bg-eqc-green text-white py-3 rounded-xl font-bold hover:bg-eqc-green/90 transition-colors flex items-center justify-center gap-2">
            <LogIn size={20} /> Login
          </button>
        </form>

        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-eqc-green" />
          <h3 className="text-sm font-bold text-gray-800 mb-2">Trainer looking to sign on?</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            If you are a trainer checking in for your class, please use the Trainer Sign-On Portal instead of logging in here.
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm shrink-0">
              <QRCodeSVG value={typeof window !== 'undefined' ? `${window.location.origin}${TRAINER_SIGN_ON_URL}` : TRAINER_SIGN_ON_URL} size={64} />
            </div>
            <div className="text-left flex flex-col items-start">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Scan or Click</span>
              <a
                href={TRAINER_SIGN_ON_URL}
                target="_blank"
                className="bg-white border border-gray-200 text-eqc-green text-xs font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
                rel="noreferrer"
              >
                Open Portal <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(STORAGE_KEY) === 'ok');
  const [settings] = useGlobalSettings();
  const countdown = useResetCountdown(settings.resetTimeHour);

  // If user lands on /admin without a tab, redirect to /admin/rooms
  useEffect(() => {
    if (authed && location.pathname === '/admin') {
      navigate('/admin/rooms', { replace: true });
    }
  }, [authed, location.pathname, navigate]);

  if (!authed) {
    return <LoginGate onSuccess={() => setAuthed(true)} />;
  }

  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/');
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 font-sans overflow-hidden">
      {/* Persistent header with countdown */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Cog size={28} className="text-eqc-green" />
            <h1 className="text-xl font-bold serif text-gray-800">Administration</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Resets in</span>
            <span className="font-timer text-2xl font-bold tabular-nums text-eqc-green leading-none">{countdown}</span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Home size={16} /> Lobby
          </button>

          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar nav */}
        <nav className="w-56 bg-white border-r border-gray-200 p-3 flex flex-col gap-1 shrink-0 overflow-y-auto">
          {NAV_TABS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  isActive ? 'bg-eqc-green text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="mt-auto pt-3 border-t border-gray-100">
            <a
              href={TRAINER_SIGN_ON_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-eqc-green hover:bg-eqc-green/5 transition-colors"
            >
              <ExternalLink size={14} /> Sign-On Portal
            </a>
          </div>
        </nav>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
