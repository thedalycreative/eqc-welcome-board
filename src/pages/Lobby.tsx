import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Maximize,
  Minimize,
  Coffee,
  Train,
  CalendarDaysIcon,
  MapPinCheckInside,
  Wifi,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

import type { RoomAllocation, Event, Announcement, Trainer, FooterItem, NearbyPlace } from '../lib/types';
import { DEFAULT_FOOTER_ITEMS, DEFAULT_NEARBY_PLACES } from '../lib/types';
import { getTrainerImagePath } from '../lib/trainers';
import { useRooms, useEvents, useAnnouncements, useCarousel, useGlobalSettings, useAutoReset, useTrainers } from '../lib/hooks';
import { useRssTicker } from '../lib/rss';
import { Rss } from 'lucide-react';
import { getLucideIcon, EventIcon } from '../lib/eventIcons';
import { getReadableTextColor, getAccentTextColor } from '../lib/colors';

const MOBILE_REDIRECT_DISMISSED_KEY = 'eqc-mobile-redirect-dismissed';

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const INITIAL_ROOMS: RoomAllocation[] = IS_DEMO_MODE
  ? [
      { id: 1, roomName: 'Room 1', status: 'live', course: 'ICT40120 - Cert IV in Cyber Security', trainer: 'Tim', intake: '25.G', topic: 'Network Defence' },
      { id: 2, roomName: 'Room 2', status: 'live', course: 'ICT50220 - Dip of IT', trainer: 'Saxon', intake: '26.B', topic: 'Cloud Architecture' },
      { id: 3, roomName: 'Room 3', status: 'break', course: 'ICT40120 - Cert IV in Cyber Security', trainer: 'Sarah', intake: '25.F', topic: 'Ethical Hacking', breakUntil: new Date(Date.now() + 15 * 60000).toISOString() },
      { id: 4, roomName: 'Room 4', status: 'live', course: 'BSB50120 - Dip of Business', trainer: 'Emma', intake: '25.G', topic: 'Service Excellence' },
      { id: 5, roomName: 'Room 5', status: 'live', course: 'ICT30120 - Cert III in IT', trainer: 'Nobody Special', intake: '26.A', topic: 'Intro to Programming' },
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
  { id: 1, title: 'Term 2 Starts', date: '2026-04-20', description: 'Welcome back — new term, new opportunities ahead.', icon: 'GraduationCap' },
  { id: 2, title: 'Campus Tour', date: '2026-04-01', description: 'Join us for a guided tour of our state-of-the-art facilities.', icon: 'Users' },
  { id: 3, title: 'Student Workshop', date: '2026-04-10', description: 'A deep dive into professional development and networking.', icon: 'Lightbulb' },
];

// --- Helpers ---

function formatRoomDisplayName(roomName: string): string {
  // Convert "Room 1" → "Classroom 1" on the lobby; leave anything else as-is.
  const m = roomName.match(/^Room\s+(\d+)$/i);
  return m ? `Classroom ${m[1]}` : roomName;
}

function formatBreakRemaining(breakUntil?: string): string | null {
  if (!breakUntil) return null;
  const target = new Date(breakUntil).getTime();
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const minutes = Math.ceil(ms / 60000);
  return minutes === 1 ? '1 min' : `${minutes} min`;
}

// --- Header ---

const Header = () => {
  const [time, setTime] = useState(new Date());
  const [settings] = useGlobalSettings();

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
    <header className="bg-white border-b border-gray-100 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm">
      <div className="flex items-center gap-6">
        <img src="/images/eqc-sheild.png" alt="EQC Institute" className="w-14 h-14 object-contain shrink-0" />
        <div>
          <h1 className="text-2xl font-bold serif text-eqc-text tracking-tight leading-none">Welcome to Equinim College</h1>
          <p className="text-lg text-eqc-muted font-medium mt-1">Perth Campus</p>
        </div>
        {settings.wifiSsid && (
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
            <Wifi size={14} className="text-eqc-green" />
            <span className="text-xs font-bold text-eqc-muted">{settings.wifiSsid}</span>
            {settings.wifiPassword && (
              <>
                <div className="w-px h-3 bg-gray-300 mx-1" />
                <span className="text-xs text-eqc-muted">{settings.wifiPassword}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-right shrink min-w-0">
        <div className="flex items-center gap-3 bg-gray-50 px-4 h-14 rounded-xl border border-gray-100 shrink-0">
          <span className="text-sm font-bold text-eqc-muted tracking-tight whitespace-nowrap">{formattedDate}</span>
          <div className="w-px h-8 bg-gray-300" />
          <div className="flex items-baseline gap-1 w-[130px] justify-end tabular-nums">
            <span className="text-2xl font-bold text-eqc-text tracking-tight leading-none tabular-nums">{formattedTime.split(' ')[0]}</span>
            <span className="text-xs font-bold text-eqc-muted uppercase leading-none w-6 text-left">{formattedTime.split(' ')[1]}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

// --- Room Item ---

const RoomItem: React.FC<{ room: RoomAllocation; trainers: Trainer[] }> = ({ room, trainers }) => {
  const isLive = room.status === 'live';
  const isBreak = room.status === 'break';
  const isInactive = room.status === 'inactive';
  const isAvailable = room.status === 'available';
  const hasContent = isLive || isBreak || isInactive;
  const matchedTrainer = useMemo(
    () => trainers.find(t => t.name.toLowerCase() === (room.trainer || '').toLowerCase()),
    [trainers, room.trainer]
  );
  const trainerImg = matchedTrainer?.photoUrl || getTrainerImagePath(room.trainer);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!isBreak) return;
    const id = setInterval(() => forceTick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, [isBreak]);

  const breakRemaining = isBreak ? formatBreakRemaining(room.breakUntil) : null;
  const displayName = formatRoomDisplayName(room.roomName);

  // Tile background: live → WHITE w/ green accents, available → LIGHT GREEN, break → orange, inactive → grey.
  const tileClass = isLive
    ? 'bg-white text-eqc-text border border-eqc-green/40 shadow-xl ring-1 ring-eqc-green/20'
    : isBreak
      ? 'bg-orange-500 text-white shadow-lg'
      : isInactive
        ? 'bg-gray-200 text-gray-500 shadow-sm'
        : 'bg-green-50 text-green-700 border border-green-200 shadow-sm';

  const numberPillClass = isLive
    ? 'bg-eqc-green/10 text-eqc-green'
    : isBreak
      ? 'bg-white/20 text-white'
      : isInactive
        ? 'bg-gray-100 text-gray-500'
        : 'bg-white text-green-700';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-row items-center justify-between px-5 py-3 rounded-2xl transition-all cursor-default flex-1 ${tileClass}`}
    >
      <div className="flex flex-row items-center gap-3">
        <div className={`min-w-[10rem] h-12 rounded-full flex items-center justify-center shrink-0 px-4 ${numberPillClass}`}>
          <span className="font-sans font-bold text-lg leading-[0] translate-y-px whitespace-nowrap">{displayName}</span>
        </div>
        {hasContent && room.trainer ? (
          <>
            <div className={`w-[3.5rem] h-[3.5rem] rounded-full overflow-hidden border-[3px] shrink-0 bg-white ${
              isLive ? 'border-eqc-green/40' : isInactive ? 'border-gray-300' : 'border-white/40'
            }`}>
              <img src={trainerImg} alt={room.trainer} className="w-full h-full object-cover object-top" />
            </div>
            <span className={`font-sans font-bold text-3xl leading-none ${isLive ? 'text-eqc-text' : ''}`}>{room.trainer}</span>
          </>
        ) : isBreak ? (
          <>
            <Coffee size={24} />
            <span className="font-sans font-semibold text-xl leading-none italic">On Break</span>
          </>
        ) : isAvailable ? (
          <span className="font-sans text-base leading-none italic">Available for study</span>
        ) : (
          <span className="font-sans text-base leading-none italic opacity-80">—</span>
        )}
      </div>

      <div className="flex items-center gap-5">
        {hasContent && (room.course || room.topic) && (
          <div className="flex flex-col items-end gap-0.5 text-right">
            {room.course && (
              <span className={`font-sans text-[10px] font-bold uppercase tracking-widest truncate max-w-[260px] ${
                isLive ? 'text-eqc-muted' : isBreak ? 'text-white/70' : isInactive ? 'text-gray-400' : 'text-eqc-muted'
              }`}>
                {room.course}
              </span>
            )}
            {room.topic && (
              <span className={`font-sans text-xs font-bold truncate max-w-[260px] ${
                isLive ? 'text-eqc-text' : isBreak ? 'text-white/90' : isInactive ? 'text-gray-500' : 'text-eqc-text'
              }`}>
                {room.topic}
              </span>
            )}
          </div>
        )}
        {hasContent && room.intake && (
          <span className={`font-sans font-black text-5xl leading-none uppercase tracking-tight ${
            isLive ? 'text-eqc-green' : isBreak ? 'text-white' : isInactive ? 'text-gray-500' : 'text-eqc-text'
          }`}>
            {room.intake}
          </span>
        )}
        {isLive && (
          <div className="flex items-center gap-1.5 bg-eqc-green text-white px-3 py-1.5 rounded-full border border-eqc-green/30 shrink-0">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            <span className="text-xs font-black tracking-widest uppercase">LIVE</span>
          </div>
        )}
        {isBreak && (
          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full border border-white/30 shrink-0">
            <Coffee size={14} />
            <span className="text-sm font-black tracking-wider uppercase tabular-nums">{breakRemaining || 'BREAK'}</span>
          </div>
        )}
        {isInactive && (
          <span className="text-xs font-black tracking-widest uppercase opacity-70">Signed off</span>
        )}
      </div>
    </motion.div>
  );
};

// --- Event List ---

const EVENT_INTERVAL_MS = 30000;

const EventList = ({ events }: { events: Event[] }) => {
  const todayKey = new Date().toDateString();
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, todayKey]);

  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (upcomingEvents.length <= 1) return;
    setCurrentIdx((idx) => (idx >= upcomingEvents.length ? 0 : idx));
    const timer = setInterval(() => {
      setCurrentIdx((idx) => (idx + 1) % upcomingEvents.length);
    }, EVENT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [upcomingEvents.length]);

  const currentEvent = upcomingEvents[currentIdx];

  return (
    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <CalendarDaysIcon size={16} className="text-eqc-green" />
          <h2 className="text-sm font-display font-bold">Upcoming Events</h2>
        </div>
        {upcomingEvents.length > 1 && (
          <div className="flex items-center gap-1">
            {upcomingEvents.map((_, idx) => (
              <div key={idx} className={`h-1 rounded-full transition-all ${idx === currentIdx ? 'bg-eqc-green w-4' : 'bg-gray-200 w-1'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 relative">
        {upcomingEvents.length === 0 ? (
          <p className="text-eqc-muted italic text-xs">No upcoming events.</p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-2.5 border-l-3 border-eqc-green pl-3"
            >
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0 mt-0.5 text-eqc-green">
                <EventIcon name={currentEvent.icon} size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-eqc-green uppercase tracking-widest mb-1">
                  {new Date(currentEvent.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {currentEvent.time && <span className="ml-1 text-eqc-muted">· {currentEvent.time}</span>}
                </p>
                <h3 className="text-sm font-display font-bold text-eqc-text leading-tight mb-0.5">{currentEvent.title}</h3>
                <p className="text-[11px] text-eqc-muted leading-snug line-clamp-2">{currentEvent.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 text-[9px] text-eqc-muted shrink-0 flex justify-between items-center">
        <span>Questions? <span className="text-eqc-green font-bold">trainer@equinimcollege.com</span></span>
        {upcomingEvents.length > 1 && <span className="font-bold tracking-wider uppercase">{currentIdx + 1} / {upcomingEvents.length}</span>}
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
    a.setAttribute('data-label_1', '');
    a.setAttribute('data-label_2', '');
    a.setAttribute('data-theme', 'pure');
    a.setAttribute('data-days', '2');
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
  return (
    <div ref={ref}
      className="overflow-hidden rounded-xl h-16 w-[min(380px,30vw)] shrink-0 weather-widget-scale"
    />
  );
};

// --- Campus Map ---

const NEARBY_CATEGORY_META: Record<NearbyPlace['category'], { icon: typeof Coffee; title: string; tone: string }> = {
  cafe:      { icon: Coffee, title: 'Cafes & Shopping', tone: 'text-eqc-green' },
  transport: { icon: Train,  title: 'Public Transport', tone: 'text-blue-600' },
  other:     { icon: MapPin, title: 'Other',            tone: 'text-purple-600' },
};

const CampusMap = ({ places }: { places: NearbyPlace[] }) => {
  const grouped = useMemo(() => {
    const out: Record<NearbyPlace['category'], NearbyPlace[]> = { cafe: [], transport: [], other: [] };
    for (const p of places) out[p.category]?.push(p);
    return out;
  }, [places]);

  const visibleGroups = (Object.keys(NEARBY_CATEGORY_META) as NearbyPlace['category'][])
    .filter(cat => grouped[cat] && grouped[cat].length > 0);

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <MapPin size={18} className="text-eqc-green" />
        <h2 className="text-lg font-display font-bold">Campus & Nearby</h2>
      </div>
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
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

        {visibleGroups.length > 0 && (
          <div className={`flex-[2] grid ${visibleGroups.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
            {visibleGroups.slice(0, 2).map((cat) => {
              const meta = NEARBY_CATEGORY_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1 ${meta.tone}`}>
                    <Icon size={11} /> {meta.title}
                  </h3>
                  <ul className="text-xs space-y-1 font-medium">
                    {grouped[cat].slice(0, 4).map((p) => (
                      <li key={p.id} className="flex justify-between gap-2">
                        <span className="truncate">{p.name}</span>
                        {typeof p.walkMinutes === 'number' && (
                          <span className="text-eqc-muted shrink-0">{p.walkMinutes}m</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
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
    const currentDuration = items[idx]?.durationMs ?? settings.carouselSlideDurationMs;
    const id = setTimeout(() => {
      setIdx(i => (i + 1) % items.length);
    }, currentDuration);
    return () => clearTimeout(id);
  }, [items, idx, settings.carouselSlideDurationMs]);

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg h-full flex flex-col items-center justify-center text-center p-4">
        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2">
          <MapPinCheckInside size={20} className="text-gray-300" />
        </div>
        <h3 className="text-base font-display font-bold leading-tight">Campus Life</h3>
        <p className="text-xs text-eqc-muted mt-1 max-w-[200px]">Photos appear here as they're added in the admin panel.</p>
      </div>
    );
  }

  const current = items[idx];
  const nextIdx = (idx + 1) % items.length;
  const next = items[nextIdx];
  const transition = settings.carouselTransition;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden h-full flex flex-col">
      <div className="flex-1 relative bg-gray-50 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {(() => {
            const variants = TRANSITION_VARIANTS[transition] || TRANSITION_VARIANTS.slide;
            return (
              <motion.img
                key={current.id}
                src={current.imageUrl}
                alt={current.caption || 'Campus life'}
                loading="lazy"
                decoding="async"
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={variants.transition}
                className="absolute inset-0 w-full h-full object-cover"
              />
            );
          })()}
        </AnimatePresence>
        {/* Hidden preloader for the next slide so the swap is instant. */}
        {next && next.id !== current.id && (
          <img src={next.imageUrl} alt="" aria-hidden className="hidden" loading="eager" decoding="async" />
        )}
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

// motion variants per transition style
const TRANSITION_VARIANTS = {
  slide:     { initial: { x: '100%', opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: '-100%', opacity: 0 }, transition: { duration: 1, ease: 'easeInOut' as const } },
  fade:      { initial: { opacity: 0 },             animate: { opacity: 1 },       exit: { opacity: 0 },             transition: { duration: 0.8 } },
  crossfade: { initial: { opacity: 0, scale: 1.02 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.98 }, transition: { duration: 1.1, ease: 'easeOut' as const } },
  zoom:      { initial: { opacity: 0, scale: 1.15 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 }, transition: { duration: 0.9 } },
  kenburns:  { initial: { opacity: 0, scale: 1.0 },  animate: { opacity: 1, scale: 1.08 }, exit: { opacity: 0, scale: 1.12 }, transition: { duration: 8, ease: 'linear' as const } },
};

// --- RSS Ticker ---

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
  const bg = settings.rssRibbonColor || '#1a3a2a';
  const textColor = getReadableTextColor(bg);
  const accent = getAccentTextColor(bg);

  return (
    <div className="backdrop-blur-sm border-b border-white/10 py-3 overflow-hidden shrink-0 group" style={{ backgroundColor: bg, color: textColor }}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 shrink-0 px-4 border-r border-white/20">
          <Rss size={18} style={{ color: accent }} />
          <span className="text-sm font-black uppercase tracking-widest" style={{ color: textColor }}>News</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            className="flex whitespace-nowrap items-center gap-12 animate-rss-marquee group-hover:[animation-play-state:paused]"
            style={{ animationDuration: `${duration}s` }}
          >
            {[...items, ...items].map((item, idx) => (
              <span key={`${item.link}-${idx}`} className="text-lg flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: accent }}>{item.source}</span>
                <span className="opacity-95" style={{ color: textColor }}>{item.title}</span>
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

// --- Floor Plan ---

const FloorPlan = () => {
  const [settings] = useGlobalSettings();
  const imageUrl = settings.floorPlan?.imageUrl || '/images/eqc-campus-layout.svg';
  const animate = settings.floorPlan?.hoverAnimation ?? true;
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-lg flex flex-col overflow-hidden h-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <MapPinCheckInside size={18} className="text-eqc-green" />
        <h2 className="text-lg font-display font-bold">Campus Map</h2>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 relative flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Campus Floor Plan"
          className={`w-full h-full object-cover ${animate ? 'animate-float' : ''}`}
          referrerPolicy="no-referrer"
        />
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          .animate-float { animation: float 4s ease-in-out infinite; }
        `}</style>
      </div>
    </div>
  );
};

// --- Footer ---

const Footer = ({ items }: { items: FooterItem[] }) => {
  const mobileUrl = typeof window !== 'undefined' ? `${window.location.origin}/mobile` : '';
  return (
    <footer className="bg-white border-t border-gray-100 px-6 py-1.5 flex justify-between items-center text-[11px] text-eqc-muted shrink-0 gap-3">
      <div className="flex items-center gap-x-5 gap-y-1 flex-wrap min-w-0">
        {items.map((it) => {
          const Icon = getLucideIcon(it.icon);
          return (
            <div key={it.id} className="flex items-center gap-1.5">
              <Icon size={12} style={{ color: it.iconColor }} />
              <span className="font-medium">{it.text}</span>
            </div>
          );
        })}
      </div>
      <a
        href="/mobile"
        className="flex items-center gap-2 shrink-0"
        aria-label="Mobile view"
        data-allow-dirty="true"
      >
        <span className="text-[10px] text-eqc-muted font-medium leading-tight">Scan for<br />mobile version</span>
        <div className="bg-white border border-gray-200 rounded p-1 shrink-0">
          <QRCodeSVG value={mobileUrl} size={44} />
        </div>
      </a>
    </footer>
  );
};

// --- Announcement Banner ---

const SIZE_CLASSES = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' } as const;
const SPEED_DURATIONS = { slow: 60, medium: 30, fast: 18 } as const;

function announcementsForPlacement(announcements: Announcement[], where: 'top' | 'bottom'): Announcement[] {
  return announcements.filter((ann) => {
    const p = ann.placements;
    // Back-compat: announcements created before placements existed default to top.
    if (!p || (!p.top && !p.bottom)) return where === 'top';
    return p[where] === true;
  });
}

const AnnouncementBanner = ({ announcements }: { announcements: Announcement[] }) => {
  if (announcements.length === 0) return null;

  return (
    <div className="shrink-0 relative z-[60] border-b border-white/10">
      {announcements.map((ann) => {
        const bgHex = ann.bgColor || (ann.color?.startsWith('#') ? ann.color : undefined);
        const bgClass = !bgHex ? (ann.color || 'bg-eqc-green') : '';
        const txtHex = ann.textColor?.startsWith('#') ? ann.textColor : undefined;
        const txtClass = !txtHex ? (ann.textColor || 'text-white') : '';
        const sizeClass = SIZE_CLASSES[ann.textSize || 'md'];
        const duration = SPEED_DURATIONS[ann.scrollSpeed || 'medium'];
        return (
          <div key={ann.id} className={`${bgClass} ${txtClass} overflow-hidden py-2`}
            style={{ ...(bgHex ? { backgroundColor: bgHex } : {}), ...(txtHex ? { color: txtHex } : {}) }}>
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

// --- Mobile Redirect Modal ---

const MobileRedirectModal = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-eqc-muted transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="p-6 sm:p-7 text-center">
          <img src="/images/eqc-sheild.png" alt="EQC Institute" className="mx-auto w-14 h-14 object-contain mb-4" />
          <h2 className="text-xl font-bold text-eqc-text mb-2 leading-tight">
            Best viewed on desktop
          </h2>
          <p className="text-sm text-eqc-muted leading-relaxed mb-6">
            The campus dashboard is built for the lobby screen. On a phone, use the mobile companion view instead.
          </p>
          <a
            href="/mobile.html"
            className="block w-full bg-eqc-green text-white font-bold rounded-xl px-5 py-3.5 text-base hover:bg-eqc-green/90 transition-colors mb-3"
          >
            Open Mobile View
          </a>
          <button
            type="button"
            onClick={onDismiss}
            className="block w-full bg-gray-100 text-gray-700 font-bold rounded-xl px-5 py-3 text-sm hover:bg-gray-200 transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Lobby Page ---

function useFluidRootFontSize() {
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.fontSize;
    root.style.fontSize = 'clamp(11px, 0.85vw, 13px)';
    return () => { root.style.fontSize = prev; };
  }, []);
}

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function Lobby() {
  const [rooms] = useRooms(INITIAL_ROOMS);
  const [events] = useEvents(IS_DEMO_MODE ? DEMO_EVENTS : []);
  const announcements = useAnnouncements();
  const trainers = useTrainers();
  const [settings] = useGlobalSettings();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobileViewport();
  const [showMobileModal, setShowMobileModal] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(MOBILE_REDIRECT_DISMISSED_KEY) !== 'ok';
  });

  useFluidRootFontSize();
  useAutoReset(settings.resetTimeHour);

  const dismissMobileModal = () => {
    sessionStorage.setItem(MOBILE_REDIRECT_DISMISSED_KEY, 'ok');
    setShowMobileModal(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const footerItems = settings.footerItems && settings.footerItems.length > 0
    ? settings.footerItems
    : DEFAULT_FOOTER_ITEMS;

  const nearbyPlaces = settings.nearbyPlaces && settings.nearbyPlaces.length > 0
    ? settings.nearbyPlaces
    : DEFAULT_NEARBY_PLACES;

  const topAnnouncements = useMemo(() => announcementsForPlacement(announcements, 'top'), [announcements]);
  const bottomAnnouncements = useMemo(() => announcementsForPlacement(announcements, 'bottom'), [announcements]);

  return (
    <div className="h-screen w-full flex flex-col font-sans overflow-hidden bg-eqc-bg relative">
      {IS_DEMO_MODE && (
        <div className="fixed bottom-4 left-4 z-50 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg">
          Static Preview · Read Only
        </div>
      )}

      <Header />

      {/* Order: navbar → top alert ribbons → RSS ticker → main content → bottom alert ribbons → footer */}
      <AnnouncementBanner announcements={topAnnouncements} />
      <RssTicker />

      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-50 p-2 bg-white/50 hover:bg-white rounded-full transition-all opacity-0 hover:opacity-100"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>

      <main className="flex-1 flex flex-col p-5 min-h-0 gap-4">
        <div className="flex-1 flex gap-5 min-h-0">
          <div className="flex-[3] flex flex-col min-h-0 min-w-0">
            <div className="flex items-center gap-2.5 h-6 mb-3 shrink-0">
              <div className="w-2 h-2 bg-eqc-green rounded-full shadow-[0_0_12px_rgba(26,122,84,0.8)] animate-pulse" />
              <h2 className="text-lg font-bold serif text-white">Today's Room Allocations</h2>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 pb-2">
              {rooms.map((room) => <RoomItem key={room.id} room={room} trainers={trainers} />)}
            </div>
          </div>

          <div className="flex-[2] shrink-0 flex flex-col min-h-0 min-w-0">
            <div className="h-6 mb-3 shrink-0" />
            <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-[2fr_1.5fr_0.8fr] gap-5">
              <div className="col-span-2 min-h-0">
                <FloorPlan />
              </div>
              <div className="min-h-0">
                <CampusLifeCarousel />
              </div>
              <div className="row-span-2 min-h-0">
                <CampusMap places={nearbyPlaces} />
              </div>
              <div className="min-h-0">
                <EventList events={events} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnnouncementBanner announcements={bottomAnnouncements} />
      <Footer items={footerItems} />

      {isMobile && showMobileModal && (
        <MobileRedirectModal onDismiss={dismissMobileModal} />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

        /* Squeeze the third-party weather iframe so the 2-day forecast fits the chip. */
        .weather-widget-scale { transform-origin: right center; }
        .weather-widget-scale iframe { transform: scale(0.92); transform-origin: right center; width: 110%; height: 110%; }

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
