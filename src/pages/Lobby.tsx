import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  Flame,
  BriefcaseMedical,
  BookOpen,
  Maximize,
  Minimize,
  Coffee,
  Train,
  CalendarDaysIcon,
  MapPinCheckInside,
  CogIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

import type { RoomAllocation, Event, Announcement } from '../lib/types';
import { getTrainerImagePath } from '../lib/trainers';
import { useRooms, useEvents, useAnnouncements, useCarousel, useGlobalSettings } from '../lib/hooks';
import { useRssTicker } from '../lib/rss';
import { Rss } from 'lucide-react';

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const TRAINER_SIGN_ON_URL = `${import.meta.env.BASE_URL}trainer-sign-on.html`;

const INITIAL_ROOMS: RoomAllocation[] = IS_DEMO_MODE
  ? [
      { id: 1, roomName: 'Room 1', status: 'live', course: 'ICT40120 - Cert IV in Cyber Security', trainer: 'Tim', intake: '25g', topic: 'Network Defence' },
      { id: 2, roomName: 'Room 2', status: 'live', course: 'ICT50220 - Dip of IT', trainer: 'Saxon', intake: '26b', topic: 'Cloud Architecture' },
      { id: 3, roomName: 'Room 3', status: 'break', course: 'ICT40120 - Cert IV in Cyber Security', trainer: 'Sarah', intake: '25f', topic: 'Ethical Hacking', breakUntil: new Date(Date.now() + 15 * 60000).toISOString() },
      { id: 4, roomName: 'Room 4', status: 'live', course: 'BSB50120 - Dip of Business', trainer: 'Emma', intake: '25g', topic: 'Service Excellence' },
      { id: 5, roomName: 'Room 5', status: 'live', course: 'ICT30120 - Cert III in IT', trainer: 'Nobody Special', intake: '26a', topic: 'Intro to Programming' },
      { id: 6, roomName: 'Room 6', status: 'available' },
    ]
  : [
      { id: 1, roomName: 'Room 1', status: 'available' },
      { id: 2, roomName: 'Room 2', status: 'available' },
      { id: 3, roomName: 'Room 3', status: 'available' },
      { id: 4, roomName: 'Room 4', status: 'available' },
      { id: 5, roomName: 'Room 5', status: 'available' },
      { id: 6, roomName: 'Room 6', status: 'available' },
    ];

const DEMO_EVENTS: Event[] = [
  { id: 1, title: 'Term 2 Starts', date: '2026-04-20', description: 'Welcome back — new term, new opportunities ahead.' },
  { id: 2, title: 'Campus Tour', date: '2026-04-01', description: 'Join us for a guided tour of our state-of-the-art facilities.' },
  { id: 3, title: 'Student Workshop', date: '2026-04-10', description: 'A deep dive into professional development and networking.' },
];

// --- Header ---

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

// --- Room Item ---

function formatBreakRemaining(breakUntil?: string): string | null {
  if (!breakUntil) return null;
  const target = new Date(breakUntil).getTime();
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / 60000);
  return minutes === 1 ? '1 min' : `${minutes} min`;
}

const RoomItem = ({ room }: { room: RoomAllocation }) => {
  const isLive = room.status === 'live';
  const isBreak = room.status === 'break';
  const isInactive = room.status === 'inactive';
  const hasContent = isLive || isBreak || isInactive;
  const trainerImg = getTrainerImagePath(room.trainer);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!isBreak) return;
    const id = setInterval(() => forceTick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, [isBreak]);

  const breakRemaining = isBreak ? formatBreakRemaining(room.breakUntil) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex flex-row items-center justify-between px-6 py-4 rounded-2xl transition-all cursor-default flex-1
        ${isLive ? 'bg-eqc-green text-white shadow-xl' : isBreak ? 'bg-orange-500 text-white shadow-lg' : isInactive ? 'bg-gray-300 text-gray-500 shadow-sm' : 'bg-white border border-gray-100 shadow-sm'}
      `}
    >
      <div className="flex flex-row items-center gap-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 ${
          isLive ? 'bg-white/20' : isBreak ? 'bg-white/20' : isInactive ? 'bg-gray-200' : 'bg-gray-100'
        }`}>
          <span className="font-sans font-bold text-4xl leading-[0] translate-y-px">{room.roomName.replace('Room ', '')}</span>
        </div>
        {hasContent && room.trainer ? (
          <>
            <div className={`w-16 h-16 rounded-full overflow-hidden border-3 shrink-0 bg-white ${isInactive ? 'border-gray-200' : 'border-white/40'}`}>
              <img src={trainerImg} alt={room.trainer} className="w-full h-full object-cover object-top" />
            </div>
            <span className="font-sans font-semibold text-4xl leading-none">{room.trainer}</span>
            {room.intake && (
              <>
                <span className="text-4xl opacity-30">·</span>
                <span className="font-sans font-medium text-4xl leading-none">{room.intake}</span>
              </>
            )}
          </>
        ) : isBreak ? (
          <>
            <Coffee size={32} />
            <span className="font-sans font-semibold text-4xl leading-none italic">On Break</span>
          </>
        ) : (
          <span className="font-sans text-2xl leading-none italic opacity-80">Available for study</span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {hasContent && (room.course || room.topic) && (
          <div className="flex flex-col items-end gap-1 text-right">
            {room.course && (
              <span className={`font-sans text-base truncate max-w-[300px] ${isLive || isBreak ? 'text-white/80' : isInactive ? 'text-gray-500' : 'text-eqc-muted'}`}>
                {room.course}
              </span>
            )}
            {room.topic && (
              <span className={`font-sans text-base italic truncate max-w-[300px] ${isLive || isBreak ? 'text-white/70' : isInactive ? 'text-gray-500' : 'text-eqc-muted'}`}>
                {room.topic}
              </span>
            )}
          </div>
        )}
        {isLive && (
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full border border-white/30 shrink-0">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
            <span className="text-base font-black tracking-widest uppercase">LIVE</span>
          </div>
        )}
        {isBreak && (
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full border border-white/30 shrink-0">
            <Coffee size={18} />
            <span className="text-lg font-black tracking-wider uppercase tabular-nums">{breakRemaining || 'BREAK'}</span>
          </div>
        )}
        {isInactive && (
          <span className="text-base font-black tracking-widest uppercase opacity-70">Signed off</span>
        )}
      </div>
    </motion.div>
  );
};

// --- Event List ---

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
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <CalendarDaysIcon size={24} className="text-eqc-green" />
          <h2 className="text-2xl font-display font-bold">Upcoming Events</h2>
        </div>
        {events.length > 1 && (
          <div className="flex items-center gap-1.5">
            {events.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentIdx ? 'bg-eqc-green w-5' : 'bg-gray-200 w-1.5'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 relative">
        {events.length === 0 ? (
          <p className="text-eqc-muted italic text-sm">No events scheduled.</p>
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
              <p className="text-[10px] font-black text-eqc-green uppercase tracking-widest mb-2">
                {new Date(currentEvent.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h3 className="text-xl font-display font-bold text-eqc-text leading-tight mb-2">{currentEvent.title}</h3>
              <p className="text-xs text-eqc-muted leading-relaxed line-clamp-3">{currentEvent.description}</p>
            </motion.div>
          </AnimatePresence>
        )}

      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-eqc-muted shrink-0 flex justify-between items-center">
        <span>Questions? <span className="text-eqc-green font-bold">trainer@equinimcollege.com</span></span>
        {events.length > 1 && <span className="font-bold tracking-wider uppercase">{currentIdx + 1} / {events.length}</span>}
      </div>
    </div>
  );
};

// --- Weather Widget ---

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

// --- Campus Map ---

const CampusMap = () => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <MapPin size={24} className="text-eqc-green" />
        <h2 className="text-2xl font-display font-bold">Campus & Nearby</h2>
      </div>
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex-[3] rounded-xl overflow-hidden border border-gray-100 shadow-inner min-h-0">
          <iframe
            title="Campus Map"
            width="100%"
            height="100%"
            style={{ border: 0, display: 'block' }}
            src="https://maps.google.com/maps?q=2%20Gordon%20St,%20West%20Perth%20WA%206005&t=&z=16&ie=UTF8&iwloc=&output=embed"
            allowFullScreen
          />
        </div>

        <div className="flex-[2] grid grid-cols-2 gap-3">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-eqc-green mb-3 flex items-center gap-1.5">
              <Coffee size={14} /> Cafes & Shopping
            </h3>
            <ul className="text-sm space-y-2 font-medium">
              <li className="flex justify-between"><span>Gordon St Garage</span> <span className="text-eqc-muted">1m</span></li>
              <li className="flex justify-between"><span>Pony Express</span> <span className="text-eqc-muted">3m</span></li>
              <li className="flex justify-between"><span>Watertown Outlets</span> <span className="text-eqc-muted">5m</span></li>
            </ul>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3 flex items-center gap-1.5">
              <Train size={14} /> Public Transport
            </h3>
            <ul className="text-sm space-y-2 font-medium">
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

// --- Campus Life Carousel ---

const CampusLifeCarousel = () => {
  const items = useCarousel();
  const [settings] = useGlobalSettings();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    setIdx(i => (i >= items.length ? 0 : i));
    const id = setInterval(() => {
      setIdx(i => (i + 1) % items.length);
    }, settings.carouselSlideDurationMs);
    return () => clearInterval(id);
  }, [items.length, settings.carouselSlideDurationMs]);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-3">
          <MapPinCheckInside size={26} className="text-gray-300" />
        </div>
        <h3 className="text-xl font-display font-bold leading-tight">Campus Life</h3>
        <p className="text-xs text-eqc-muted mt-1 max-w-[200px]">Photos appear here as they're added in the admin panel.</p>
      </div>
    );
  }

  const current = items[idx];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden h-full flex flex-col">
      <div className="flex-1 relative bg-gray-50 min-h-0">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.id}
            src={current.imageUrl}
            alt={current.caption || 'Campus life'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        {current.caption && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium">
            {current.caption}
          </div>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 bg-white">
          {items.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === idx ? 'bg-eqc-green w-4' : 'bg-gray-200 w-1'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- RSS Ticker (bottom edge) ---

const RSS_SCROLL_DURATIONS = {
  slow: 90,
  medium: 60,
  fast: 35,
} as const;

const RssTicker = () => {
  const items = useRssTicker(20);
  const [settings] = useGlobalSettings();
  if (!settings.rssEnabled || items.length === 0) return null;

  const duration = RSS_SCROLL_DURATIONS[settings.rssScrollSpeed] || RSS_SCROLL_DURATIONS.medium;

  return (
    <div className="bg-eqc-bg/95 backdrop-blur-sm border-t border-white/10 text-white py-2 overflow-hidden shrink-0 group">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0 px-4 border-r border-white/20">
          <Rss size={14} className="text-eqc-green" />
          <span className="text-[10px] font-black uppercase tracking-widest">News</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            className="flex whitespace-nowrap items-center gap-12 animate-rss-marquee group-hover:[animation-play-state:paused]"
            style={{ animationDuration: `${duration}s` }}
          >
            {[...items, ...items].map((item, idx) => (
              <span key={`${item.link}-${idx}`} className="text-sm flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-eqc-green">{item.source}</span>
                <span className="opacity-90">{item.title}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes rss-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-rss-marquee { animation: rss-marquee linear infinite; }
      `}</style>
    </div>
  );
};

// --- Mobile View tile (QR for the /mobile route) ---

const MobileViewTile = () => {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/mobile` : '';
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col items-center justify-center text-center gap-3">
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-2">
        <QRCodeSVG value={url} size={88} />
      </div>
      <div>
        <h3 className="text-xl font-display font-bold leading-tight">Mobile View</h3>
        <p className="text-xs text-eqc-green font-bold mt-1">Scan to view on your phone</p>
      </div>
    </div>
  );
};

// --- Floor Plan ---

const FloorPlan = () => {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <MapPinCheckInside size={24} className="text-eqc-green" />
        <h2 className="text-2xl font-display font-bold">Campus Map</h2>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 relative flex items-center justify-center">
        <img src="/images/eqc-perth-youarehere-v5.jpeg" alt="Campus Floor Plan" className="w-full h-full object-cover scale-110" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-white shadow-sm">
            <span className="text-xs font-bold text-eqc-text uppercase tracking-widest">Level 1 - West Perth</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Footer ---

const Footer = ({ onAdmin }: { onAdmin: () => void }) => {
  const mobileUrl = typeof window !== 'undefined' ? `${window.location.origin}/mobile` : '';
  return (
    <footer className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center text-xs text-eqc-muted shrink-0">
      <div className="flex items-center gap-8">
        <div className="bg-white border border-gray-200 rounded-lg p-1.5 shrink-0">
          <QRCodeSVG value={mobileUrl} size={64} />
        </div>
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
          <BriefcaseMedical size={14} className="text-red-500" />
          <span className="font-medium">First Aid: Kitchen</span>
        </div>
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-orange-500" />
          <span className="font-medium">Fire Assembly: Coolgardie St</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="font-bold tracking-wide">RTO 45758 · CRICOS 03952E</div>
        <button
          onClick={onAdmin}
          className="bg-eqc-green text-white px-2 py-2 rounded-full text-md font-light hover:bg-eqc-green/90 active:scale-95 transition-colors"
          aria-label="Admin panel"
        >
          <CogIcon size={25} />
        </button>
      </div>
    </footer>
  );
};

// --- Announcement Banner ---

const SIZE_CLASSES = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' } as const;
const SPEED_DURATIONS = { slow: 60, medium: 30, fast: 18 } as const;

const AnnouncementBanner = ({ announcements }: { announcements: Announcement[] }) => {
  if (announcements.length === 0) return null;

  // Each banner has its own style. Stack them rather than mix in one marquee.
  return (
    <div className="shrink-0 relative z-[60] border-b border-white/10">
      {announcements.map((ann) => {
        const bg = ann.color || 'bg-eqc-green';
        const txt = ann.textColor || 'text-white';
        const sizeClass = SIZE_CLASSES[ann.textSize || 'md'];
        const duration = SPEED_DURATIONS[ann.scrollSpeed || 'medium'];
        return (
          <div key={ann.id} className={`${bg} ${txt} overflow-hidden py-2`}>
            <div
              className="flex whitespace-nowrap items-center gap-16 animate-marquee"
              style={{ animationDuration: `${duration}s` }}
            >
              {[0, 1].map(dupe => (
                <div key={dupe} className="flex items-center gap-16">
                  {[0, 1, 2].map(repeat => (
                    <span key={repeat} className={`${sizeClass} font-black uppercase tracking-[0.2em] italic flex items-center gap-3`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {ann.text}
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation-name: marquee; animation-timing-function: linear; animation-iteration-count: infinite; }
      `}</style>
    </div>
  );
};

// --- Lobby Page ---

export default function Lobby() {
  const navigate = useNavigate();
  const [rooms] = useRooms(INITIAL_ROOMS);
  const [events] = useEvents(IS_DEMO_MODE ? DEMO_EVENTS : []);
  const announcements = useAnnouncements();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col font-sans overflow-hidden bg-eqc-bg relative">
      {IS_DEMO_MODE && (
        <div className="fixed bottom-4 left-4 z-50 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg">
          Static Preview · Read Only
        </div>
      )}

      <AnnouncementBanner announcements={announcements} />

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
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-3 h-8 mb-4 shrink-0">
              <div className="w-2.5 h-2.5 bg-eqc-green rounded-full shadow-[0_0_15px_rgba(26,122,84,0.8)] animate-pulse" />
              <h2 className="text-2xl font-bold serif text-white">Today's Room Allocations</h2>
            </div>


            <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-2">
              {rooms.map((room) => <RoomItem key={room.id} room={room} />)}
            </div>
          </div>

          <div className="flex-[2] shrink-0 flex flex-col min-h-0 min-w-0">
            <div className="h-8 mb-4 shrink-0" />
            <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-[2fr_1fr_1fr] gap-6">
              <div className="col-span-2 min-h-0">
                <FloorPlan />
              </div>
              <div className="min-h-0">
                <CampusLifeCarousel />
              </div>
              <div className="row-span-2 min-h-0">
                <CampusMap />
              </div>
              <div className="min-h-0">
                <EventList events={events} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <RssTicker />

      <Footer onAdmin={() => navigate('/admin')} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

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
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}
