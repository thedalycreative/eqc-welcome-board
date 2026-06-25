import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Plus, Calendar, Trash2, Edit3, Save, CheckCircle, AlertCircle, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEvents } from '../../lib/hooks';
import { getLucideIcon } from '../../lib/eventIcons';
import IconPicker from '../../components/IconPicker';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Event } from '../../lib/types';

type StatusMsg = { text: string; type: 'success' | 'error' } | null;

function EventIcon({ name, size = 20 }: { name?: string; size?: number }) {
  const Icon = getLucideIcon(name);
  return <Icon size={size} />;
}

export default function AdminEvents() {
  const [events] = useEvents();
  const [statusMessage, setStatusMessage] = useState<StatusMsg>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Event>>({});
  const [newIcon, setNewIcon] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Event | null>(null);

  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { upcoming, past } = useMemo(() => {
    const upcoming: Event[] = [];
    const past: Event[] = [];
    for (const e of events) {
      if (new Date(e.date) >= today) upcoming.push(e);
      else past.push(e);
    }
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { upcoming, past };
  }, [events]);

  const createEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as unknown as Partial<Event>;
    const id = Date.now();
    try {
      await setDoc(doc(db, 'events', `event_${id}`), {
        ...data,
        date: newDate,
        time: newTime || undefined,
        icon: newIcon || undefined,
        id,
      });
      e.currentTarget.reset();
      setNewIcon('');
      setNewDate('');
      setNewTime('');
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

  const deleteEventConfirmed = async (event: Event) => {
    try {
      await deleteDoc(doc(db, 'events', `event_${event.id}`));
      setStatusMessage({ text: 'Event deleted.', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to delete event.', type: 'error' });
    }
    setConfirmDelete(null);
  };

  const renderEventCard = (event: Event) => (
    <div key={event.id} className="bg-white p-4 rounded-xl border shadow-sm">
      {editingId === event.id ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase mb-1">Title</label>
              <input value={editData.title ?? event.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Date</label>
              <input type="date" value={editData.date ?? event.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Time <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
              <input type="time" value={editData.time ?? event.time ?? ''} onChange={(e) => setEditData({ ...editData, time: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1">Icon</label>
              <IconPicker value={editData.icon ?? event.icon} onChange={(name) => setEditData({ ...editData, icon: name })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase mb-1">Description</label>
              <input value={editData.description ?? event.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditingId(null); setEditData({}); }} className="px-3 py-1.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={() => saveEvent(event)} className="px-3 py-1.5 text-sm font-bold text-white bg-eqc-green rounded-lg flex items-center gap-1"><Save size={14} /> Save</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0 text-eqc-green">
              <EventIcon name={event.icon} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{event.title}</p>
              <p className="text-xs text-eqc-green font-bold">
                {new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {event.time && <span className="ml-1 text-eqc-muted font-medium">· {event.time}</span>}
              </p>
              <p className="text-xs text-eqc-muted mt-0.5 truncate">{event.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { setEditingId(event.id); setEditData({}); }} className="text-blue-500 p-1.5 hover:bg-blue-50 rounded"><Edit3 size={16} /></button>
            <button onClick={() => setConfirmDelete(event)} className="text-red-500 p-1.5 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold serif flex items-center gap-3">
          <Calendar size={26} className="text-eqc-green" />
          Manage Events
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Add upcoming events for the lobby tile. Past events auto-archive below.</p>
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Plus size={16} className="text-eqc-green" /> Add New Event
        </h3>
        <form onSubmit={createEvent} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <input name="title" required className="w-full p-2.5 border rounded-lg text-sm" placeholder="e.g. Open Day & Industry Networking Night" />
          </div>
          <input
            name="date"
            type="date"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={`w-full p-2.5 border rounded-lg text-sm ${newDate ? 'text-gray-900' : 'text-gray-400'}`}
          />
          <input
            name="time"
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            placeholder="optional time"
            className={`w-full p-2.5 border rounded-lg text-sm ${newTime ? 'text-gray-900' : 'text-gray-400'}`}
          />
          <IconPicker value={newIcon} onChange={setNewIcon} triggerFallbackIcon={<Smile size={20} />} triggerLabel="Choose icon" />
          <div className="sm:col-span-2">
            <textarea
              name="description"
              required
              className="w-full p-2.5 border rounded-lg text-sm h-16"
              placeholder="e.g. A relaxed morning catch-up with our cybersecurity intake — coffee provided."
            />
          </div>
          <button type="submit" className="sm:col-span-2 bg-eqc-green text-white py-2.5 rounded-lg font-bold hover:bg-eqc-green/90 transition-all text-sm">
            Schedule Event
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Calendar size={16} className="text-eqc-green" /> Upcoming ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-eqc-muted italic p-4 bg-white rounded-xl border text-center">No upcoming events.</p>
        ) : (
          <div className="space-y-2">{upcoming.map(renderEventCard)}</div>
        )}
      </div>

      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-gray-400">
            Past Events ({past.length})
          </h3>
          <div className="space-y-2 opacity-60">{past.map(renderEventCard)}</div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        tone="danger"
        title={`Delete "${confirmDelete?.title || ''}"?`}
        body="This event will be removed from the lobby's Upcoming Events tile."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteEventConfirmed(confirmDelete)}
      />

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
