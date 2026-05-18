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

/**
 * Returns time remaining until the daily reset (default 10pm).
 */
export function useResetCountdown(resetHour: number = 22) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(now);
  target.setHours(resetHour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  const ms = target.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Automatically resets all rooms to "available" once the daily reset hour is reached.
 * Checks every 30 seconds; uses localStorage to prevent duplicate resets on the same day.
 */
export function useAutoReset(resetHour: number) {
  useEffect(() => {
    if (IS_DEMO_MODE) return;

    const check = async () => {
      const now = new Date();
      // Calculate the timestamp of the last reset deadline (e.g., today at 10 PM, or yesterday at 10 PM)
      const lastResetDeadline = new Date(now);
      lastResetDeadline.setHours(resetHour, 0, 0, 0);
      if (now.getTime() < lastResetDeadline.getTime()) {
        lastResetDeadline.setDate(lastResetDeadline.getDate() - 1);
      }
      
      const lastResetStr = localStorage.getItem('eqc-last-reset-time');
      if (lastResetStr && Number(lastResetStr) === lastResetDeadline.getTime()) return;

      const snapshot = await getDocs(collection(db, 'rooms'));
      for (const d of snapshot.docs) {
        const room = d.data() as RoomAllocation;
        await setDoc(doc(db, 'rooms', d.id), {
          id: room.id,
          roomName: room.roomName,
          status: 'available',
        });
      }
      localStorage.setItem('eqc-last-reset-time', lastResetDeadline.getTime().toString());
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [resetHour]);
}
