import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Phone, Mail, Flame, BriefcaseMedical, Coffee, BookOpen,
  Calendar, Wifi, Copy, Check, Rss, ExternalLink, ChevronDown,
  ChevronUp, Home, ClipboardCheck, Map,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import type { RoomAllocation } from '../lib/types';
import { getTrainerImagePath } from '../lib/trainers';
import { useRooms, useEvents, useAnnouncements, useGlobalSettings } from '../lib/hooks';
import { useRssTicker } from '../lib/rss';

const CAMPUS_MAP_URL = 'https://maps.google.com/maps?q=2+Gordon+St+West+Perth+WA+6005&t=&z=16&ie=UTF8&iwloc=&output=embed';

const MobileRoomCard: React.FC<{ room: RoomAllocation }> = ({ room }) => {
  const isLive = room.status === 'live';
  const isBreak = room.status === 'break';
  const isInactive = room.status === 'inactive';
  const num = parseInt(room.roomName.replace('Room ', ''));
  const label = !isNaN(num) ? `R${num}` : room.roomName;

  if (!isLive && !isBreak && !isInactive) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl">
        <span className="text-xs font-bold text-gray-400 w-8">{label}</span>
        <span className="text-xs text-gray-400 italic">Available</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
      isLive ? 'bg-eqc-green text-white border-eqc-green' :
      isBreak ? 'bg-orange-500 text-white border-orange-500' :
      'bg-gray-200 text-gray-500 border-gray-200'
    }`}>
      <span className="text-xs font-bold w-8 shrink-0">{label}</span>
      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/20 border border-white/30 shrink-0">
        <img src={getTrainerImagePath(room.trainer)} alt={room.trainer || ''} className="w-full h-full object-cover object-top" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{room.trainer}{room.intake ? ` · ${room.intake}` : ''}</p>
        {room.course && <p className="text-[10px] opacity-80 truncate">{room.course}</p>}
      </div>
      {isBreak && <Coffee size={12} className="shrink-0 opacity-80" />}
    </div>
  );
};

const WifiCard = ({ ssid, password }: { ssid: string; password: string }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copy = async (text: string, field: string) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopiedField(field); toast.success(`${field} copied`); setTimeout(() => setCopiedField(null), 2000); }
    catch { toast.error('Copy failed'); }
  };
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wifi size={16} className="text-eqc-green" />
        <h3 className="font-bold text-sm">Campus WiFi</h3>
      </div>
      <div className="space-y-2">
        <button onClick={() => copy(ssid, 'SSID')} className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">SSID</p>
            <p className="font-mono text-sm font-bold">{ssid || '—'}</p>
          </div>
          {copiedField === 'SSID' ? <Check size={14} className="text-eqc-green" /> : <Copy size={14} className="text-gray-400" />}
        </button>
        {password && (
          <button onClick={() => copy(password, 'Password')} className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Password</p>
              <p className="font-mono text-sm font-bold">{password}</p>
            </div>
            {copiedField === 'Password' ? <Check size={14} className="text-eqc-green" /> : <Copy size={14} className="text-gray-400" />}
          </button>
        )}
      </div>
    </div>
  );
};

const RssList = () => {
  const items = useRssTicker(10);
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full p-3 flex items-center gap-2 text-left">
        <Rss size={16} className="text-eqc-green" />
        <h3 className="font-bold text-sm flex-1">News</h3>
        <span className="text-xs text-gray-400">{items.length}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {items.slice(0, 10).map(item => (
                <a key={item.link} href={item.link} target="_blank" rel="noreferrer" className="block p-3 hover:bg-gray-50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-eqc-green mb-0.5">{item.source}</p>
                  <p className="text-xs leading-snug line-clamp-2">{item.title}</p>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Mobile() {
  const [rooms] = useRooms();
  const [events] = useEvents();
  const announcements = useAnnouncements();
  const [settings] = useGlobalSettings();
  const [now, setNow] = useState(new Date());

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  const todayKey = new Date().toDateString();
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter(e => new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, todayKey]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Toaster position="bottom-center" />

      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/eqc-sheild.png" alt="EQC Institute" className="w-8 h-8 object-contain shrink-0" />
            <div>
              <h1 className="font-bold text-base leading-none">EQC Perth</h1>
              <p className="text-[10px] text-gray-500">Campus companion</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-700 tabular-nums">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
            <p className="text-[10px] text-gray-400">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {/* Alerts */}
        {announcements.length > 0 && (
          <div className="bg-eqc-green text-white rounded-2xl p-3 space-y-1">
            {announcements.map(ann => (
              <p key={ann.id} className="font-bold text-xs leading-tight">{ann.text}</p>
            ))}
          </div>
        )}

        {/* Campus info (moved to top) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-red-500 shrink-0" />
            <span>2 Gordon St, West Perth WA 6005</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="tel:1800338883" className="text-eqc-green flex items-center gap-1.5"><Phone size={13} /> 1800 338 883</a>
            <a href="mailto:team@equinimcollege.com" className="text-eqc-green flex items-center gap-1.5"><Mail size={13} /> Email</a>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="flex items-center gap-1.5"><Flame size={13} className="text-orange-500" /> Fire: Coolgardie St</span>
            <span className="flex items-center gap-1.5"><BriefcaseMedical size={13} className="text-red-500" /> First Aid: Kitchen</span>
          </div>
        </div>

        {/* Google Map */}
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <iframe src={CAMPUS_MAP_URL} className="w-full h-40" style={{ border: 0 }} allowFullScreen loading="lazy" title="Campus location" />
        </div>

        {/* Rooms (compact) */}
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Rooms</h2>
          <div className="space-y-1.5">
            {rooms.map(room => <MobileRoomCard key={room.id} room={room} />)}
          </div>
        </section>

        {/* Upcoming Events (horizontal scroll) */}
        {upcomingEvents.length > 0 && (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Upcoming Events</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1 scrollbar-hide">
              {upcomingEvents.slice(0, 6).map(event => (
                <div key={event.id} className="min-w-[200px] max-w-[220px] shrink-0 snap-start bg-white border border-gray-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-eqc-green">
                    {new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <h3 className="font-bold text-sm leading-tight mt-1">{event.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WiFi */}
        <WifiCard ssid={settings.wifiSsid || 'EQC-network'} password={settings.wifiPassword} />

        {/* Contacts */}
        {settings.contacts.length > 0 && (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Contacts</h2>
            <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
              {settings.contacts.map((c, idx) => (
                <div key={idx} className="p-3">
                  <h3 className="font-bold text-sm">{c.name}</h3>
                  <p className="text-[10px] text-gray-500 mb-1.5">{c.role}</p>
                  <div className="flex flex-wrap gap-2">
                    {c.email && <a href={`mailto:${c.email}`} className="text-[10px] text-eqc-green flex items-center gap-1 bg-eqc-green/10 px-2 py-1 rounded-lg"><Mail size={10} /> {c.email}</a>}
                    {c.phone && <a href={`tel:${c.phone}`} className="text-[10px] text-eqc-green flex items-center gap-1 bg-eqc-green/10 px-2 py-1 rounded-lg"><Phone size={10} /> {c.phone}</a>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RSS */}
        <RssList />

        <p className="text-center text-[10px] text-gray-400 pt-1">RTO 45758 · CRICOS 03952E</p>
      </main>

      {/* Fixed bottom nav with icon buttons */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex items-center justify-around py-2 z-50 safe-bottom">
        <a href="/" className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-eqc-green">
          <Home size={20} />
          <span className="text-[9px] font-bold">Lobby</span>
        </a>
        <a href="/trainer-sign-on" className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-eqc-green">
          <ClipboardCheck size={20} />
          <span className="text-[9px] font-bold">Sign On</span>
        </a>
        <a href="https://maps.google.com/?q=2+Gordon+St+West+Perth+WA+6005" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-0.5 px-4 py-1 text-gray-500 hover:text-eqc-green">
          <Map size={20} />
          <span className="text-[9px] font-bold">Map</span>
        </a>
      </nav>
    </div>
  );
}
