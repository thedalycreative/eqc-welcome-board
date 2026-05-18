import { useState, useEffect, FormEvent } from 'react';
import { Plus, Megaphone, Trash2, Edit3, Save, X, Clock, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAnnouncements } from '../../lib/hooks';
import type { Announcement } from '../../lib/types';

// Tailwind classes for the picker. Stored as the class string so we can
// apply them anywhere (used by both the editor preview and the lobby).
const COLOUR_OPTIONS = [
  { value: 'bg-eqc-green', label: 'EQC Green', preview: '#1a7a54' },
  { value: 'bg-red-600', label: 'Urgent Red', preview: '#dc2626' },
  { value: 'bg-blue-600', label: 'Info Blue', preview: '#2563eb' },
  { value: 'bg-orange-500', label: 'Warning Orange', preview: '#f97316' },
  { value: 'bg-purple-600', label: 'Special Purple', preview: '#9333ea' },
  { value: 'bg-pink-600', label: 'Soft Pink', preview: '#db2777' },
  { value: 'bg-gray-800', label: 'Neutral Dark', preview: '#1f2937' },
];

const TEXT_COLOUR_OPTIONS = [
  { value: 'text-white', label: 'White', preview: '#ffffff' },
  { value: 'text-eqc-text', label: 'Dark', preview: '#1A1A1A' },
  { value: 'text-eqc-green', label: 'EQC Green', preview: '#1a7a54' },
  { value: 'text-amber-100', label: 'Cream', preview: '#fef3c7' },
];

const SIZE_OPTIONS: Array<{ value: NonNullable<Announcement['textSize']>; label: string; preview: string }> = [
  { value: 'sm', label: 'Small', preview: 'text-sm' },
  { value: 'md', label: 'Medium', preview: 'text-lg' },
  { value: 'lg', label: 'Large', preview: 'text-2xl' },
];

const SPEED_OPTIONS: Array<{ value: NonNullable<Announcement['scrollSpeed']>; label: string }> = [
  { value: 'slow', label: 'Slow' },
  { value: 'medium', label: 'Medium' },
  { value: 'fast', label: 'Fast' },
];

const SPEED_DURATIONS = { slow: 60, medium: 30, fast: 18 };
const SIZE_CLASSES = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };

interface AlertDraft {
  text: string;
  color: string;
  textColor: string;
  textSize: NonNullable<Announcement['textSize']>;
  scrollSpeed: NonNullable<Announcement['scrollSpeed']>;
  duration: number; // days
}

const DEFAULT_DRAFT: AlertDraft = {
  text: '',
  color: 'bg-eqc-green',
  textColor: 'text-white',
  textSize: 'md',
  scrollSpeed: 'medium',
  duration: 1,
};

// --- Live preview ---

function PreviewBanner({ draft }: { draft: AlertDraft }) {
  const duration = SPEED_DURATIONS[draft.scrollSpeed];
  return (
    <div className={`${draft.color} ${draft.textColor} py-2 overflow-hidden rounded-lg border border-black/10`}>
      <div className="flex whitespace-nowrap items-center gap-12 animate-preview-marquee" style={{ animationDuration: `${duration}s` }}>
        {[0, 1, 2].map(i => (
          <span key={i} className={`${SIZE_CLASSES[draft.textSize]} font-black uppercase tracking-[0.2em] italic flex items-center gap-3`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {draft.text || 'Preview your alert text here…'}
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          </span>
        ))}
      </div>
      <style>{`
        @keyframes preview-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-preview-marquee { animation: preview-marquee linear infinite; }
      `}</style>
    </div>
  );
}

// --- Picker grid component ---

function PickerGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; preview?: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`min-w-0 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-colors flex items-center gap-2 ${
            value === opt.value ? 'border-eqc-green bg-eqc-green/10' : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          {opt.preview?.startsWith('#') && (
            <span className="w-3 h-3 rounded-full border border-black/10 shrink-0" style={{ background: opt.preview }} />
          )}
          <span className={`truncate ${opt.preview?.startsWith('text-') ? opt.preview : ''}`}>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// --- Countdown ---

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return <span className="text-red-500 font-bold">Expired</span>;

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  if (days > 0) return <span>{days}d {hours}h left</span>;
  if (hours > 0) return <span>{hours}h {minutes}m left</span>;
  return <span>{minutes}m left</span>;
}

// --- Main page ---

export default function AdminAlerts() {
  const announcements = useAnnouncements();
  const [draft, setDraft] = useState<AlertDraft>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Announcement & { duration?: number }>>({});

  const createAlert = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.text.trim()) {
      toast.error('Enter the alert text');
      return;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + draft.duration);
    const id = Date.now();
    try {
      await setDoc(doc(db, 'announcements', `ann_${id}`), {
        id,
        text: draft.text,
        color: draft.color,
        textColor: draft.textColor,
        textSize: draft.textSize,
        scrollSpeed: draft.scrollSpeed,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      toast.success('Alert posted');
      setDraft(DEFAULT_DRAFT);
    } catch (err: any) {
      toast.error(err.message || 'Failed to post alert');
    }
  };

  const deleteAlert = async (ann: Announcement) => {
    if (!confirm(`Delete this alert?\n\n"${ann.text}"`)) return;
    try {
      await deleteDoc(doc(db, 'announcements', `ann_${ann.id}`));
      toast.success('Alert removed');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const startEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setEditDraft({ text: ann.text, color: ann.color, textColor: ann.textColor, textSize: ann.textSize, scrollSpeed: ann.scrollSpeed, expiresAt: ann.expiresAt });
  };

  const saveEdit = async (ann: Announcement) => {
    try {
      await setDoc(doc(db, 'announcements', `ann_${ann.id}`), {
        ...ann,
        ...editDraft,
      }, { merge: true });
      toast.success('Alert updated');
      setEditingId(null);
      setEditDraft({});
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    }
  };

  const extendExpiry = async (ann: Announcement, hours: number) => {
    const newExpiry = new Date(Math.max(new Date(ann.expiresAt).getTime(), Date.now()) + hours * 3_600_000);
    try {
      await setDoc(doc(db, 'announcements', `ann_${ann.id}`), { expiresAt: newExpiry.toISOString() }, { merge: true });
      toast.success(`Extended by ${hours}h`);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl w-full">
      <Toaster position="bottom-right" />

      <div>
        <h2 className="text-2xl font-display font-bold flex items-center gap-3">
          <Megaphone size={26} className="text-eqc-green" />
          Manage Alerts
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Scrolling announcements that appear across the top of every screen.</p>
      </div>

      {/* Editor + Preview: switches from stacked → side-by-side at lg.
          Using minmax(0,1fr) so columns can shrink below intrinsic content
          width — prevents horizontal overflow at any zoom level. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6">
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-5 min-w-0">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Plus size={18} className="text-eqc-green" /> New Alert
          </h3>

          <form onSubmit={createAlert} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Alert text</label>
              <input
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="e.g. Campus closed this Friday"
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Background</label>
              <PickerGrid options={COLOUR_OPTIONS} value={draft.color} onChange={(v) => setDraft({ ...draft, color: v })} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Text colour</label>
              <PickerGrid options={TEXT_COLOUR_OPTIONS} value={draft.textColor} onChange={(v) => setDraft({ ...draft, textColor: v })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Size</label>
                <div className="flex gap-2">
                  {SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, textSize: opt.value })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 ${draft.textSize === opt.value ? 'border-eqc-green bg-eqc-green/10' : 'border-gray-200 bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Scroll speed</label>
                <div className="flex gap-2">
                  {SPEED_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, scrollSpeed: opt.value })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 ${draft.scrollSpeed === opt.value ? 'border-eqc-green bg-eqc-green/10' : 'border-gray-200 bg-white'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Duration</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={draft.duration}
                  onChange={(e) => setDraft({ ...draft, duration: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-24 p-2 border rounded-lg"
                />
                <span className="text-sm text-gray-500">{draft.duration === 1 ? 'day' : 'days'}</span>
              </div>
            </div>

            <button type="submit" className="w-full bg-eqc-green text-white py-3 rounded-xl font-bold hover:bg-eqc-green/90 transition-all">
              Post Alert
            </button>
          </form>
        </div>

        {/* Live preview */}
        <div className="space-y-3 min-w-0">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Eye size={18} className="text-eqc-green" /> Live preview
          </h3>
          <div className="min-w-0 overflow-hidden">
            <PreviewBanner draft={draft} />
          </div>
          <p className="text-xs text-gray-500 italic">Auto-updates as you edit. The banner will appear at the top of every screen and scroll continuously.</p>
        </div>
      </div>

      {/* Active alerts */}
      <div className="space-y-3">
        <h3 className="text-lg font-display font-bold flex items-center gap-2">
          <Megaphone size={20} className="text-eqc-green" /> Active Alerts ({announcements.length})
        </h3>

        {announcements.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
            <Megaphone size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-eqc-muted italic">No active alerts. Create one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {editingId === ann.id ? (
                  <div className="p-5 space-y-4">
                    <input
                      value={editDraft.text ?? ann.text}
                      onChange={(e) => setEditDraft({ ...editDraft, text: e.target.value })}
                      className="w-full p-2 border rounded text-sm font-bold"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Background</label>
                        <select value={editDraft.color ?? ann.color} onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })} className="w-full p-2 border rounded text-xs font-bold">
                          {COLOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Text colour</label>
                        <select value={editDraft.textColor ?? ann.textColor ?? 'text-white'} onChange={(e) => setEditDraft({ ...editDraft, textColor: e.target.value })} className="w-full p-2 border rounded text-xs font-bold">
                          {TEXT_COLOUR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Size</label>
                        <select value={editDraft.textSize ?? ann.textSize ?? 'md'} onChange={(e) => setEditDraft({ ...editDraft, textSize: e.target.value as Announcement['textSize'] })} className="w-full p-2 border rounded text-xs font-bold">
                          {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Speed</label>
                        <select value={editDraft.scrollSpeed ?? ann.scrollSpeed ?? 'medium'} onChange={(e) => setEditDraft({ ...editDraft, scrollSpeed: e.target.value as Announcement['scrollSpeed'] })} className="w-full p-2 border rounded text-xs font-bold">
                          {SPEED_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Expires</label>
                      <input
                        type="datetime-local"
                        value={(editDraft.expiresAt ?? ann.expiresAt).slice(0, 16)}
                        onChange={(e) => setEditDraft({ ...editDraft, expiresAt: new Date(e.target.value).toISOString() })}
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setEditingId(null); setEditDraft({}); }} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={() => saveEdit(ann)} className="px-4 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg flex items-center gap-2"><Save size={16} /> Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`${ann.color} ${ann.textColor || 'text-white'} px-5 py-2`}>
                      <p className={`${SIZE_CLASSES[ann.textSize || 'md']} font-black uppercase tracking-wider truncate`}>{ann.text}</p>
                    </div>
                    <div className="p-3 flex items-center justify-between gap-3">
                      <button onClick={() => extendExpiry(ann, 1)} className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg">
                        <Clock size={14} /> <ExpiryCountdown expiresAt={ann.expiresAt} />
                        <span className="text-eqc-muted">·</span>
                        <span className="text-eqc-green">+1h</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(ann)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg"><Edit3 size={16} /></button>
                        <button onClick={() => deleteAlert(ann)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
