/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  Flame,
  BriefcaseMedical,
  BookOpen,
  User,
  ExternalLink,
  Maximize,
  Minimize,
  Plus,
  Trash2,
  LogIn,
  Coffee,
  Train,
  Layout,
  CheckCircle,
  AlertCircle,
  X,
  Cog,
  Calendar,
  Megaphone,
  ListCheckIcon,
  CogIcon,
  CalendarDaysIcon,
  MapPinCheckInside,
  ShieldQuestionIcon,
  Edit3,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';

// --- Types ---

interface RoomAllocation {
  id: number;
  roomName: string;
  status: 'available' | 'live' | 'break';
  course?: string;
  topic?: string;
  trainer?: string;
  intake?: string;
}

interface Event {
  id: number;
  title: string;
  date: string;
  description: string;
  icon?: string;
}

interface StaffMember {
  id: string;
  name: string;
  intake: string;
  room: string;
  course: string;
  topics?: string;
}

interface Announcement {
  id: number;
  text: string;
  color: string;
  expiresAt: string;
}

// --- Demo / Static Mode ---
// When VITE_DEMO_MODE is set (e.g. for GitHub Pages preview deploys), the
// frontend runs without a backend: no Socket.IO, no admin/sign-on writes.
// The lobby UI renders against seeded data so previews look complete.

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const TRAINER_SIGN_ON_URL = `${import.meta.env.BASE_URL}trainer-sign-on.html`;

// --- Mock Data ---

const INITIAL_ROOMS: RoomAllocation[] = IS_DEMO_MODE ? [
  { id: 1, roomName: 'Room 1', status: 'live', course: 'ICT40120 - Cert IV in Cyber Security', trainer: 'Tim', intake: '25g', topic: 'Network Defence' },
  { id: 2, roomName: 'Room 2', status: 'live', course: 'ICT50220 - Dip of IT', trainer: 'Saxon', intake: '26b', topic: 'Cloud Architecture' },
  { id: 3, roomName: 'Room 3', status: 'break' },
  { id: 4, roomName: 'Room 4', status: 'live', course: 'BSB50120 - Dip of Business', trainer: 'Emma', intake: '25g', topic: 'Service Excellence' },
  { id: 5, roomName: 'Room 5', status: 'live', course: 'ICT30120 - Cert III in IT', trainer: 'Nobody Special', intake: '26a', topic: 'Intro to Programming' },
  { id: 6, roomName: 'Room 6', status: 'available' },
] : [
  { id: 1, roomName: 'Room 1', status: 'available' },
  { id: 2, roomName: 'Room 2', status: 'available' },
  { id: 3, roomName: 'Room 3', status: 'available' },
  { id: 4, roomName: 'Room 4', status: 'available' },
  { id: 5, roomName: 'Room 5', status: 'available' },
  { id: 6, roomName: 'Room 6', status: 'available' },
];

const EVENTS: Event[] = [
  {
    id: 1,
    title: 'Term 2 Starts',
    date: 'Monday 20 April 2026',
    description: 'Welcome back — new term, new opportunities ahead.'
  },
  {
    id: 2,
    title: 'Campus Tour',
    date: 'Wednesday 1 April 2026',
    description: 'Join us for a guided tour of our state-of-the-art facilities.'
  },
  {
    id: 3,
    title: 'Student Workshop',
    date: 'Friday 10 April 2026',
    description: 'A deep dive into professional development and networking.'
  }
];

// --- Trainer Image Lookup ---

const KNOWN_TRAINERS = ['Aaron', 'Emma', 'Jesse', 'Saxon', 'Tim', 'Tommy'];

function getTrainerImagePath(trainerName?: string): string {
  if (!trainerName) return '/images/trainer-cutouts/eqc-perth-trainer-cutout-Skelly-cut-out.PNG';
  const firstName = trainerName.split(' ')[0];
  const match = KNOWN_TRAINERS.find(t => t.toLowerCase() === firstName.toLowerCase());
  return match
    ? `/images/trainer-cutouts/eqc-perth-trainer-cutout-${match}-cut-out.PNG`
    : '/images/trainer-cutouts/eqc-perth-trainer-cutout-Skelly-cut-out.PNG';
}

// --- Components ---

const Header = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <img
            src="/images/eqc-logo.png"
            alt="EQC Institute"
            className="h-20 w-auto object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://equinimcollege.com/wp-content/uploads/2021/08/EQC-Logo-1.png";
              (e.target as HTMLImageElement).onerror = () => {
                (e.target as HTMLImageElement).src = "https://placehold.co/400x120/1a7a54/ffffff?text=EQC+INSTITUTE";
              };
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold serif text-eqc-text tracking-tight leading-none">Welcome to Equinim College</h1>
          <p className="text-3xl text-eqc-muted font-medium mt-1">Perth Campus</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-right">
        <Forecast7Widget />
        <div className="flex items-center gap-5 bg-gray-50 px-6 h-20 rounded-2xl border border-gray-100">
          <span className="text-lg font-bold text-eqc-muted tracking-tight">{formattedDate}</span>
          <div className="w-px h-12 bg-gray-300" />
          <div className="flex items-baseline gap-1.5 w-[155px] justify-end tabular-nums">
            <span className="text-4xl font-bold text-eqc-text tracking-tight leading-none tabular-nums">{formattedTime.split(' ')[0]}</span>
            <span className="text-base font-bold text-eqc-muted uppercase leading-none w-7 text-left">{formattedTime.split(' ')[1]}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const RoomItem = ({ room }: { room: RoomAllocation }) => {
  const isLive = room.status === 'live';
  const isBreak = room.status === 'break';
  const trainerImg = getTrainerImagePath(room.trainer);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        grid grid-cols-[90px_70px_1fr_1.5fr_1fr_60px] items-center gap-4 px-5 rounded-2xl transition-all cursor-default flex-1
        ${isLive ? 'bg-eqc-green text-white shadow-xl' : isBreak ? 'bg-orange-500 text-white shadow-lg' : 'bg-white border border-gray-100 shadow-sm'}
      `}
    >
      {/* Room Number */}
      <div>
        <h3 className="text-xl font-bold serif leading-none">{room.roomName}</h3>
      </div>

      {/* Intake */}
      <div>
        {isLive && room.intake ? (
          <span className="text-lg font-bold">{room.intake}</span>
        ) : (
          <span className={`text-sm italic ${isBreak ? 'text-white/50' : 'text-eqc-muted'}`}>&mdash;</span>
        )}
      </div>

      {/* Trainer with photo */}
      <div className="flex items-center gap-3 min-w-0">
        {isLive ? (
          <>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/40 shrink-0 bg-white">
              <img
                src={trainerImg}
                alt={room.trainer || 'Unknown'}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <span className="font-bold text-base truncate">{room.trainer}</span>
          </>
        ) : isBreak ? (
          <div className="flex items-center gap-2 italic font-bold">
            <Coffee size={18} />
            <span>On Break</span>
          </div>
        ) : (
          <span className="text-sm text-eqc-muted italic">Available</span>
        )}
      </div>

      {/* Course */}
      <div className="min-w-0">
        {isLive && room.course ? (
          <span className="font-bold text-sm leading-tight truncate block">{room.course}</span>
        ) : (
          <span className={`text-sm italic ${isBreak ? 'text-white/50' : 'text-eqc-muted'}`}>&mdash;</span>
        )}
      </div>

      {/* Topic */}
      <div className="min-w-0">
        {isLive && room.topic ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <BookOpen size={14} className="shrink-0 opacity-70" />
            <span className="text-sm font-medium italic truncate">{room.topic}</span>
          </div>
        ) : (
          <span className={`text-sm italic ${isBreak ? 'text-white/50' : 'text-eqc-muted'}`}>&mdash;</span>
        )}
      </div>

      {/* Live indicator */}
      <div className="flex justify-end">
        {isLive && (
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full border border-white/30">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-[9px] font-black tracking-widest uppercase">LIVE</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const EVENT_INTERVAL_MS = 30000;

const EventList = ({ events }: { events: Event[] }) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    setCurrentIdx((idx) => (idx >= events.length ? 0 : idx));
    const timer = setInterval(() => {
      setCurrentIdx((idx) => (idx + 1) % events.length);
    }, EVENT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [events.length]);

  const currentEvent = events[currentIdx];

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-eqc-green/10 flex items-center justify-center rounded-full">
            <CalendarDaysIcon size={26} className="text-eqc-green" />
          </div>
          <h2 className="text-2xl text-eqc-green font-bold serif">Upcoming Events</h2>
        </div>
        {events.length > 1 && (
          <div className="flex items-center gap-1.5">
            {events.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === currentIdx ? 'bg-eqc-green w-5' : 'bg-gray-200 w-1.5'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 relative">
        {events.length === 0 ? (
          <p className="text-eqc-muted italic text-base">No events scheduled.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="border-l-4 border-eqc-green pl-5 py-1"
            >
              <p className="text-xs font-bold text-eqc-green uppercase tracking-widest mb-2">
                {new Date(currentEvent.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h3 className="text-2xl font-bold serif text-eqc-text leading-tight mb-2">{currentEvent.title}</h3>
              <p className="text-sm text-eqc-muted leading-relaxed line-clamp-3">{currentEvent.description}</p>
            </motion.div>
          </AnimatePresence>
        )}

        {events.length > 1 && (
          <motion.div
            key={`progress-${currentIdx}`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: EVENT_INTERVAL_MS / 1000, ease: 'linear' }}
            className="absolute bottom-0 left-0 h-0.5 bg-eqc-green/40 rounded-full"
          />
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-eqc-muted shrink-0 flex justify-between items-center">
        <span>Questions? <span className="text-eqc-green font-bold">trainer@equinimcollege.com</span></span>
        {events.length > 1 && (
          <span className="font-bold tracking-wider uppercase">{currentIdx + 1} / {events.length}</span>
        )}
      </div>
    </div>
  );
};

const Forecast7Widget = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    while (ref.current.firstChild) ref.current.removeChild(ref.current.firstChild);
    const a = document.createElement('a');
    a.className = 'weatherwidget-io';
    a.href = 'https://forecast7.com/en/n31d95115d86/perth/';
    a.setAttribute('data-label_1', 'PERTH');
    a.setAttribute('data-label_2', 'Weather');
    a.setAttribute('data-theme', 'pure');
    a.setAttribute('data-days', '3');
    a.setAttribute('data-highcolor', '#1a7a54');
    a.textContent = 'PERTH Weather';
    ref.current.appendChild(a);
    const existing = document.getElementById('weatherwidget-io-js');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'weatherwidget-io-js';
    script.src = 'https://weatherwidget.io/js/widget.min.js';
    document.body.appendChild(script);
  }, []);
  return <div ref={ref} className="overflow-hidden rounded-2xl" style={{ width: 320, height: 80 }} />;
};

const AdminHub = ({
  rooms,
  events,
  staff,
  announcements,
  onClose
}: {
  rooms: RoomAllocation[],
  events: Event[],
  staff: StaffMember[],
  announcements: Announcement[],
  onClose: () => void
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'rooms' | 'events' | 'announcements'>('rooms');
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editEventData, setEditEventData] = useState<Partial<Event>>({});

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (IS_DEMO_MODE) {
      setLoginError("Admin panel is disabled in this static preview. Visit the live site to make changes.");
      return;
    }
    try {
      const configDoc = await getDoc(doc(db, 'config', 'admin'));
      const adminPassword = configDoc.exists() ? configDoc.data().password : 'admin';
      if (password === adminPassword) {
        setIsLoggedIn(true);
        setLoginError("");
      } else {
        setLoginError("Invalid password. Please try again.");
      }
    } catch (err) {
      setLoginError("Could not verify password. Try again in a moment.");
    }
  };

  const updateRooms = async (newRooms: RoomAllocation[]) => {
    if (IS_DEMO_MODE) return;
    const currentIds = rooms.map(r => r.id);
    const newIds = newRooms.map(r => r.id);
    for (const id of currentIds) {
      if (!newIds.includes(id)) {
        await deleteDoc(doc(db, 'rooms', `room_${id}`));
      }
    }
    for (const room of newRooms) {
      await setDoc(doc(db, 'rooms', `room_${room.id}`), { ...room });
    }
  };

  const updateEvents = async (newEvent: Partial<Event>, action: 'update_single' | 'delete') => {
    if (IS_DEMO_MODE) return;
    if (action === 'update_single') {
      const id = newEvent.id || Date.now();
      await setDoc(doc(db, 'events', `event_${id}`), { ...newEvent, id });
    } else if (action === 'delete') {
      await deleteDoc(doc(db, 'events', `event_${newEvent.id}`));
    }
  };

  const updateAnnouncements = async (data: any, action: 'add' | 'delete') => {
    if (IS_DEMO_MODE) return;
    if (action === 'add') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (data.duration || 1));
      const id = Date.now();
      await setDoc(doc(db, 'announcements', `ann_${id}`), {
        ...data,
        id,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    } else if (action === 'delete') {
      await deleteDoc(doc(db, 'announcements', `ann_${data.id}`));
    }
  };

  const handleQuickRoomUpdate = (idx: number, field: keyof RoomAllocation, value: string) => {
    const newRooms = [...rooms];
    (newRooms[idx] as any)[field] = value;
    if (field === 'status' && value === 'available') {
      newRooms[idx].course = undefined;
      newRooms[idx].trainer = undefined;
      newRooms[idx].intake = undefined;
      newRooms[idx].topic = undefined;
    }
    updateRooms(newRooms);
  };

  const handleSaveEvent = (event: Event) => {
    updateEvents({ ...event, ...editEventData }, 'update_single');
    setEditingEventId(null);
    setEditEventData({});
    setStatusMessage({ text: "Event updated!", type: 'success' });
  };

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <ShieldQuestionIcon size={30} className="text-eqc-green" />
              <h2 className="text-2xl font-bold serif text-gray-800">ADMIN LOGIN</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left mb-8">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold border border-red-100 animate-shake">
                {loginError}
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
                placeholder="Enter staff password"
              />
            </div>
            <button type="submit" className="w-full bg-eqc-green text-white py-3 rounded-xl font-bold hover:bg-eqc-green/90 transition-colors flex items-center justify-center gap-2">
              <LogIn size={20} /> Login
            </button>
          </form>

          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-eqc-green"></div>
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

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center shrink-0 relative">
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-6 py-2 rounded-full shadow-lg z-50 text-sm font-bold flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-eqc-green text-white' : 'bg-red-500 text-white'
                }`}
            >
              {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {statusMessage.text}
            </motion.div>
          )}
          <div className="flex items-center gap-3">
            <Cog size={32} />
            <h2 className="text-2xl font-bold serif">Administration Panel</h2>
            <div className="ml-20"></div>
            <div className="flex bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'rooms' ? 'bg-white shadow-sm text-eqc-green' : 'text-gray-500'}`}
              ><ListCheckIcon size={20} className="inline-block mr-1 -mt-1" />
                Rooms
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'events' ? 'bg-white shadow-sm text-eqc-green' : 'text-gray-500'}`}
              ><Calendar size={20} className="inline-block mr-1 -mt-1" />
                Events
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'announcements' ? 'bg-white shadow-sm text-eqc-green' : 'text-gray-500'}`}
              ><AlertCircle size={20} className="inline-block mr-1 -mt-1" />
                Alerts
              </button>
            </div>
          </div>
          <button onClick={onClose} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2">
            <X size={18} /> Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2"><Layout size={24} className="text-eqc-green" /> Manage Room Allocations</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const newRooms = rooms.map(r => ({ ...r, status: 'available' as const, course: undefined, trainer: undefined, intake: undefined, topic: undefined }));
                      updateRooms(newRooms);
                      setStatusMessage({ text: "All rooms reset to available.", type: 'success' });
                    }}
                    className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors"
                  >
                    <X size={18} /> Reset All
                  </button>
                  <button
                    onClick={() => updateRooms([...rooms, { id: Date.now(), roomName: "New Room", status: "available" }])}
                    className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                    <Plus size={18} /> Add Room
                  </button>
                </div>
              </div>

              <p className="text-sm text-eqc-muted mb-3">Changes are reflected live on the dashboard. Trainer sign-ons update rooms automatically.</p>

              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-[80px_110px_1fr_1fr_90px_1fr_70px] gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-eqc-muted">
                  <span>Room</span>
                  <span>Status</span>
                  <span>Course</span>
                  <span>Trainer</span>
                  <span>Intake</span>
                  <span>Topic</span>
                  <span className="text-right">Actions</span>
                </div>
                {rooms.map((room, idx) => {
                  const isCoreRoom = parseInt(room.roomName.replace('Room ', '')) >= 1 && parseInt(room.roomName.replace('Room ', '')) <= 6;
                  return (
                    <div
                      key={room.id}
                      className={`grid grid-cols-[80px_110px_1fr_1fr_90px_1fr_70px] gap-2 px-3 py-2 items-center border-b border-gray-100 last:border-b-0 ${room.status === 'live' ? 'bg-green-50' : room.status === 'break' ? 'bg-orange-50' : 'bg-white'}`}
                    >
                      <input
                        value={room.roomName}
                        readOnly={isCoreRoom}
                        onChange={(e) => handleQuickRoomUpdate(idx, 'roomName', e.target.value)}
                        className={`w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-bold ${isCoreRoom ? 'bg-gray-50 border-transparent cursor-not-allowed' : 'bg-white'}`}
                      />
                      <select
                        value={room.status}
                        onChange={(e) => handleQuickRoomUpdate(idx, 'status', e.target.value)}
                        className={`w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-bold ${room.status === 'live' ? 'text-green-700' : room.status === 'break' ? 'text-orange-700' : 'text-gray-600'}`}
                      >
                        <option value="available">Available</option>
                        <option value="live">Live</option>
                        <option value="break">Break</option>
                      </select>
                      <input
                        value={room.course || ""}
                        onChange={(e) => handleQuickRoomUpdate(idx, 'course', e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                      />
                      <input
                        value={room.trainer || ""}
                        onChange={(e) => handleQuickRoomUpdate(idx, 'trainer', e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                      />
                      <input
                        value={room.intake || ""}
                        onChange={(e) => handleQuickRoomUpdate(idx, 'intake', e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                      />
                      <input
                        value={room.topic || ""}
                        onChange={(e) => handleQuickRoomUpdate(idx, 'topic', e.target.value)}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white"
                      />
                      <div className="flex justify-end gap-1">
                        {room.status !== 'available' && (
                          <button
                            onClick={() => {
                              const newRooms = [...rooms];
                              newRooms[idx] = { ...newRooms[idx], status: 'available', course: undefined, trainer: undefined, intake: undefined, topic: undefined };
                              updateRooms(newRooms);
                              setStatusMessage({ text: `${room.roomName} cleared.`, type: 'success' });
                            }}
                            className="text-orange-500 p-1.5 hover:bg-orange-100 rounded"
                            title="Clear Room"
                          >
                            <X size={16} />
                          </button>
                        )}
                        {!isCoreRoom && (
                          <button
                            onClick={() => updateRooms(rooms.filter(r => r.id !== room.id))}
                            className="text-red-500 p-1.5 hover:bg-red-50 rounded"
                            title="Delete Room"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-medium flex items-center gap-2">
                  <ExternalLink size={14} />
                  Rooms also update when trainers sign on via the <a href={TRAINER_SIGN_ON_URL} target="_blank" className="underline font-bold">Trainer Sign-On Portal</a>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-8">
              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus size={20} className="text-eqc-green" /> Add New Event</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = Object.fromEntries(formData.entries());
                    updateEvents(data, 'update_single');
                    e.currentTarget.reset();
                    setStatusMessage({ text: "Event scheduled!", type: 'success' });
                  }}
                  className="grid grid-cols-2 gap-6"
                >
                  <div className="col-span-2">
                    <label className="block text-sm font-bold mb-1">Event Title</label>
                    <input name="title" required className="w-full p-3 border rounded-lg" placeholder="e.g. Graduation Ceremony" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Date</label>
                    <input name="date" type="date" required className="w-full p-3 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Icon (Lucide Name)</label>
                    <input name="icon" className="w-full p-3 border rounded-lg" placeholder="e.g. GraduationCap, Users, Star" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold mb-1">Description</label>
                    <textarea name="description" required className="w-full p-3 border rounded-lg h-24" placeholder="Brief details about the event..." />
                  </div>
                  <button type="submit" className="col-span-2 bg-eqc-green text-white py-4 rounded-xl font-bold hover:bg-eqc-green/90 transition-all shadow-lg">
                    Schedule Event
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><Calendar size={24} className="text-eqc-green" /> Scheduled Events ({events.length})</h3>
                <div className="grid grid-cols-1 gap-4">
                  {events.map(event => (
                    <div key={event.id} className="bg-white p-6 rounded-xl border shadow-sm">
                      {editingEventId === event.id ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase mb-1">Title</label>
                            <input
                              value={editEventData.title ?? event.title}
                              onChange={(e) => setEditEventData({ ...editEventData, title: e.target.value })}
                              className="w-full p-2 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1">Date</label>
                            <input
                              type="date"
                              value={editEventData.date ?? event.date}
                              onChange={(e) => setEditEventData({ ...editEventData, date: e.target.value })}
                              className="w-full p-2 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase mb-1">Description</label>
                            <input
                              value={editEventData.description ?? event.description}
                              onChange={(e) => setEditEventData({ ...editEventData, description: e.target.value })}
                              className="w-full p-2 border rounded text-sm"
                            />
                          </div>
                          <div className="col-span-2 flex gap-2 justify-end">
                            <button onClick={() => { setEditingEventId(null); setEditEventData({}); }} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button onClick={() => handleSaveEvent(event)} className="px-4 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg flex items-center gap-2"><Save size={16} /> Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Clock size={24} className="text-eqc-muted" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{event.title}</p>
                              <p className="text-sm text-eqc-green font-bold">{new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              <p className="text-xs text-eqc-muted mt-1">{event.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setEditingEventId(event.id); setEditEventData({}); }} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Edit3 size={18} /></button>
                            <button onClick={() => updateEvents(event, 'delete')} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {events.length === 0 && (
                    <p className="text-eqc-muted italic text-center py-8">No events scheduled. Add one above.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="space-y-8">
              <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus size={20} className="text-eqc-green" /> Create Announcement</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const text = formData.get('text') as string;
                    const color = formData.get('color') as string;
                    const duration = parseInt(formData.get('duration') as string);
                    updateAnnouncements({ text, color, duration }, 'add');
                    e.currentTarget.reset();
                    setStatusMessage({ text: "Announcement created!", type: 'success' });
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-bold mb-1">Announcement Text</label>
                    <input name="text" required className="w-full p-3 border rounded-lg" placeholder="e.g. Campus closed this Friday for public holiday" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold mb-1">Banner Color</label>
                      <select name="color" className="w-full p-3 border rounded-lg">
                        <option value="bg-eqc-green">EQC Green</option>
                        <option value="bg-red-600">Urgent Red</option>
                        <option value="bg-blue-600">Info Blue</option>
                        <option value="bg-orange-500">Warning Orange</option>
                        <option value="bg-purple-600">Special Purple</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Duration (Days)</label>
                      <input name="duration" type="number" min="1" max="30" defaultValue="1" className="w-full p-3 border rounded-lg" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-eqc-green text-white py-4 rounded-xl font-bold hover:bg-eqc-green/90 transition-all shadow-lg">
                    Post Announcement
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2"><Megaphone size={24} className="text-eqc-green" /> Active Announcements</h3>
                <div className="grid grid-cols-1 gap-4">
                  {announcements.map(ann => (
                    <div key={ann.id} className="bg-white p-6 rounded-xl border flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${ann.color}`}></div>
                        <div>
                          <p className="font-bold">{ann.text}</p>
                          <p className="text-xs text-eqc-muted">Expires: {new Date(ann.expiresAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => updateAnnouncements(ann, 'delete')} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-between items-center shrink-0">
          <a href={TRAINER_SIGN_ON_URL} target="_blank" className="flex items-center gap-2 text-eqc-green bg-eqc-green/10 px-4 py-2 rounded-lg font-bold hover:bg-eqc-green/20 transition-colors">
            <User size={18} /> Trainer Sign-On Portal
          </a>
        </div>
      </div>
    </div>
  );
};

const CampusMap = () => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <MapPin size={24} className="text-eqc-green" />
        <h2 className="text-2xl font-bold serif">Campus & Nearby</h2>
      </div>
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 shadow-inner min-h-0">
          <iframe
            title="Campus Map"
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            src="https://maps.google.com/maps?q=2%20Gordon%20St,%20West%20Perth%20WA%206005&t=&z=16&ie=UTF8&iwloc=&output=embed"
            allowFullScreen
          ></iframe>
        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-eqc-green mb-2 flex items-center gap-1.5">
              <Coffee size={12} /> Cafes & Shopping
            </h3>
            <ul className="text-xs space-y-1 font-medium">
              <li className="flex justify-between"><span>Gordon St Garage</span> <span className="text-eqc-muted">1m</span></li>
              <li className="flex justify-between"><span>Pony Express</span> <span className="text-eqc-muted">3m</span></li>
              <li className="flex justify-between"><span>Watertown Outlets</span> <span className="text-eqc-muted">5m</span></li>
            </ul>
          </div>
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
              <Train size={12} /> Public Transport
            </h3>
            <ul className="text-xs space-y-1 font-medium">
              <li className="flex justify-between"><span>City West Station</span> <span className="text-eqc-muted">4m</span></li>
              <li className="flex justify-between"><span>Bus 81, 82, 83, 84</span> <span className="text-eqc-muted">2m</span></li>
              <li className="flex justify-between"><span>Yellow CAT Bus</span> <span className="text-eqc-muted">3m</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = ({ onStaffLogin }: { onStaffLogin: () => void }) => {
  return (
    <footer className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center text-xs text-eqc-muted shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-red-500" />
          <span className="font-medium">2 Gordon St, West Perth WA 6005</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-eqc-green" />
          <span className="font-medium">1800 338 883</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-eqc-green" />
          <span className="font-medium">team@equinimcollege.com</span>
        </div>
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-orange-500" />
          <span className="font-medium">Fire Assembly: Coolgardie St</span>
        </div>
        <div className="flex items-center gap-2">
          <BriefcaseMedical size={14} className="text-red-500" />
          <span className="font-medium">First Aid: Reception</span>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="font-bold tracking-wide">
          RTO 45758 · CRICOS 03952E
        </div>
        <button
          onClick={onStaffLogin}
          className="bg-eqc-green text-white px-2 py-2 rounded-full text-md font-light hover:bg-eqc-green/90 active:scale-95 transition-colors"
        ><CogIcon size={25} />
        </button>
      </div>
    </footer>
  );
};

const AnnouncementBanner = ({ announcements }: { announcements: Announcement[] }) => {
  if (announcements.length === 0) return null;

  return (
    <div className="bg-eqc-green text-white overflow-hidden py-2 shrink-0 relative z-[60] border-b border-white/10">
      <div className="flex whitespace-nowrap animate-marquee items-center gap-20">
        {announcements.map((ann, idx) => (
          <div key={`${ann.id}-${idx}`} className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${ann.color} border border-white/20 shadow-sm`}></div>
            <span className="text-lg font-black uppercase tracking-[0.2em] italic">{ann.text}</span>
            <div className={`w-2 h-2 rounded-full ${ann.color} border border-white/20 shadow-sm`}></div>
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {announcements.map((ann, idx) => (
          <div key={`${ann.id}-dup-${idx}`} className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${ann.color} border border-white/20 shadow-sm`}></div>
            <span className="text-lg font-black uppercase tracking-[0.2em] italic">{ann.text}</span>
            <div className={`w-2 h-2 rounded-full ${ann.color} border border-white/20 shadow-sm`}></div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

const FloorPlan = () => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-lg flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <div className="w-10 h-10 flex items-center justify-center">
          <MapPinCheckInside size={30} className="text-eqc-green" />
        </div>
        <h2 className="text-2xl font-bold serif">Campus Map</h2>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 relative flex items-center justify-center">
        <img
          src="/images/eqc-perth-youarehere-v5.jpeg"
          alt="Campus Floor Plan"
          className="w-full h-full object-cover scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white shadow-sm">
            <span className="text-xs font-bold text-eqc-text uppercase tracking-widest">Level 1 - West Perth</span>
          </div>
        </div>
      </div>
    </div >
  );
};

export default function App() {
  const [rooms, setRooms] = useState<RoomAllocation[]>(INITIAL_ROOMS);
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timesheet, setTimesheet] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (IS_DEMO_MODE) return;

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => d.data() as RoomAllocation);
        data.sort((a, b) => a.id - b.id);
        setRooms(data);
      }
    });

    const unsubEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => d.data() as Event);
        data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(data);
      }
    });

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as StaffMember);
      setStaff(data);
    });

    const unsubAnnouncements = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as Announcement);
      setAnnouncements(data.filter(a => new Date(a.expiresAt) > new Date()));
    });

    return () => {
      unsubRooms();
      unsubEvents();
      unsubStaff();
      unsubAnnouncements();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="h-screen w-full flex flex-col font-sans overflow-hidden bg-eqc-bg relative">
      {IS_DEMO_MODE && (
        <div className="fixed bottom-4 left-4 z-50 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg">
          Static Preview · Read Only
        </div>
      )}
      <AnimatePresence>
        {showAdmin && (
          <AdminHub
            rooms={rooms}
            events={events}
            staff={staff}
            announcements={announcements}
            onClose={() => setShowAdmin(false)}
          />
        )}
      </AnimatePresence>

      <AnnouncementBanner announcements={announcements} />

      {/* Fullscreen Toggle for Samsung Frame Setup */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 p-2 bg-white/50 hover:bg-white rounded-full transition-all opacity-0 hover:opacity-100"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>

      <Header />

      <main className="flex-1 flex flex-col p-6 min-h-0 gap-6">
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Column: Room Allocations */}
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-3 h-8 mb-4 shrink-0">
              <div className="w-2.5 h-2.5 bg-eqc-green rounded-full shadow-[0_0_15px_rgba(26,122,84,0.8)] animate-pulse"></div>
              <h2 className="text-2xl font-bold serif text-white">Today's Room Allocations</h2>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[90px_70px_1fr_1.5fr_1fr_60px] gap-4 px-5 mb-2 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Room</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Intake</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Trainer</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Course</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Topic</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 text-right">Status</span>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 pb-2">
              {rooms.map((room) => (
                <RoomItem key={room.id} room={room} />
              ))}
            </div>
          </div>

          {/* Center Column: Floor Plan & Upcoming Events */}
          <div className="flex-1 shrink-0 flex flex-col min-h-0 min-w-0">
            <div className="h-8 mb-4 shrink-0" />
            <div className="flex-1 flex flex-col gap-6 min-h-0">
              <div className="flex-[3] min-h-0">
                <FloorPlan />
              </div>
              <div className="flex-[2] min-h-0">
                <EventList events={events} />
              </div>
            </div>
          </div>

          {/* Right Column: Campus & Nearby + Mobile View */}
          <div className="flex-1 flex flex-col shrink-0 min-h-0 min-w-0">
            <div className="h-8 mb-4 shrink-0" />
            <div className="flex-1 flex flex-col gap-6 min-h-0">
              <CampusMap />
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-lg flex items-center gap-4 shrink-0">
                <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center p-1.5 shrink-0 border border-gray-100">
                  <QRCodeSVG value={typeof window !== 'undefined' ? window.location.origin : ''} size={70} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold serif mb-0.5 leading-tight">Mobile View</h3>
                  <p className="text-[11px] text-eqc-green font-bold tracking-tight">Scan to view on your phone</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer onStaffLogin={() => setShowAdmin(true)} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        /* Samsung Frame Optimization */
        @media (min-aspect-ratio: 16/9) {
          main, header, footer {
            padding-left: 5vw !important;
            padding-right: 5vw !important;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
