import { useState, useEffect, useMemo, useRef, FormEvent } from 'react';
import { Plus, Calendar, Clock, Trash2, Edit3, Save, CheckCircle, AlertCircle, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEvents } from '../../lib/hooks';
import type { Event } from '../../lib/types';

const EMOJI_OPTIONS = [
  '🎓', '📅', '🏆', '🎉', '🎤', '📝', '💼', '🎯', '🏅', '⭐',
  '🎭', '🎪', '🎨', '📚', '🤝', '💡', '🔔', '🚀', '🏫', '❤️',
  '🎊', '🎈', '🥇', '📣', '✨', '🌟', '👏', '🎶', '🧑‍🎓', '🏋️',
];

type StatusMsg = { text: string; type: 'success' | 'error' } | null;

function isEventPast(dateStr: string): boolean {
  const eventDate = new Date(dateStr + 'T23:59:59');
  const now = new Date();
  const dayAfter = new Date(eventDate);
  dayAfter.setDate(dayAfter.getDate() + 1);
  return now >= dayAfter;
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-3 border rounded-lg text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <span className="text-xl">{value || '📅'}</span>
        <span className="text-sm text-gray-500">{value ? 'Change icon' : 'Choose an icon'}</span>
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 bg-white border rounded-xl shadow-xl p-3 grid grid-cols-6 gap-1.5 w-64">
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false); }}
              className={`text-xl p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${value === emoji ? 'bg-eqc-green/10 ring-2 ring-eqc-green' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, editingId, editData, setEditingId, setEditData, saveEvent, deleteEvent }: {
  event: Event;
  editingId: number | null;
  editData: Partial<Event>;
  setEditingId: (id: number | null) => void;
  setEditData: (d: Partial<Event>) => void;
  saveEvent: (e: Event) => void;
  deleteEvent: (e: Event) => void;
}) {
  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm">
      {editingId === event.id ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold uppercase mb-1">Title</label>
            <input value={editData.title ?? event.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="w-full p-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Date</label>
            <input type="date" value={editData.date ?? event.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className="w-full p-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1">Icon</label>
            <EmojiPicker value={editData.icon ?? event.icon ?? ''} onChange={(v) => setEditData({ ...editData, icon: v })} />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold uppercase mb-1">Description</label>
            <input value={editData.description ?? event.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="w-full p-2 border rounded text-sm" />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button onClick={() => { setEditingId(null); setEditData({}); }} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={() => saveEvent(event)} className="px-4 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg flex items-center gap-2"><Save size={16} /> Save</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              {event.icon || '📅'}
            </div>
            <div>
              <p className="font-bold text-base">{event.title}</p>
              <p className="text-sm text-eqc-green font-bold">{new Date(event.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="text-xs text-eqc-muted mt-1">{event.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={() => { setEditingId(event.id); setEditData({}); }} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Edit3 size={18} /></button>
            <button onClick={() => deleteEvent(event)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEvents() {
  const [events] = useEvents();
  const [statusMessage, setStatusMessage] = useState<StatusMsg>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Event>>({});
  const [newIcon, setNewIcon] = useState('');

  const { active, inactive } = useMemo(() => {
    const a: Event[] = [];
    const i: Event[] = [];
    for (const ev of events) {
      (isEventPast(ev.date) ? i : a).push(ev);
    }
    a.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
    i.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
    return { active: a, inactive: i };
  }, [events]);

  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  const createEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as unknown as Partial<Event>;
    const id = Date.now();
    try {
      await setDoc(doc(db, 'events', `event_${id}`), { ...data, icon: newIcon || '📅', id });
      e.currentTarget.reset();
      setNewIcon('');
      setStatusMessage({ text: 'Event scheduled!', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to save event.', type: 'error' });
    }
  };

  const saveEvent = async (event: Event) => {
    const merged = { ...event, ...editData };
    try {
      await setDoc(doc(db, 'events', `event_${event.id}`), merged);
      setEditingId(null);
      setEditData({});
      setStatusMessage({ text: 'Event updated!', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to save event.', type: 'error' });
    }
  };

  const deleteEvent = async (event: Event) => {
    if (!confirm(`Delete "${event.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'events', `event_${event.id}`));
      setStatusMessage({ text: 'Event deleted.', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to delete event.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold serif flex items-center gap-3">
          <Calendar size={26} className="text-eqc-green" />
          Manage Events
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Add upcoming events that rotate in the lobby's Upcoming Events tile.</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus size={18} className="text-eqc-green" /> Add New Event
        </h3>
        <form onSubmit={createEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-bold mb-1">Event Title</label>
            <input name="title" required className="w-full p-3 border rounded-lg" placeholder="e.g. Graduation Ceremony" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Date</label>
            <input name="date" type="date" required className="w-full p-3 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Icon</label>
            <EmojiPicker value={newIcon} onChange={setNewIcon} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-bold mb-1">Description</label>
            <textarea name="description" required className="w-full p-3 border rounded-lg h-20" placeholder="Brief details..." />
          </div>
          <button type="submit" className="col-span-2 bg-eqc-green text-white py-3 rounded-xl font-bold hover:bg-eqc-green/90 transition-all">
            Schedule Event
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Calendar size={20} className="text-eqc-green" /> Upcoming Events ({active.length})
        </h3>
        {active.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-eqc-muted italic">No upcoming events. Add one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {active.map(event => (
              <EventCard key={event.id} event={event} editingId={editingId} editData={editData} setEditingId={setEditingId} setEditData={setEditData} saveEvent={saveEvent} deleteEvent={deleteEvent} />
            ))}
          </div>
        )}
      </div>

      {inactive.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-400">
            <Archive size={20} /> Past Events ({inactive.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 opacity-60">
            {inactive.map(event => (
              <EventCard key={event.id} event={event} editingId={editingId} editData={editData} setEditingId={setEditingId} setEditData={setEditData} saveEvent={saveEvent} deleteEvent={deleteEvent} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 px-6 py-3 rounded-full shadow-2xl z-50 text-sm font-bold flex items-center gap-2 ${
              statusMessage.type === 'success' ? 'bg-eqc-green text-white' : 'bg-red-500 text-white'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {statusMessage.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
