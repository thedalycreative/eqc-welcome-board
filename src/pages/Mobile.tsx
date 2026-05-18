import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Flame,
  BriefcaseMedical,
  Coffee,
  BookOpen,
  Calendar,
  Wifi,
  Copy,
  Check,
  Rss,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import type { RoomAllocation } from '../lib/types';
import { getTrainerImagePath } from '../lib/trainers';
import { useRooms, useEvents, useAnnouncements, useGlobalSettings } from '../lib/hooks';
import { useRssTicker } from '../lib/rss';

// --- Room card ---

const MobileRoomCard = ({ room }: { room: RoomAllocation }) => {
  const isLive = room.status === 'live';
  const isBreak = room.status === 'break';
  const isInactive = room.status === 'inactive';

  return (
    <div
      className={`p-4 rounded-2xl border ${
        isLive ? 'bg-eqc-green text-white border-eqc-green' :
        isBreak ? 'bg-orange-500 text-white border-orange-500' :
        isInactive ? 'bg-gray-200 text-gray-500 border-gray-200' :
        'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <h3 className="font-bold font-display text-lg truncate max-w-[180px]">{room.roomName}</h3>
        <div className="flex-1" />
        {isLive && <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full">Live</span>}
        {isBreak && <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Coffee size={10} /> Break</span>}
        {isInactive && <span className="text-[10px] font-black tracking-widest uppercase">Signed off</span>}
      </div>

      {(isLive || isBreak || isInactive) && room.trainer ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-white/30 shrink-0">
              <img src={getTrainerImagePath(room.trainer)} alt={room.trainer} className="w-full h-full object-cover object-top" />
            </div>
            <span className="font-bold text-sm">{room.trainer}</span>
            {room.intake && <span className="text-xs opacity-80">· {room.intake}</span>}
          </div>
          {room.course && <p className="text-xs font-bold opacity-90">{room.course}</p>}
          {room.topic && (
            <p className="text-xs italic opacity-75 flex items-center gap-1 mt-1">
              <BookOpen size={11} /> {room.topic}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm italic opacity-60">Available for study</p>
      )}
    </div>
  );
};

// --- WiFi card with copy ---

const WifiCard = ({ ssid, password }: { ssid: string; password: string }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = async (text: string, field: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wifi size={18} className="text-eqc-green" />
        <h3 className="font-display font-bold">Campus WiFi</h3>
      </div>
      <div className="space-y-2">
        <button onClick={() => copy(ssid, 'SSID')} className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">SSID</p>
            <p className="font-mono text-sm font-bold">{ssid || '—'}</p>
          </div>
          {copiedField === 'SSID' ? <Check size={16} className="text-eqc-green" /> : <Copy size={16} className="text-gray-400" />}
        </button>
        {password && (
          <button onClick={() => copy(password, 'Password')} className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Password</p>
              <p className="font-mono text-sm font-bold">{password}</p>
            </div>
            {copiedField === 'Password' ? <Check size={16} className="text-eqc-green" /> : <Copy size={16} className="text-gray-400" />}
          </button>
        )}
      </div>
    </div>
  );
};

// --- RSS list (collapsible) ---

const RssList = () => {
  const items = useRssTicker(10);
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(e => !e)} className="w-full p-4 flex items-center gap-2 text-left">
        <Rss size={18} className="text-eqc-green" />
        <h3 className="font-display font-bold flex-1">News headlines</h3>
        <span className="text-xs text-gray-400">{items.length}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {items.slice(0, 10).map(item => (
                <a
                  key={item.link}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-3 hover:bg-gray-50"
                >
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

// --- Mobile Page ---

export default function Mobile() {
  const [rooms] = useRooms();
  const [events] = useEvents();
  const announcements = useAnnouncements();
  const [settings] = useGlobalSettings();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Toaster position="bottom-center" />

      <header className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/eqc-logo.png" alt="EQC" className="h-9 w-auto object-contain" />
            <div>
              <h1 className="font-display font-bold text-lg leading-none">EQC Perth</h1>
              <p className="text-[10px] text-gray-500">Campus dashboard</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-700 tabular-nums">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
            <p className="text-[10px] text-gray-400">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-5">
        {/* Alerts banner */}
        {announcements.length > 0 && (
          <div className="bg-eqc-green text-white rounded-2xl p-4 space-y-2">
            {announcements.map(ann => (
              <p key={ann.id} className="font-bold text-sm leading-tight">{ann.text}</p>
            ))}
          </div>
        )}

        {/* Rooms */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Today's rooms</h2>
          <div className="space-y-3">
            {rooms.map(room => <MobileRoomCard key={room.id} room={room} />)}
          </div>
        </section>

        {/* Upcoming Events */}
        {events.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Upcoming events</h2>
            <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
              {events.slice(0, 3).map(event => (
                <div key={event.id} className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-eqc-green/10 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar size={18} className="text-eqc-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-eqc-green">
                      {new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <h3 className="font-display font-bold text-base leading-tight mt-0.5">{event.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                  </div>
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
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Contacts</h2>
            <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
              {settings.contacts.map((c, idx) => (
                <div key={idx} className="p-4">
                  <h3 className="font-bold text-sm">{c.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{c.role}</p>
                  <div className="flex flex-wrap gap-2">
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-xs text-eqc-green flex items-center gap-1 bg-eqc-green/10 px-2 py-1 rounded-lg">
                        <Mail size={12} /> {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-xs text-eqc-green flex items-center gap-1 bg-eqc-green/10 px-2 py-1 rounded-lg">
                        <Phone size={12} /> {c.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* RSS */}
        <RssList />

        {/* Campus info footer */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Campus info</h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-red-500 shrink-0" />
              <span>2 Gordon St, West Perth WA 6005</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-eqc-green shrink-0" />
              <a href="tel:1800338883" className="text-eqc-green">1800 338 883</a>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-eqc-green shrink-0" />
              <a href="mailto:team@equinimcollege.com" className="text-eqc-green">team@equinimcollege.com</a>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-orange-500 shrink-0" />
              <span>Fire Assembly: Coolgardie St</span>
            </div>
            <div className="flex items-center gap-2">
              <BriefcaseMedical size={14} className="text-red-500 shrink-0" />
              <span>First Aid: Kitchen</span>
            </div>
          </div>
        </section>

        <div className="text-center pt-2">
          <p className="text-[10px] text-gray-400">RTO 45758 · CRICOS 03952E</p>
          <Link to="/" className="text-xs text-gray-500 hover:text-eqc-green inline-flex items-center gap-1 mt-2">
            <ExternalLink size={11} /> View lobby dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
