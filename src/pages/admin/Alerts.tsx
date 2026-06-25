import { useState, useEffect, useRef, FormEvent } from 'react';
import { Megaphone, Trash2, Edit3, Save, X, Clock, Eye, Plus, Smile } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAnnouncements } from '../../lib/hooks';
import type { Announcement } from '../../lib/types';

const BG_PRESETS = [
  { hex: '#1a7a54', label: 'EQC Green' },
  { hex: '#dc2626', label: 'Urgent Red' },
  { hex: '#2563eb', label: 'Info Blue' },
  { hex: '#f97316', label: 'Warning Orange' },
  { hex: '#9333ea', label: 'Special Purple' },
  { hex: '#db2777', label: 'Soft Pink' },
  { hex: '#1f2937', label: 'Neutral Dark' },
];

const TEXT_PRESETS = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#1a1a1a', label: 'Dark' },
  { hex: '#1a7a54', label: 'EQC Green' },
  { hex: '#fef3c7', label: 'Cream' },
];

const EMOJIS = [
  '🎉', '🔥', '⚠️', '📢', '🎓', '💪', '🏆', '⭐', '❤️', '🎯',
  '📚', '🎊', '🌟', '💡', '🚀', '✅', '❌', '⏰', '🎈', '👋',
  '🏫', '📝', '🎵', '🌈', '☀️', '🌙', '🔔', '💬', '📌', '🎁',
];

const SPEED_DURATIONS: Record<string, number> = { slow: 60, medium: 30, fast: 18 };
const SIZE_CLASSES: Record<string, string> = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
const SIZE_VALUES: Array<NonNullable<Announcement['textSize']>> = ['sm', 'md', 'lg'];
const SPEED_VALUES: Array<NonNullable<Announcement['scrollSpeed']>> = ['slow', 'medium', 'fast'];

const TW_BG_TO_HEX: Record<string, string> = {
  'bg-eqc-green': '#1a7a54', 'bg-red-600': '#dc2626', 'bg-blue-600': '#2563eb',
  'bg-orange-500': '#f97316', 'bg-purple-600': '#9333ea', 'bg-pink-600': '#db2777',
  'bg-gray-800': '#1f2937',
};
const TW_TEXT_TO_HEX: Record<string, string> = {
  'text-white': '#ffffff', 'text-eqc-text': '#1a1a1a',
  'text-eqc-green': '#1a7a54', 'text-amber-100': '#fef3c7',
};

function resolveHex(value: string | undefined, map: Record<string, string>, fallback: string): string {
  if (!value) return fallback;
  if (value.startsWith('#')) return value;
  return map[value] || fallback;
}

interface AlertDraft {
  text: string;
  bgColor: string;
  textColor: string;
  textSize: NonNullable<Announcement['textSize']>;
  scrollSpeed: NonNullable<Announcement['scrollSpeed']>;
  duration: number;
  expiresAt?: string;
}

const DEFAULT_DRAFT: AlertDraft = {
  text: '',
  bgColor: '#1a7a54',
  textColor: '#ffffff',
  textSize: 'md',
  scrollSpeed: 'medium',
  duration: 1,
};

function ColourSwatches({ presets, value, onChange }: {
  presets: Array<{ hex: string; label: string }>;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map(p => (
          <button key={p.hex} type="button" onClick={() => onChange(p.hex)} title={p.label}
            className={`w-8 h-8 rounded-full border-2 transition-all shrink-0 ${
              value.toLowerCase() === p.hex.toLowerCase()
                ? 'border-eqc-green scale-110 ring-2 ring-eqc-green/30'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: p.hex }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value.startsWith('#') ? value : '#000000'} onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2 py-1 border rounded text-sm font-mono" placeholder="#000000" />
      </div>
    </div>
  );
}

function EmojiButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
        <Smile size={20} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border p-3 w-72 z-50">
          <div className="grid grid-cols-10 gap-1">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => { onSelect(e); setOpen(false); }}
                className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 rounded text-lg">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewBanner({ draft }: { draft: AlertDraft }) {
  const duration = SPEED_DURATIONS[draft.scrollSpeed] || 30;
  return (
    <div className="py-2 overflow-hidden rounded-lg border border-black/10"
      style={{ backgroundColor: draft.bgColor, color: draft.textColor }}>
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
        @keyframes preview-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-preview-marquee { animation: preview-marquee linear infinite; }
      `}</style>
    </div>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);

  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return <span className="text-red-500 font-bold">Expired</span>;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return <span>{days}d {hours}h left</span>;
  if (hours > 0) return <span>{hours}h {minutes}m left</span>;
  return <span>{minutes}m left</span>;
}

export default function AdminAlerts() {
  const announcements = useAnnouncements();
  const [draft, setDraft] = useState<AlertDraft>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<AlertDraft>>({});
  const textRef = useRef<HTMLInputElement>(null);

  const insertEmoji = (emoji: string) => {
    const input = textRef.current;
    if (!input) { setDraft(d => ({ ...d, text: d.text + emoji })); return; }
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newText = draft.text.slice(0, start) + emoji + draft.text.slice(end);
    setDraft(d => ({ ...d, text: newText }));
    setTimeout(() => { input.setSelectionRange(start + emoji.length, start + emoji.length); input.focus(); }, 0);
  };

  const createAlert = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.text.trim()) { toast.error('Enter the alert text'); return; }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + draft.duration);
    const id = Date.now();
    try {
      await setDoc(doc(db, 'announcements', `ann_${id}`), {
        id, text: draft.text,
        color: draft.bgColor, bgColor: draft.bgColor, textColor: draft.textColor,
        textSize: draft.textSize, scrollSpeed: draft.scrollSpeed,
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
    } catch (err: any) { toast.error(err.message || 'Delete failed'); }
  };

  const startEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setEditDraft({
      text: ann.text,
      bgColor: resolveHex(ann.bgColor || ann.color, TW_BG_TO_HEX, '#1a7a54'),
      textColor: resolveHex(ann.textColor, TW_TEXT_TO_HEX, '#ffffff'),
      textSize: ann.textSize || 'md',
      scrollSpeed: ann.scrollSpeed || 'medium',
      expiresAt: ann.expiresAt,
    });
  };

  const saveEdit = async (ann: Announcement) => {
    try {
      await setDoc(doc(db, 'announcements', `ann_${ann.id}`), {
        ...ann,
        text: editDraft.text ?? ann.text,
        color: editDraft.bgColor || ann.color,
        bgColor: editDraft.bgColor,
        textColor: editDraft.textColor,
        textSize: editDraft.textSize,
        scrollSpeed: editDraft.scrollSpeed,
        expiresAt: editDraft.expiresAt || ann.expiresAt,
      }, { merge: true });
      toast.success('Alert updated');
      setEditingId(null);
      setEditDraft({});
    } catch (err: any) { toast.error(err.message || 'Save failed'); }
  };

  const extendExpiry = async (ann: Announcement, hours: number) => {
    const newExpiry = new Date(Math.max(new Date(ann.expiresAt).getTime(), Date.now()) + hours * 3_600_000);
    try {
      await setDoc(doc(db, 'announcements', `ann_${ann.id}`), { expiresAt: newExpiry.toISOString() }, { merge: true });
      toast.success(`Extended by ${hours}h`);
    } catch (err: any) { toast.error(err.message || 'Update failed'); }
  };

  return (
    <div className="space-y-8 max-w-5xl w-full">
      <Toaster position="bottom-right" />

      <div>
        <h2 className="text-2xl font-bold serif flex items-center gap-3">
          <Megaphone size={26} className="text-eqc-green" />
          Manage Alerts
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Scrolling announcements that appear across the top of every screen.</p>
      </div>

      {/* 1. Active alerts (top) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Megaphone size={16} className="text-eqc-green" /> Active ({announcements.length})
        </h3>
        {announcements.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <Megaphone size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-eqc-muted italic">No active alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => {
              const bg = resolveHex(ann.bgColor || ann.color, TW_BG_TO_HEX, '#1a7a54');
              const txt = resolveHex(ann.textColor, TW_TEXT_TO_HEX, '#ffffff');
              return (
                <div key={ann.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  {editingId === ann.id ? (
                    <div className="p-5 space-y-4">
                      <input value={editDraft.text ?? ann.text} onChange={(e) => setEditDraft({ ...editDraft, text: e.target.value })}
                        className="w-full p-2 border rounded-lg text-sm font-bold" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Background</label>
                          <ColourSwatches presets={BG_PRESETS} value={editDraft.bgColor || bg} onChange={(v) => setEditDraft({ ...editDraft, bgColor: v })} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Text colour</label>
                          <ColourSwatches presets={TEXT_PRESETS} value={editDraft.textColor || txt} onChange={(v) => setEditDraft({ ...editDraft, textColor: v })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Size</label>
                          <input type="range" min={0} max={2} value={SIZE_VALUES.indexOf(editDraft.textSize || ann.textSize || 'md')}
                            onChange={(e) => setEditDraft({ ...editDraft, textSize: SIZE_VALUES[Number(e.target.value)] })}
                            className="w-full accent-eqc-green" />
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>Small</span><span>Medium</span><span>Large</span></div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Speed</label>
                          <input type="range" min={0} max={2} value={SPEED_VALUES.indexOf(editDraft.scrollSpeed || ann.scrollSpeed || 'medium')}
                            onChange={(e) => setEditDraft({ ...editDraft, scrollSpeed: SPEED_VALUES[Number(e.target.value)] })}
                            className="w-full accent-eqc-green" />
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>Slow</span><span>Medium</span><span>Fast</span></div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Expires</label>
                        <input type="datetime-local" value={(editDraft.expiresAt ?? ann.expiresAt).slice(0, 16)}
                          onChange={(e) => setEditDraft({ ...editDraft, expiresAt: new Date(e.target.value).toISOString() })}
                          className="w-full p-2 border rounded-lg text-sm" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setEditingId(null); setEditDraft({}); }} className="px-3 py-1.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button onClick={() => saveEdit(ann)} className="px-3 py-1.5 text-sm font-bold text-white bg-eqc-green rounded-lg flex items-center gap-1"><Save size={14} /> Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="px-5 py-2" style={{ backgroundColor: bg, color: txt }}>
                        <p className={`${SIZE_CLASSES[ann.textSize || 'md']} font-black uppercase tracking-wider truncate`}>{ann.text}</p>
                      </div>
                      <div className="p-3 flex items-center justify-between gap-3">
                        <button onClick={() => extendExpiry(ann, 1)} className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg">
                          <Clock size={14} /> <ExpiryCountdown expiresAt={ann.expiresAt} />
                          <span className="text-eqc-muted">&middot;</span>
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
              );
            })}
          </div>
        )}
      </div>

      {/* 2. New alert form */}
      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-5">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Plus size={16} className="text-eqc-green" /> New Alert
        </h3>
        <form onSubmit={createAlert} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Alert text</label>
            <div className="flex items-center gap-1 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-eqc-green/30">
              <input ref={textRef} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="e.g. Campus closed this Friday" className="flex-1 p-3 rounded-lg border-0 outline-none" required />
              <EmojiButton onSelect={insertEmoji} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Background</label>
              <ColourSwatches presets={BG_PRESETS} value={draft.bgColor} onChange={(v) => setDraft({ ...draft, bgColor: v })} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Text colour</label>
              <ColourSwatches presets={TEXT_PRESETS} value={draft.textColor} onChange={(v) => setDraft({ ...draft, textColor: v })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Text size</label>
              <input type="range" min={0} max={2} value={SIZE_VALUES.indexOf(draft.textSize)}
                onChange={(e) => setDraft({ ...draft, textSize: SIZE_VALUES[Number(e.target.value)] })}
                className="w-full accent-eqc-green" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>Small</span><span>Medium</span><span>Large</span></div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Scroll speed</label>
              <input type="range" min={0} max={2} value={SPEED_VALUES.indexOf(draft.scrollSpeed)}
                onChange={(e) => setDraft({ ...draft, scrollSpeed: SPEED_VALUES[Number(e.target.value)] })}
                className="w-full accent-eqc-green" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>Slow</span><span>Medium</span><span>Fast</span></div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">Duration</label>
            <div className="flex items-center gap-3">
              <input type="number" min={1} max={30} value={draft.duration}
                onChange={(e) => setDraft({ ...draft, duration: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-24 p-2 border rounded-lg" />
              <span className="text-sm text-gray-500">{draft.duration === 1 ? 'day' : 'days'}</span>
            </div>
          </div>
          <button type="submit" className="w-full bg-eqc-green text-white py-3 rounded-xl font-bold hover:bg-eqc-green/90 transition-all text-sm">
            Post Alert
          </button>
        </form>
      </div>

      {/* 3. Live preview (full width below form) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Eye size={16} className="text-eqc-green" /> Live Preview
        </h3>
        <PreviewBanner draft={draft} />
        <p className="text-xs text-gray-500 italic">Auto-updates as you edit above.</p>
      </div>
    </div>
  );
}
