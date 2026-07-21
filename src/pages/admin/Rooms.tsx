import { useState, useEffect, useRef, useMemo } from 'react';
import { Layout, Plus, X, Trash2, ExternalLink, CheckCircle, AlertCircle, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRooms, useTrainers, useSignOnLog, useIntakes, writeResetLog, writeAdminUpdateLog } from '../../lib/hooks';
import { getTrainerImagePath } from '../../lib/trainers';
import { useUnsavedChangesPrompt } from '../../hooks/useUnsavedChangesPrompt';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { RoomAllocation, Trainer, Intake } from '../../lib/types';

const TRAINER_SIGN_ON_URL = `${import.meta.env.BASE_URL}trainer-sign-on.html`;

const INITIAL_ROOMS: RoomAllocation[] = [
  { id: 1, roomName: 'Room 1', status: 'inactive' },
  { id: 2, roomName: 'Room 2', status: 'inactive' },
  { id: 3, roomName: 'Room 3', status: 'inactive' },
  { id: 4, roomName: 'Room 4', status: 'inactive' },
  { id: 5, roomName: 'Room 5', status: 'inactive' },
  { id: 6, roomName: 'Room 6', status: 'inactive' },
];

const TRAINER_EG = ['e.g. Tim', 'e.g. Betty', 'e.g. Saxon', 'e.g. Emma', 'e.g. Jesse', 'e.g. Aaron', 'e.g. Tze'];
const COURSE_EG = [
  'e.g. ICT40120 — Cert IV Cyber Security',
  'e.g. ICT50220 — Diploma of IT',
  'e.g. BSB50120 — Diploma of Business',
  'e.g. ICT30120 — Cert III in IT',
  'e.g. ICT30220 — Cert III in Web Dev',
  'e.g. ICT40220 — Cert IV in Web Dev',
];
const TOPIC_EG = [
  'e.g. Network Defence',
  'e.g. Cloud Architecture',
  'e.g. Ethical Hacking',
  'e.g. Service Excellence',
  'e.g. Intro to Programming',
  'e.g. Responsive Layouts',
];

function placeholderForRow(idx: number, list: string[]): string {
  return list[idx % list.length];
}

type StatusMsg = { text: string; type: 'success' | 'error' } | null;

// --- Generic text autocomplete (course / topic) ---

function AutocompleteInput({
  value, onChange, suggestions, placeholder, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() =>
    query ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())) : suggestions
  , [query, suggestions]);

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
      />
      {open && query.length > 0 && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(s => (
            <button key={s} type="button" onClick={() => { onChange(s); setQuery(s); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 truncate">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Trainer autocomplete with profile photos ---

function TrainerAutocomplete({
  value, onChange, trainers, placeholder, disabled,
}: {
  value: string;
  onChange: (name: string, trainerId?: string) => void;
  trainers: Trainer[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return trainers.filter(t => t.active && t.name.toLowerCase().includes(q));
  }, [query, trainers]);

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(query.length > 0)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
      />
      {open && query.length > 0 && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map(t => {
            const photo = t.photoUrl || getTrainerImagePath(t.name);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.name, t.id); setQuery(t.name); setOpen(false); }}
                className="w-full flex items-center gap-2 text-left px-2 py-1.5 text-sm hover:bg-gray-50"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 bg-white shrink-0">
                  <img src={photo} alt={t.name} className="w-full h-full object-cover object-top" />
                </div>
                <span className="truncate font-medium">{t.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Intake dropdown (fed from the Intakes admin tab) ---

function IntakeSelect({
  value, onChange, intakes, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  intakes: Intake[];
  disabled?: boolean;
}) {
  const options = intakes.filter(i => i.active).map(i => i.label);
  // A legacy value not present in the intakes list still needs to render.
  const hasLegacyValue = !!value && !options.includes(value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white font-bold disabled:bg-gray-50 disabled:text-gray-400"
      title={options.length === 0 ? 'Add intakes in the Intakes tab first' : undefined}
    >
      <option value="">—</option>
      {hasLegacyValue && <option value={value}>{value}</option>}
      {options.map(label => <option key={label} value={label}>{label}</option>)}
    </select>
  );
}

function currentActorName(): string {
  try {
    const actor = JSON.parse(sessionStorage.getItem('eqc-admin-actor') || 'null');
    if (actor?.kind === 'trainer' && actor.name) return `${actor.name} (admin panel)`;
  } catch { /* fall through */ }
  return 'Admin panel';
}

export default function AdminRooms() {
  const [rooms] = useRooms(INITIAL_ROOMS);
  const trainers = useTrainers();
  const signOnLog = useSignOnLog();
  const intakes = useIntakes();
  const [draftRooms, setDraftRooms] = useState<RoomAllocation[]>(rooms);
  const [statusMessage, setStatusMessage] = useState<StatusMsg>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { kind: 'reset-all' } | { kind: 'delete-row'; id: number; name: string }>(null);

  useUnsavedChangesPrompt(dirty, 'You have unsaved room changes. Discard and leave?');

  useEffect(() => {
    if (!dirty) setDraftRooms(rooms);
  }, [rooms, dirty]);

  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  const existingCourses = useMemo(() => {
    const courses = new Set<string>();
    rooms.forEach(r => { if (r.course) courses.add(r.course); });
    signOnLog.forEach(e => { if (e.course) courses.add(e.course); });
    return Array.from(courses);
  }, [rooms, signOnLog]);

  const existingTopics = useMemo(() => {
    const topics = new Set<string>();
    rooms.forEach(r => { if (r.topic) topics.add(r.topic); });
    signOnLog.forEach(e => { if (e.topics) topics.add(e.topics); });
    return Array.from(topics);
  }, [rooms, signOnLog]);

  const rowHasContent = (r: RoomAllocation): boolean =>
    !!(r.trainer || r.course || r.intake || r.topic);

  const updateDraft = (idx: number, field: keyof RoomAllocation, value: string, extra?: { trainerId?: string }) => {
    setDirty(true);
    setDraftRooms(prev => {
      const next = [...prev];
      const current = { ...next[idx] };
      (current as any)[field] = value || undefined;
      if (field === 'trainer' && extra?.trainerId) current.trainerId = extra.trainerId;

      // If status becomes available, clear extras
      if (field === 'status' && value === 'available') {
        next[idx] = { ...current, course: undefined, trainer: undefined, intake: undefined, topic: undefined, breakUntil: undefined, trainerId: undefined };
        return next;
      }

      // Auto-flip from inactive/available to live as soon as we know who's in.
      if ((field === 'trainer' || field === 'course' || field === 'topic' || field === 'intake') && value && (current.status === 'inactive' || current.status === 'available')) {
        current.status = 'live';
      }
      next[idx] = current;
      return next;
    });
  };

  const setBreakMinutes = (idx: number, minutes: number) => {
    setDirty(true);
    setDraftRooms(prev => {
      const next = [...prev];
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      next[idx] = { ...next[idx], breakUntil: until };
      return next;
    });
  };

  const persist = async (newRooms: RoomAllocation[]) => {
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

  const handleSave = async () => {
    try {
      const changed = draftRooms.filter(dr => {
        const orig = rooms.find(r => r.id === dr.id);
        return !orig || JSON.stringify(orig) !== JSON.stringify(dr);
      });
      await persist(draftRooms);
      const changedNames = changed.map(r => r.roomName).join(', ');
      await writeAdminUpdateLog(
        currentActorName(),
        changed.length > 0 ? `Room allocations updated — ${changedNames}` : 'Room allocations saved'
      );
      setDirty(false);
      setStatusMessage({ text: 'Room changes saved.', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to save. Try again.', type: 'error' });
    }
  };

  const handleRevert = () => {
    setDraftRooms(rooms);
    setDirty(false);
    setStatusMessage({ text: 'Reverted to last saved state.', type: 'success' });
  };

  const handleResetAllConfirmed = async () => {
    // Rooms go back to "available" (light green on the lobby) — NOT "inactive",
    // which the lobby renders as "Signed off".
    const reset = rooms.map(r => ({ ...r, status: 'available' as const, course: undefined, trainer: undefined, intake: undefined, topic: undefined, breakUntil: undefined, trainerId: undefined }));
    try {
      await persist(reset);
      await writeResetLog('manual', reset.length);
      setDraftRooms(reset);
      setDirty(false);
      setStatusMessage({ text: 'All rooms reset.', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to reset.', type: 'error' });
    }
    setConfirmAction(null);
  };

  const handleAddRoom = () => {
    setDirty(true);
    setDraftRooms(prev => [...prev, { id: Date.now(), roomName: `Room ${prev.length + 1}`, status: 'inactive' }]);
  };

  const handleClearRoom = (idx: number) => {
    setDirty(true);
    setDraftRooms(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], status: 'inactive', course: undefined, trainer: undefined, intake: undefined, topic: undefined, breakUntil: undefined, trainerId: undefined };
      return next;
    });
  };

  const handleDeleteConfirmed = (id: number) => {
    setDirty(true);
    setDraftRooms(prev => prev.filter(r => r.id !== id));
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold serif flex items-center gap-3">
            <Layout size={26} className="text-eqc-green" />
            Manage Room Allocations
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Start typing a trainer name to activate a room. Status auto-flips to live once any detail is entered.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmAction({ kind: 'reset-all' })}
            className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors text-sm"
          >
            <X size={16} /> Reset All
          </button>
          <button onClick={handleAddRoom} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors text-sm">
            <Plus size={16} /> Add Room
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        {/* Order: Room | Trainer | Status | Course | Intake | Topic | (actions) */}
        <div className="hidden md:grid grid-cols-[60px_1fr_110px_1fr_110px_1fr_70px] gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-eqc-muted">
          <span>Room</span>
          <span>Trainer</span>
          <span>Status</span>
          <span>Course</span>
          <span>Intake</span>
          <span>Topic</span>
          <span />
        </div>
        {draftRooms.map((room, idx) => {
          const num = parseInt(room.roomName.replace('Room ', ''));
          const isCoreRoom = !isNaN(num) && num >= 1 && num <= 6;
          const displayName = isCoreRoom ? String(num) : room.roomName;
          const hasContent = rowHasContent(room);
          const statusDisabled = !hasContent;
          const rowBg = room.status === 'live' ? 'bg-green-50' : room.status === 'break' ? 'bg-orange-50' : 'bg-white';
          return (
            <div key={room.id}>
              <div className={`grid grid-cols-2 md:grid-cols-[60px_1fr_110px_1fr_110px_1fr_70px] gap-2 px-3 py-2 items-center border-b border-gray-100 last:border-b-0 ${rowBg}`}>
                <div className="font-bold text-center text-lg md:text-sm">{displayName}</div>
                <TrainerAutocomplete
                  value={room.trainer || ''}
                  onChange={(name, trainerId) => updateDraft(idx, 'trainer', name, { trainerId })}
                  trainers={trainers}
                  placeholder={placeholderForRow(idx, TRAINER_EG)}
                />
                <select
                  value={room.status}
                  onChange={(e) => updateDraft(idx, 'status', e.target.value)}
                  disabled={statusDisabled}
                  className={`w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-bold disabled:bg-gray-50 disabled:text-gray-400 ${
                    room.status === 'live' ? 'text-green-700' : room.status === 'break' ? 'text-orange-700' : room.status === 'inactive' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  <option value="inactive">Inactive</option>
                  <option value="available">Available</option>
                  <option value="live">Live</option>
                  <option value="break">Break</option>
                </select>
                <AutocompleteInput
                  value={room.course || ''}
                  onChange={(v) => updateDraft(idx, 'course', v)}
                  suggestions={existingCourses}
                  placeholder={placeholderForRow(idx, COURSE_EG)}
                />
                <IntakeSelect
                  value={room.intake || ''}
                  onChange={(v) => updateDraft(idx, 'intake', v)}
                  intakes={intakes}
                />
                <AutocompleteInput
                  value={room.topic || ''}
                  onChange={(v) => updateDraft(idx, 'topic', v)}
                  suggestions={existingTopics}
                  placeholder={placeholderForRow(idx, TOPIC_EG)}
                />
                <div className="flex justify-end gap-1">
                  {hasContent && (
                    <button onClick={() => handleClearRoom(idx)} className="text-orange-500 p-1.5 hover:bg-orange-100 rounded" title="Clear Room">
                      <X size={16} />
                    </button>
                  )}
                  {!isCoreRoom && (
                    <button
                      onClick={() => setConfirmAction({ kind: 'delete-row', id: room.id, name: room.roomName })}
                      className="text-red-500 p-1.5 hover:bg-red-50 rounded"
                      title="Delete Room"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              {room.status === 'break' && (
                <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-3">
                  <Coffee size={14} className="text-orange-500" />
                  <span className="text-xs font-bold text-orange-700">Break duration:</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    defaultValue={15}
                    onChange={(e) => setBreakMinutes(idx, Number(e.target.value))}
                    className="w-20 px-2 py-1 border border-orange-200 rounded text-sm text-center"
                  />
                  <span className="text-xs text-orange-600">minutes</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
          <ExternalLink size={16} />
          Rooms also update when trainers sign on via the{' '}
          <a href={TRAINER_SIGN_ON_URL} target="_blank" rel="noreferrer" className="underline font-bold">Trainer Sign-On Portal</a>.
        </p>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {dirty ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-700 font-bold">Unsaved changes</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-gray-500">All changes saved</span>
            </>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={handleRevert} disabled={!dirty} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
            Revert
          </button>
          <button onClick={handleSave} disabled={!dirty} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction?.kind === 'reset-all'}
        tone="warning"
        title="Reset all rooms?"
        body="This will set every room back to available and discard course/trainer details on every row. The action cannot be undone."
        confirmLabel="Reset all"
        cancelLabel="Cancel"
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleResetAllConfirmed}
      />
      <ConfirmDialog
        open={confirmAction?.kind === 'delete-row'}
        tone="danger"
        title={`Delete ${confirmAction?.kind === 'delete-row' ? confirmAction.name : ''}?`}
        body="The room will be removed from the sign-on portal and the lobby dashboard."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.kind === 'delete-row' && handleDeleteConfirmed(confirmAction.id)}
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
