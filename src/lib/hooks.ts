import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type {
  RoomAllocation,
  Event,
  StaffMember,
  Announcement,
  Trainer,
  CarouselItem,
  SignOnLogEntry,
  RssFeed,
  GlobalSettings,
} from './types';
import { DEFAULT_SETTINGS } from './types';

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export function useRooms(initialRooms: RoomAllocation[] = []) {
  const [rooms, setRooms] = useState<RoomAllocation[]>(initialRooms);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => d.data() as RoomAllocation);
        data.sort((a, b) => a.id - b.id);
        setRooms(data);
      }
    });
    return unsub;
  }, []);

  return [rooms, setRooms] as const;
}

export function useEvents(initialEvents: Event[] = []) {
  const [events, setEvents] = useState<Event[]>(initialEvents);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'events'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as Event);
      data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(data);
    });
    return unsub;
  }, []);

  return [events, setEvents] as const;
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as StaffMember);
      setStaff(data);
    });
    return unsub;
  }, []);

  return staff;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as Announcement);
      setAnnouncements(data.filter(a => new Date(a.expiresAt) > new Date()));
    });
    return unsub;
  }, []);

  return announcements;
}

export function useTrainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'trainers'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as Trainer);
      setTrainers(data);
    });
    return unsub;
  }, []);

  return trainers;
}

export function useCarousel() {
  const [items, setItems] = useState<CarouselItem[]>([]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'carousel'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as CarouselItem);
      data.sort((a, b) => a.order - b.order);
      setItems(data);
    });
    return unsub;
  }, []);

  return items;
}

export function useSignOnLog() {
  const [entries, setEntries] = useState<SignOnLogEntry[]>([]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'signOnLog'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as SignOnLogEntry);
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEntries(data);
    });
    return unsub;
  }, []);

  return entries;
}

export function useRssFeeds() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(collection(db, 'rssFeeds'), (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as RssFeed);
      setFeeds(data);
    });
    return unsub;
  }, []);

  return feeds;
}

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (IS_DEMO_MODE) return;
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as GlobalSettings);
      }
    });
    return unsub;
  }, []);

  const update = async (patch: Partial<GlobalSettings>) => {
    if (IS_DEMO_MODE) return;
    const current = await getDoc(doc(db, 'settings', 'global'));
    const merged = { ...DEFAULT_SETTINGS, ...(current.data() || {}), ...patch };
    await setDoc(doc(db, 'settings', 'global'), merged, { merge: true });
  };

  return [settings, update] as const;
}

// The dashboard lives in Perth, WA. We anchor the reset to Australia/Perth (UTC+8)
// so it always fires at the configured local hour even if the browser running the
// kiosk is set to UTC or another timezone.
const RESET_TIMEZONE = 'Australia/Perth';

function nowInPerth(): { hour: number; minute: number; second: number; dateKey: string } {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: RESET_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = fmt.formatToParts(new Date());
  const part = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  return {
    hour: parseInt(part('hour'), 10),
    minute: parseInt(part('minute'), 10),
    second: parseInt(part('second'), 10),
    dateKey: `${part('year')}-${part('month')}-${part('day')}`,
  };
}

/**
 * Returns time remaining until the daily reset (default 10pm Perth time).
 */
export function useResetCountdown(resetHour: number = 22) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const perth = nowInPerth();
  const nowSeconds = perth.hour * 3600 + perth.minute * 60 + perth.second;
  const targetSeconds = resetHour * 3600;
  let remaining = targetSeconds - nowSeconds;
  if (remaining <= 0) remaining += 86400;
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Writes a reset entry to the signOnLog collection so admins can see when
 * (and by what) the dashboard was wiped. Source distinguishes auto vs manual.
 */
export async function writeResetLog(source: 'auto' | 'manual', roomsAffected: number) {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'signOnLog', id), {
      id,
      trainerName: source === 'auto' ? 'System (auto-reset)' : 'Admin (manual reset)',
      roomNumber: 'All',
      intakeNumber: '—',
      course: source === 'auto'
        ? `Daily reset — ${roomsAffected} room${roomsAffected === 1 ? '' : 's'} cleared`
        : `Manual reset — ${roomsAffected} room${roomsAffected === 1 ? '' : 's'} cleared`,
      action: 'reset',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to write reset log:', err);
  }
}

/**
 * Automatically resets all rooms to "available" once the daily reset hour is reached
 * in Perth (Australia/Perth, UTC+8). Checks every 30 seconds; uses localStorage to
 * prevent duplicate resets on the same Perth day. Also catches up on missed resets
 * when the page loads on a new day.
 */
export function useAutoReset(resetHour: number) {
  useEffect(() => {
    if (IS_DEMO_MODE) return;

    const check = async () => {
      const perth = nowInPerth();
      const today = perth.dateKey;
      const lastReset = localStorage.getItem('eqc-last-reset-date');
      if (lastReset === today) return;

      // First-ever run: wait until the reset hour rolls around before wiping anything.
      if (!lastReset && perth.hour < resetHour) return;

      // We have a previous reset but it's from an earlier day, and we're already
      // past the reset hour today — fall through and reset normally. If we're
      // before the reset hour, treat it as a missed-reset catch-up and also fall
      // through. Either way, we proceed below.

      const snapshot = await getDocs(collection(db, 'rooms'));
      for (const d of snapshot.docs) {
        const room = d.data() as RoomAllocation;
        await setDoc(doc(db, 'rooms', d.id), {
          id: room.id,
          roomName: room.roomName,
          status: 'available',
        });
      }
      await writeResetLog('auto', snapshot.size);
      localStorage.setItem('eqc-last-reset-date', today);
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [resetHour]);
}
