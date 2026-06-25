import { useState, useCallback, useEffect, type ChangeEvent, type CSSProperties } from 'react';
import { Image as ImageIcon, Trash2, Upload, X, Check, Pencil, GripVertical } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { db } from '../../lib/firebase';
import { useCarousel, useGlobalSettings } from '../../lib/hooks';
import { uploadImage, deleteImage, readFileAsDataURL, getCroppedBlob } from '../../lib/storage';
import type { CarouselItem } from '../../lib/types';
import ConfirmDialog from '../../components/ConfirmDialog';

// Carousel tile on the lobby uses 4:3 (landscape) so we crop to match.
const CAROUSEL_ASPECT = 4 / 3;
const CAROUSEL_OUTPUT_WIDTH = 1280;
const CAROUSEL_OUTPUT_QUALITY = 0.72;

interface UploadCropState {
  srcDataUrl: string;
  fileName: string;
}

export default function AdminCarousel() {
  const items: CarouselItem[] = useCarousel();
  const [settings] = useGlobalSettings();
  const [uploading, setUploading] = useState(false);

  // Upload flow crop state
  const [cropState, setCropState] = useState<UploadCropState | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Per-tile editing
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CarouselItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const resetCropControls = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPx: Area) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleSelectFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setCropState({ srcDataUrl: dataUrl, fileName: file.name });
      resetCropControls();
    } catch {
      toast.error('Could not read file');
    }
  };

  const handleCropConfirm = async () => {
    if (!cropState || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const outputHeight = Math.round(CAROUSEL_OUTPUT_WIDTH / CAROUSEL_ASPECT);
      const blob = await getCroppedBlob(
        cropState.srcDataUrl,
        croppedAreaPixels,
        CAROUSEL_OUTPUT_WIDTH,
        outputHeight,
        rotation,
        'webp',
        CAROUSEL_OUTPUT_QUALITY,
      );

      // Also persist the original (un-cropped) image so it can be re-cropped later.
      const originalBlob = await fetch(cropState.srcDataUrl).then(r => r.blob());

      const id = `carousel_${Date.now()}`;
      const croppedPath = `carousel/${id}.webp`;
      const originalPath = `carousel/${id}-original.${guessExt(originalBlob.type)}`;

      const [imageUrl, originalImageUrl] = await Promise.all([
        uploadImage(blob, croppedPath),
        uploadImage(originalBlob, originalPath).catch(() => undefined),
      ]);

      await setDoc(doc(db, 'carousel', id), {
        id,
        imageUrl,
        originalImageUrl,
        caption: '',
        order: items.length,
        createdAt: new Date().toISOString(),
      } as CarouselItem);
      toast.success('Image cropped and uploaded');
      setCropState(null);
      resetCropControls();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirmed = async (item: CarouselItem) => {
    try {
      await deleteDoc(doc(db, 'carousel', item.id));
      if (item.imageUrl) { try { await deleteImage(item.imageUrl); } catch { /* ignore */ } }
      if (item.originalImageUrl) { try { await deleteImage(item.originalImageUrl); } catch { /* ignore */ } }
      toast.success('Image removed');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
    setConfirmDelete(null);
  };

  // Drag-and-drop ordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i: CarouselItem) => i.id === active.id);
    const newIdx = items.findIndex((i: CarouselItem) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(items, oldIdx, newIdx);
    try {
      const batch = writeBatch(db);
      reordered.forEach((it, idx) => {
        batch.set(doc(db, 'carousel', it.id), { order: idx }, { merge: true });
      });
      await batch.commit();
    } catch (err: any) {
      toast.error(err.message || 'Reorder failed');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Toaster position="bottom-right" />

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold serif flex items-center gap-3">
            <ImageIcon size={26} className="text-eqc-green" />
            Campus Life Carousel
          </h2>
          <p className="text-sm text-eqc-muted mt-1">
            Photos rotate on the lobby dashboard at 4:3 (landscape). Drag tiles to reorder. Click a tile to re-crop, replace, or change its caption and timing.
            <span className="block mt-1 text-xs text-eqc-muted/80">Global default slide duration: {Math.round((settings.carouselSlideDurationMs || 10000) / 1000)}s.</span>
          </p>
        </div>
        <label className="cursor-pointer bg-eqc-green text-white px-4 py-3 min-h-[44px] rounded-lg font-bold flex items-center gap-2 hover:bg-eqc-green/90 transition-colors w-full sm:w-auto justify-center">
          <Upload size={18} />
          {uploading ? 'Uploading…' : 'Upload Image'}
          <input type="file" accept="image/*" className="hidden" onChange={handleSelectFile} disabled={uploading} />
        </label>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No photos yet</h3>
          <p className="text-sm text-eqc-muted">Upload campus life photos to display in rotation on the lobby screen.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item, idx) => (
                <SortableCarouselCard
                  key={item.id}
                  item={item}
                  idx={idx}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => setConfirmDelete(item)}
                  defaultDurationMs={settings.carouselSlideDurationMs}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Upload crop modal */}
      {cropState && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 sm:p-5 border-b flex justify-between items-center shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-display font-bold truncate">Crop carousel image</h3>
                <p className="text-xs text-eqc-muted mt-0.5">Locked to the lobby tile ratio (4:3 landscape).</p>
              </div>
              <button
                onClick={() => { setCropState(null); resetCropControls(); }}
                className="p-2 hover:bg-gray-100 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
                disabled={uploading}
                aria-label="Cancel crop"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative h-[55vh] sm:h-96 bg-gray-100 shrink-0">
              <Cropper
                image={cropState.srcDataUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={CAROUSEL_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 w-16">Zoom</span>
                <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-eqc-green" />
                <span className="text-xs font-mono text-gray-500 w-10 text-right tabular-nums">{zoom.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 w-16">Rotate</span>
                <input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="flex-1 accent-eqc-green" />
                <span className="text-xs font-mono text-gray-500 w-10 text-right tabular-nums">{rotation}°</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-end pt-2">
                <button onClick={() => { setCropState(null); resetCropControls(); }} disabled={uploading} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 min-h-[44px]">
                  Cancel
                </button>
                <button onClick={handleCropConfirm} disabled={uploading} className="px-5 sm:px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2 disabled:opacity-50 min-h-[44px]">
                  <Check size={16} /> {uploading ? 'Uploading…' : 'Save crop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <CarouselItemEditor
          item={editingItem}
          onClose={() => setEditingItem(null)}
          defaultDurationMs={settings.carouselSlideDurationMs}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        tone="danger"
        title="Delete this image?"
        body="The image will be removed from the lobby carousel."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDeleteConfirmed(confirmDelete)}
      />
    </div>
  );
}

function guessExt(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

// --- Sortable tile ---

function SortableCarouselCard({
  item, idx, onEdit, onDelete, defaultDurationMs,
}: {
  item: CarouselItem;
  idx: number;
  onEdit: () => void;
  onDelete: () => void;
  defaultDurationMs: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const seconds = Math.round(((item.durationMs ?? defaultDurationMs) / 1000));
  const usingDefault = item.durationMs === undefined;

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-2xl border shadow-sm overflow-hidden group">
      <button
        type="button"
        className="block w-full text-left"
        onClick={onEdit}
        aria-label={`Edit carousel image ${idx + 1}`}
      >
        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
          <img src={item.imageUrl} alt={item.caption || 'Carousel image'} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-bold bg-eqc-green px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-opacity">
              <Pencil size={14} /> Edit
            </span>
          </div>
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest bg-white/90 text-gray-700 px-2 py-1 rounded">
            #{idx + 1}
          </span>
        </div>
      </button>
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {item.caption || <span className="italic text-eqc-muted">No caption</span>}
          </p>
          <p className="text-[10px] text-eqc-muted">
            {seconds}s {usingDefault ? <span className="opacity-60">(default)</span> : <span className="text-eqc-green font-bold">(custom)</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            {...attributes}
            {...listeners}
            className="text-gray-400 p-1.5 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-500 p-1.5 hover:bg-red-50 rounded">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Per-tile edit modal ---

interface DraftState {
  caption: string;
  durationSeconds: string; // string so empty == use default
  imageUrl: string;
  croppedAreaPixels: Area | null;
  zoom: number;
  rotation: number;
  // If user uploaded a brand-new file to replace, this is the new data URL.
  replacementDataUrl: string | null;
}

function CarouselItemEditor({ item, onClose, defaultDurationMs }: { item: CarouselItem; onClose: () => void; defaultDurationMs: number }) {
  const [draft, setDraft] = useState<DraftState>(() => ({
    caption: item.caption || '',
    durationSeconds: item.durationMs ? String(Math.round(item.durationMs / 1000)) : '',
    imageUrl: item.imageUrl,
    croppedAreaPixels: null,
    zoom: 1,
    rotation: 0,
    replacementDataUrl: null,
  }));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [recropping, setRecropping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const original = item.originalImageUrl || item.imageUrl;
  const cropSource = draft.replacementDataUrl || original;

  const dirty =
    draft.caption !== (item.caption || '') ||
    draft.durationSeconds !== (item.durationMs ? String(Math.round(item.durationMs / 1000)) : '') ||
    !!draft.replacementDataUrl ||
    !!draft.croppedAreaPixels;

  // Esc-to-close (with dirty guard)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') attemptClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, recropping]);

  const attemptClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const onCropComplete = useCallback((_: Area, area: Area) => {
    setDraft(d => ({ ...d, croppedAreaPixels: area }));
  }, []);

  const handleReplaceFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setDraft(d => ({ ...d, replacementDataUrl: dataUrl, croppedAreaPixels: null, zoom: 1, rotation: 0 }));
      setCrop({ x: 0, y: 0 });
      setRecropping(true);
    } catch {
      toast.error('Could not read file');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: Partial<CarouselItem> = {
        caption: draft.caption,
      };
      const secs = Number(draft.durationSeconds);
      if (draft.durationSeconds === '' || !Number.isFinite(secs) || secs <= 0) {
        patch.durationMs = undefined; // fall back to default
      } else {
        patch.durationMs = Math.round(secs * 1000);
      }

      // Re-crop / replace produces a new cropped output.
      const needNewImage = !!draft.replacementDataUrl || !!draft.croppedAreaPixels;
      if (needNewImage) {
        const source = cropSource;
        if (!draft.croppedAreaPixels) throw new Error('Please position the crop before saving.');
        const outputHeight = Math.round(CAROUSEL_OUTPUT_WIDTH / CAROUSEL_ASPECT);
        const blob = await getCroppedBlob(source, draft.croppedAreaPixels, CAROUSEL_OUTPUT_WIDTH, outputHeight, draft.rotation, 'webp', CAROUSEL_OUTPUT_QUALITY);
        const newCroppedPath = `carousel/${item.id}-${Date.now()}.webp`;
        const newImageUrl = await uploadImage(blob, newCroppedPath);
        patch.imageUrl = newImageUrl;

        if (draft.replacementDataUrl) {
          const originalBlob = await fetch(draft.replacementDataUrl).then(r => r.blob());
          const newOriginalPath = `carousel/${item.id}-original-${Date.now()}.${guessExt(originalBlob.type)}`;
          try {
            patch.originalImageUrl = await uploadImage(originalBlob, newOriginalPath);
          } catch {
            // ignore — keep prior original
          }
        }
      }

      await setDoc(doc(db, 'carousel', item.id), patch, { merge: true });

      // Best-effort cleanup of replaced original image, if it changed.
      if (patch.originalImageUrl && item.originalImageUrl && item.originalImageUrl !== patch.originalImageUrl) {
        try { await deleteImage(item.originalImageUrl); } catch { /* ignore */ }
      }

      toast.success('Carousel item updated');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  void defaultDurationMs;

  return (
    <div className="fixed inset-0 bg-black/80 z-[210] flex items-center justify-center p-3 sm:p-4" onClick={attemptClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 sm:p-5 border-b flex justify-between items-center shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-display font-bold">Edit carousel image</h3>
            <p className="text-xs text-eqc-muted mt-0.5">Re-position the crop, replace the image, change caption or per-slide duration.</p>
          </div>
          <button onClick={attemptClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto">
          {recropping || draft.replacementDataUrl ? (
            <div className="relative h-[40vh] bg-gray-100">
              <Cropper
                image={cropSource}
                crop={crop}
                zoom={draft.zoom}
                rotation={draft.rotation}
                aspect={CAROUSEL_ASPECT}
                onCropChange={setCrop}
                onZoomChange={(z) => setDraft(d => ({ ...d, zoom: z }))}
                onRotationChange={(r) => setDraft(d => ({ ...d, rotation: r }))}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>
          ) : (
            <div className="relative aspect-[4/3] bg-gray-100">
              <img src={draft.imageUrl} alt={draft.caption || 'Current'} className="w-full h-full object-cover" />
              <button
                onClick={() => { setRecropping(true); setDraft(d => ({ ...d, croppedAreaPixels: null, zoom: 1, rotation: 0 })); setCrop({ x: 0, y: 0 }); }}
                className="absolute bottom-3 right-3 px-3 py-2 text-xs font-bold text-white bg-eqc-green hover:bg-eqc-green/90 rounded-lg flex items-center gap-1.5"
              >
                <Pencil size={14} /> Re-crop
              </button>
            </div>
          )}

          <div className="p-4 sm:p-5 space-y-4">
            {(recropping || draft.replacementDataUrl) && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 w-16">Zoom</span>
                  <input type="range" min={1} max={4} step={0.05} value={draft.zoom} onChange={(e) => setDraft(d => ({ ...d, zoom: Number(e.target.value) }))} className="flex-1 accent-eqc-green" />
                  <span className="text-xs font-mono text-gray-500 w-10 text-right tabular-nums">{draft.zoom.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0 w-16">Rotate</span>
                  <input type="range" min={-180} max={180} step={1} value={draft.rotation} onChange={(e) => setDraft(d => ({ ...d, rotation: Number(e.target.value) }))} className="flex-1 accent-eqc-green" />
                  <span className="text-xs font-mono text-gray-500 w-10 text-right tabular-nums">{draft.rotation}°</span>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Caption</label>
              <input
                value={draft.caption}
                onChange={(e) => setDraft(d => ({ ...d, caption: e.target.value }))}
                placeholder="e.g. Friday afternoon CTF session"
                className="w-full p-2.5 border rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                  Slide duration (seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={draft.durationSeconds}
                  onChange={(e) => setDraft(d => ({ ...d, durationSeconds: e.target.value }))}
                  placeholder={`${Math.round(defaultDurationMs / 1000)} (default)`}
                  className="w-full p-2.5 border rounded-lg text-sm"
                />
                <p className="text-[10px] text-eqc-muted mt-1">Leave blank to use the global default.</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Replace image</label>
                <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-sm font-bold">
                  <Upload size={14} /> Choose file
                  <input type="file" accept="image/*" className="hidden" onChange={handleReplaceFile} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t bg-gray-50 flex items-center justify-between gap-2">
          <span className="text-xs text-eqc-muted">{dirty ? 'Unsaved changes' : 'No changes'}</span>
          <div className="flex gap-2">
            <button onClick={attemptClose} disabled={saving} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="px-5 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmDiscard}
          tone="warning"
          title="Discard your changes?"
          body="You have unsaved edits to this carousel image."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          altLabel="Save"
          onCancel={() => setConfirmDiscard(false)}
          onAlt={async () => { setConfirmDiscard(false); await handleSave(); }}
          onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        />
      </div>
    </div>
  );
}
