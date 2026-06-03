import { useEffect, useState, useCallback, type ChangeEvent, type CSSProperties } from 'react';
import {
  Settings as SettingsIcon, Save, Plus, Trash2, Wifi, Phone, Image as ImageIcon,
  Layout, MapPin, X, Upload, Check, Pencil, GripVertical,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useCarousel, useGlobalSettings } from '../../lib/hooks';
import { uploadImage, readFileAsDataURL, getCroppedBlob, deleteImage } from '../../lib/storage';
import { useUnsavedChangesPrompt } from '../../hooks/useUnsavedChangesPrompt';
import IconPicker from '../../components/IconPicker';
import { getLucideIcon } from '../../lib/eventIcons';
import type {
  GlobalSettings, Contact, FooterItem, NearbyPlace, CarouselTransition,
} from '../../lib/types';
import { DEFAULT_SETTINGS, DEFAULT_FOOTER_ITEMS, DEFAULT_NEARBY_PLACES } from '../../lib/types';
import { AnimatePresence, motion } from 'motion/react';

function msToSeconds(ms: number) { return Math.round(ms / 1000); }
function secondsToMs(s: number) { return s * 1000; }
function hourToTime(h: number) { return `${String(h).padStart(2, '0')}:00`; }
function timeToHour(t: string) { return parseInt(t.split(':')[0]) || 0; }

const TRANSITION_OPTIONS: { value: CarouselTransition; label: string; description: string }[] = [
  { value: 'slide',     label: 'Slide',      description: 'Classic horizontal swipe.' },
  { value: 'fade',      label: 'Fade',       description: 'Gentle opacity fade.' },
  { value: 'crossfade', label: 'Crossfade',  description: 'Slight scale + opacity blend.' },
  { value: 'zoom',      label: 'Zoom',       description: 'Each slide zooms in.' },
  { value: 'kenburns',  label: 'Ken Burns',  description: 'Slow continuous scale; cinematic.' },
];

const FLOOR_PLAN_ASPECT = 16 / 9;
const FLOOR_PLAN_OUTPUT_WIDTH = 1600;

const NEARBY_CATEGORIES: { value: NearbyPlace['category']; label: string }[] = [
  { value: 'cafe', label: 'Cafes & Shopping' },
  { value: 'transport', label: 'Public Transport' },
  { value: 'other', label: 'Other' },
];

export default function AdminSettings() {
  const [settings, updateSettings] = useGlobalSettings();
  const [draft, setDraft] = useState<GlobalSettings>(settings);
  const [dirty, setDirty] = useState(false);

  useUnsavedChangesPrompt(dirty, 'You have unsaved settings. Discard and leave?');

  useEffect(() => { if (!dirty) setDraft(settings); }, [settings, dirty]);

  const patch = (p: Partial<GlobalSettings>) => {
    setDirty(true);
    setDraft(prev => ({ ...prev, ...p }));
  };

  const handleSave = async () => {
    try {
      await updateSettings(draft);
      setDirty(false);
      toast.success('Settings saved');
    } catch (err: any) { toast.error(err.message || 'Save failed'); }
  };

  const handleRevert = () => { setDraft(settings); setDirty(false); };

  // Contacts (existing)
  const addContact = () => patch({ contacts: [...draft.contacts, { name: '', role: '', email: '', phone: '' }] });
  const updateContact = (idx: number, p: Partial<Contact>) => {
    const next = [...draft.contacts]; next[idx] = { ...next[idx], ...p }; patch({ contacts: next });
  };
  const removeContact = (idx: number) => patch({ contacts: draft.contacts.filter((_, i) => i !== idx) });

  // Footer items
  const footerItems = (draft.footerItems && draft.footerItems.length > 0) ? draft.footerItems : DEFAULT_FOOTER_ITEMS;
  const setFooterItems = (next: FooterItem[]) => patch({ footerItems: next });

  // Nearby places
  const nearbyPlaces = (draft.nearbyPlaces && draft.nearbyPlaces.length > 0) ? draft.nearbyPlaces : DEFAULT_NEARBY_PLACES;
  const setNearbyPlaces = (next: NearbyPlace[]) => patch({ nearbyPlaces: next });

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      <Toaster position="bottom-right" />

      <div>
        <h2 className="text-2xl font-bold serif flex items-center gap-3">
          <SettingsIcon size={26} className="text-eqc-green" />
          Global Settings
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Configuration that affects the whole app. All times shown in Western Australia (AWST, UTC+8).</p>
      </div>

      {/* ===== Carousel ===== */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2"><ImageIcon size={16} /> Carousel</h3>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Default slide duration (seconds)</label>
                <input type="number" min={1} max={120} step={1}
                  value={msToSeconds(draft.carouselSlideDurationMs)}
                  onChange={(e) => patch({ carouselSlideDurationMs: secondsToMs(Math.max(1, Number(e.target.value) || msToSeconds(DEFAULT_SETTINGS.carouselSlideDurationMs))) })}
                  className="w-full p-2.5 border rounded-lg" />
                <p className="text-xs text-eqc-muted mt-1">Default: {msToSeconds(DEFAULT_SETTINGS.carouselSlideDurationMs)}s. Override per-slide from the Carousel tab.</p>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Transition</label>
                <select value={draft.carouselTransition}
                  onChange={(e) => patch({ carouselTransition: e.target.value as CarouselTransition })}
                  className="w-full p-2.5 border rounded-lg">
                  {TRANSITION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-xs text-eqc-muted mt-1">{TRANSITION_OPTIONS.find(o => o.value === draft.carouselTransition)?.description}</p>
              </div>
            </div>
          </div>
          <CarouselLivePreview transition={draft.carouselTransition} durationMs={draft.carouselSlideDurationMs} />
        </div>
      </section>

      {/* ===== Daily reset ===== */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600">Daily Reset</h3>
        <div>
          <label className="block text-xs font-bold mb-1">Reset time</label>
          <input type="time" value={hourToTime(draft.resetTimeHour)}
            onChange={(e) => patch({ resetTimeHour: timeToHour(e.target.value) })}
            className="w-40 p-2.5 border rounded-lg" />
          <p className="text-xs text-eqc-muted mt-1">All rooms reset to "Available" at this time daily, <span className="font-bold">Western Australia time (AWST, UTC+8)</span>. Default: 10:00 PM.</p>
        </div>
      </section>

      {/* ===== Campus floor plan ===== */}
      <FloorPlanSection draft={draft} patch={patch} />

      {/* ===== Footer editor ===== */}
      <FooterEditor items={footerItems} onChange={setFooterItems} />

      {/* ===== Campus & Nearby ===== */}
      <NearbyEditor places={nearbyPlaces} onChange={setNearbyPlaces} />

      {/* ===== WiFi ===== */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2"><Wifi size={16} /> Campus WiFi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">SSID</label>
            <input value={draft.wifiSsid} onChange={(e) => patch({ wifiSsid: e.target.value })}
              className="w-full p-2.5 border rounded-lg" placeholder="EQC-network" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Password</label>
            <input value={draft.wifiPassword} onChange={(e) => patch({ wifiPassword: e.target.value })}
              className="w-full p-2.5 border rounded-lg font-mono" placeholder="Leave blank for open network" />
          </div>
        </div>
        <p className="text-xs text-eqc-muted">Displayed on the lobby header and mobile companion view.</p>
      </section>

      {/* ===== Contacts ===== */}
      <section className="bg-white rounded-2xl border p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2"><Phone size={16} /> Contact Directory</h3>
          <button onClick={addContact} className="text-eqc-green font-bold text-sm flex items-center gap-1 hover:bg-eqc-green/5 px-3 py-1.5 rounded-lg">
            <Plus size={16} /> Add
          </button>
        </div>
        {draft.contacts.length === 0 ? (
          <p className="text-sm text-eqc-muted italic">No contacts yet.</p>
        ) : (
          <div className="space-y-3">
            {draft.contacts.map((c, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={c.name} onChange={(e) => updateContact(idx, { name: e.target.value })} placeholder="Name" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
                  <input value={c.role} onChange={(e) => updateContact(idx, { role: e.target.value })} placeholder="Role" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
                  <input value={c.email} onChange={(e) => updateContact(idx, { email: e.target.value })} placeholder="email@example.com" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
                  <div className="flex gap-2">
                    <input value={c.phone || ''} onChange={(e) => updateContact(idx, { phone: e.target.value })} placeholder="Phone (optional)" className="flex-1 px-2 py-1.5 border rounded text-sm bg-white" />
                    <button onClick={() => removeContact(idx)} className="text-red-500 p-1.5 hover:bg-red-50 rounded shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Save bar ===== */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {dirty ? (
            <><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-amber-700 font-bold">Unsaved changes</span></>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-gray-500">All changes saved</span></>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={handleRevert} disabled={!dirty} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Revert</button>
          <button onClick={handleSave} disabled={!dirty} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Live carousel preview ---

const PREVIEW_VARIANTS = {
  slide:     { initial: { x: '100%', opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: '-100%', opacity: 0 } },
  fade:      { initial: { opacity: 0 },             animate: { opacity: 1 },       exit: { opacity: 0 } },
  crossfade: { initial: { opacity: 0, scale: 1.02 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.98 } },
  zoom:      { initial: { opacity: 0, scale: 1.15 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 } },
  kenburns:  { initial: { opacity: 0, scale: 1.0 },  animate: { opacity: 1, scale: 1.08 }, exit: { opacity: 0, scale: 1.12 } },
};

function CarouselLivePreview({ transition, durationMs }: { transition: CarouselTransition; durationMs: number }) {
  const items = useCarousel();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    setIdx(i => (i >= items.length ? 0 : i));
    const id = setTimeout(() => setIdx(i => (i + 1) % items.length), durationMs);
    return () => clearTimeout(id);
  }, [items, idx, durationMs]);

  if (items.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 italic">
        Upload images in the Carousel tab to see a preview.
      </div>
    );
  }

  const v = PREVIEW_VARIANTS[transition];
  const current = items[idx];
  return (
    <div className="aspect-[4/3] bg-gray-100 border border-gray-200 rounded-xl overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.img
          key={current.id}
          src={current.imageUrl}
          initial={v.initial}
          animate={v.animate}
          exit={v.exit}
          transition={{ duration: transition === 'kenburns' ? Math.min(8, durationMs / 1000) : 0.8 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      <span className="absolute bottom-2 left-2 right-2 text-[10px] font-bold uppercase tracking-widest text-white bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
        Live preview · {transition} · {Math.round(durationMs / 1000)}s
      </span>
    </div>
  );
}

// --- Floor plan section ---

function FloorPlanSection({ draft, patch }: { draft: GlobalSettings; patch: (p: Partial<GlobalSettings>) => void }) {
  const fp = draft.floorPlan || DEFAULT_SETTINGS.floorPlan;
  const [editing, setEditing] = useState(false);

  return (
    <section className="bg-white rounded-2xl border p-6 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2"><Layout size={16} /> Campus Floor Plan</h3>
      <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-4 items-start">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="aspect-video w-full bg-gray-50 border border-gray-200 rounded-xl overflow-hidden relative group"
        >
          <img src={fp.imageUrl} alt="Campus floor plan" className={`w-full h-full object-cover ${fp.hoverAnimation ? 'animate-float-preview' : ''}`} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-bold bg-eqc-green px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Pencil size={14} /> Edit floor plan
            </span>
          </div>
          <style>{`
            @keyframes float-preview { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
            .animate-float-preview { animation: float-preview 4s ease-in-out infinite; }
          `}</style>
        </button>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={fp.hoverAnimation}
              onChange={(e) => patch({ floorPlan: { ...fp, hoverAnimation: e.target.checked } })}
              className="w-4 h-4 accent-eqc-green"
            />
            <span className="font-bold">Enable floating animation</span>
          </label>
          <p className="text-xs text-eqc-muted">Gives the lobby's floor plan tile a subtle floating motion.</p>
        </div>
      </div>

      {editing && (
        <FloorPlanEditor
          initialUrl={fp.imageUrl}
          initialOriginalUrl={fp.originalImageUrl}
          onClose={() => setEditing(false)}
          onSave={(imageUrl, originalImageUrl) => {
            patch({ floorPlan: { ...fp, imageUrl, originalImageUrl: originalImageUrl ?? fp.originalImageUrl } });
            setEditing(false);
          }}
        />
      )}
    </section>
  );
}

function FloorPlanEditor({
  initialUrl, initialOriginalUrl, onClose, onSave,
}: {
  initialUrl: string;
  initialOriginalUrl?: string;
  onClose: () => void;
  onSave: (imageUrl: string, originalImageUrl?: string) => void;
}) {
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load the original image (or current image) into the cropper.
  useEffect(() => {
    const src = initialOriginalUrl || initialUrl;
    let cancelled = false;
    (async () => {
      try {
        const blob = await fetch(src).then(r => r.blob());
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = () => reject(fr.error);
          fr.readAsDataURL(blob);
        });
        if (cancelled) return;
        setSourceDataUrl(dataUrl);
        setOriginalBlob(blob);
      } catch {
        toast.error('Could not load floor plan image');
      }
    })();
    return () => { cancelled = true; };
  }, [initialUrl, initialOriginalUrl]);

  const onCropComplete = useCallback((_: Area, area: Area) => { setCroppedAreaPixels(area); }, []);

  const handleSelectReplacement = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    const dataUrl = await readFileAsDataURL(file);
    setSourceDataUrl(dataUrl);
    setOriginalBlob(await fetch(dataUrl).then(r => r.blob()));
    setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!sourceDataUrl || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const outputHeight = Math.round(FLOOR_PLAN_OUTPUT_WIDTH / FLOOR_PLAN_ASPECT);
      const blob = await getCroppedBlob(sourceDataUrl, croppedAreaPixels, FLOOR_PLAN_OUTPUT_WIDTH, outputHeight, rotation, 'webp', 0.85);
      const id = `floorPlan_${Date.now()}`;
      const cropPath = `floorplan/${id}.webp`;
      const originalPath = originalBlob ? `floorplan/${id}-original.${guessExt(originalBlob.type)}` : null;
      const [imageUrl, originalImageUrl] = await Promise.all([
        uploadImage(blob, cropPath),
        originalPath && originalBlob ? uploadImage(originalBlob, originalPath).catch(() => undefined) : Promise.resolve(undefined),
      ]);
      onSave(imageUrl, originalImageUrl);
      toast.success('Floor plan updated');

      // best-effort cleanup of previous custom upload
      if (initialUrl && initialUrl.includes('floorplan/')) {
        try { await deleteImage(initialUrl); } catch { /* ignore */ }
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center">
          <div>
            <h3 className="text-lg font-display font-bold">Crop campus floor plan</h3>
            <p className="text-xs text-eqc-muted mt-0.5">Saved at 16:9 to match the lobby tile.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="relative h-[55vh] bg-gray-100">
          {sourceDataUrl && (
            <Cropper
              image={sourceDataUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={FLOOR_PLAN_ASPECT}
              onCropChange={(c) => { setCrop(c); setDirty(true); }}
              onZoomChange={(z) => { setZoom(z); setDirty(true); }}
              onRotationChange={(r) => { setRotation(r); setDirty(true); }}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          )}
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 w-16">Zoom</span>
            <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => { setZoom(Number(e.target.value)); setDirty(true); }} className="flex-1 accent-eqc-green" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 w-16">Rotate</span>
            <input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => { setRotation(Number(e.target.value)); setDirty(true); }} className="flex-1 accent-eqc-green" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer border border-gray-200">
              <Upload size={14} /> Replace image
              <input type="file" accept="image/*" className="hidden" onChange={handleSelectReplacement} />
            </label>
            <div className="flex gap-2 ml-auto">
              <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={!dirty || saving} className="px-5 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2 disabled:opacity-50">
                <Check size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function guessExt(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('svg')) return 'svg';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

// --- Footer editor ---

function FooterEditor({ items, onChange }: { items: FooterItem[]; onChange: (next: FooterItem[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = () => onChange([
    ...items,
    { id: `footer_${Date.now()}`, icon: 'Star', iconColor: '#1a7a54', text: '' },
  ]);

  const handleUpdate = (id: string, patch: Partial<FooterItem>) => {
    onChange(items.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const handleRemove = (id: string) => onChange(items.filter(it => it.id !== id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onChange(arrayMove(items, oldIdx, newIdx));
  };

  return (
    <section className="bg-white rounded-2xl border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2"><Layout size={16} /> Footer Items</h3>
        <button onClick={handleAdd} className="text-eqc-green font-bold text-sm flex items-center gap-1 hover:bg-eqc-green/5 px-3 py-1.5 rounded-lg">
          <Plus size={16} /> Add item
        </button>
      </div>

      {/* Live preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-1 bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-eqc-muted">Live preview</div>
        <div className="bg-white px-4 py-2 flex items-center gap-x-5 gap-y-1 flex-wrap text-[11px] text-eqc-muted">
          {items.map((it) => {
            const Icon = getLucideIcon(it.icon);
            return (
              <div key={it.id} className="flex items-center gap-1.5">
                <Icon size={12} style={{ color: it.iconColor }} />
                <span className="font-medium">{it.text || <span className="italic text-gray-400">(empty)</span>}</span>
              </div>
            );
          })}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((it) => (
              <FooterItemRow key={it.id} item={it} onUpdate={handleUpdate} onRemove={handleRemove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function FooterItemRow({ item, onUpdate, onRemove }: { item: FooterItem; onUpdate: (id: string, patch: Partial<FooterItem>) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
      <button {...attributes} {...listeners} className="text-gray-400 cursor-grab active:cursor-grabbing" aria-label="Drag to reorder">
        <GripVertical size={16} />
      </button>
      <IconPicker
        value={item.icon}
        onChange={(name) => onUpdate(item.id, { icon: name })}
        accentColor={item.iconColor}
      />
      <input
        type="color"
        value={item.iconColor}
        onChange={(e) => onUpdate(item.id, { iconColor: e.target.value })}
        className="w-9 h-9 rounded cursor-pointer border border-gray-200 p-0.5 shrink-0"
        title="Icon colour"
      />
      <input
        value={item.text}
        onChange={(e) => onUpdate(item.id, { text: e.target.value })}
        placeholder="e.g. Lost & Found: Breakout area"
        className="flex-1 min-w-0 px-2 py-1.5 border rounded text-sm bg-white"
      />
      <button onClick={() => onRemove(item.id)} className="text-red-500 p-1.5 hover:bg-red-50 rounded shrink-0">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// --- Nearby editor ---

function NearbyEditor({ places, onChange }: { places: NearbyPlace[]; onChange: (next: NearbyPlace[]) => void }) {
  const handleAdd = () => onChange([
    ...places,
    { id: `place_${Date.now()}`, name: '', category: 'cafe', walkMinutes: undefined },
  ]);

  const handleUpdate = (id: string, patch: Partial<NearbyPlace>) => {
    onChange(places.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const handleRemove = (id: string) => onChange(places.filter(p => p.id !== id));

  return (
    <section className="bg-white rounded-2xl border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2"><MapPin size={16} /> Campus & Nearby</h3>
        <button onClick={handleAdd} className="text-eqc-green font-bold text-sm flex items-center gap-1 hover:bg-eqc-green/5 px-3 py-1.5 rounded-lg">
          <Plus size={16} /> Add place
        </button>
      </div>
      <p className="text-xs text-eqc-muted">Shown on the lobby's Campus & Nearby tile. The first 4 entries per category appear.</p>

      {places.length === 0 ? (
        <p className="text-sm text-eqc-muted italic">No places yet.</p>
      ) : (
        <div className="space-y-2">
          {places.map((p) => (
            <div key={p.id} className="bg-gray-50 p-3 rounded-lg grid grid-cols-1 sm:grid-cols-[1fr_160px_100px_40px] gap-2 items-center">
              <input value={p.name} onChange={(e) => handleUpdate(p.id, { name: e.target.value })} placeholder="e.g. Pony Express Cafe" className="w-full px-2 py-1.5 border rounded text-sm bg-white" />
              <select value={p.category} onChange={(e) => handleUpdate(p.id, { category: e.target.value as NearbyPlace['category'] })} className="w-full px-2 py-1.5 border rounded text-sm bg-white">
                {NEARBY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={p.walkMinutes ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleUpdate(p.id, { walkMinutes: v === '' ? undefined : Number(v) });
                  }}
                  placeholder="—"
                  className="w-16 px-2 py-1.5 border rounded text-sm bg-white text-center tabular-nums"
                />
                <span className="text-xs text-eqc-muted">min walk</span>
              </div>
              <button onClick={() => handleRemove(p.id)} className="text-red-500 p-1.5 hover:bg-red-50 rounded justify-self-end">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
