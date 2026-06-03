import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Plus, Trash2, X, Check, Upload, ImageOff, Pencil, MessageSquare, Linkedin, Mail, Github, KeyRound } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTrainers } from '../../lib/hooks';
import { uploadImage, readFileAsDataURL, getCroppedBlob, deleteImage } from '../../lib/storage';
import { nextTrainerPassword } from '../../lib/trainerPasswords';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Trainer, TrainerSocials } from '../../lib/types';

interface DraftTrainer {
  name: string;
  bio: string;
  quote: string;
  password: string;
  socials: TrainerSocials;
  // For photo: either keep current, replace with file pending crop, or already cropped.
  cropSourceDataUrl?: string;        // when re-cropping (current or replacement)
  pendingCroppedBlob?: Blob;         // saved crop staged for upload
  pendingOriginalBlob?: Blob;        // staged original to upload alongside
  pendingPhotoPreview?: string;      // dataURL of the latest cropped preview
}

function makeDraftFrom(existing: Trainer | null, fallbackPassword: string): DraftTrainer {
  return {
    name: existing?.name || '',
    bio: existing?.bio || '',
    quote: existing?.quote || '',
    password: existing?.password || fallbackPassword,
    socials: { ...(existing?.socials || {}) },
  };
}

function draftEquals(a: DraftTrainer, b: DraftTrainer): boolean {
  return (
    a.name === b.name &&
    a.bio === b.bio &&
    a.quote === b.quote &&
    a.password === b.password &&
    JSON.stringify(a.socials) === JSON.stringify(b.socials) &&
    !a.pendingCroppedBlob && !b.pendingCroppedBlob &&
    !a.cropSourceDataUrl && !b.cropSourceDataUrl
  );
}

export default function AdminTrainers() {
  const trainers = useTrainers();
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Trainer | null>(null);

  return (
    <div className="space-y-6 max-w-5xl">
      <Toaster position="bottom-right" />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-3">
            <Users size={26} className="text-eqc-green" />
            Trainer Management
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Click any trainer tile to edit. Each trainer gets an auto-generated login password (e.g. <span className="font-mono">Tim1</span>) that you can override below.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
          <Plus size={18} /> Add Trainer
        </button>
      </div>

      {trainers.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No trainers yet</h3>
          <p className="text-sm text-eqc-muted mb-4">Add your first trainer to get started.</p>
          <button onClick={() => setShowAddForm(true)} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
            <Plus size={18} /> Add your first trainer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map(trainer => (
            <button
              type="button"
              key={trainer.id}
              onClick={() => setEditingTrainer(trainer)}
              className="bg-white rounded-2xl border shadow-sm p-5 text-left hover:shadow-md hover:border-eqc-green/40 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 shrink-0 flex items-center justify-center">
                  {trainer.photoUrl ? (
                    <img src={trainer.photoUrl} alt={trainer.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <ImageOff size={24} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-2xl truncate group-hover:text-eqc-green transition-colors">{trainer.name}</h3>
                  {trainer.bio && <p className="text-xs text-eqc-muted mt-1 line-clamp-2">{trainer.bio}</p>}
                  {trainer.quote && <p className="text-xs italic text-eqc-green mt-2">"{trainer.quote}"</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-eqc-muted flex items-center gap-1.5">
                  <Pencil size={11} /> Click to edit
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(trainer); }}
                  className="text-red-500 p-1.5 hover:bg-red-50 rounded"
                  aria-label="Delete trainer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {(showAddForm || editingTrainer) && (
        <TrainerEditorModal
          trainer={editingTrainer}
          allTrainers={trainers}
          onClose={() => { setShowAddForm(false); setEditingTrainer(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        tone="danger"
        title={`Delete ${confirmDelete?.name || ''}?`}
        body="This cannot be undone. The trainer will disappear from the lobby and admin dropdowns."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await deleteDoc(doc(db, 'trainers', confirmDelete.id));
            if (confirmDelete.photoUrl) { try { await deleteImage(confirmDelete.photoUrl); } catch { /* ignore */ } }
            if (confirmDelete.originalPhotoUrl) { try { await deleteImage(confirmDelete.originalPhotoUrl); } catch { /* ignore */ } }
            toast.success('Trainer deleted');
          } catch (err: any) {
            toast.error(err.message || 'Delete failed');
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

// --- Editor modal ---

function TrainerEditorModal({
  trainer, allTrainers, onClose,
}: {
  trainer: Trainer | null;
  allTrainers: Trainer[];
  onClose: () => void;
}) {
  // Default password is computed when adding a new trainer or when the name is first entered.
  const fallbackPassword = useMemo(
    () => trainer?.password || nextTrainerPassword(allTrainers.filter(t => t.id !== trainer?.id), trainer?.name || 'User'),
    [trainer, allTrainers]
  );
  const initial = useMemo(() => makeDraftFrom(trainer, fallbackPassword), [trainer, fallbackPassword]);
  const [draft, setDraft] = useState<DraftTrainer>(initial);

  // Crop modal state
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = !draftEquals(draft, initial) || !!draft.pendingCroppedBlob || !!draft.pendingPhotoPreview;

  // If the user types a name on a NEW trainer (no existing password) and hasn't
  // explicitly edited the password, refresh the suggested password.
  useEffect(() => {
    if (trainer) return; // only on add
    setDraft(d => {
      // Only refresh if password equals the previous fallback (i.e. unchanged)
      const possibleFallback = nextTrainerPassword(allTrainers, d.name || 'User');
      if (d.password === fallbackPassword || d.password === '') {
        return { ...d, password: possibleFallback };
      }
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.name, trainer]);

  const onCropComplete = useCallback((_: Area, area: Area) => {
    setCroppedAreaPixels(area);
  }, []);

  const handleSelectReplacementFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    const dataUrl = await readFileAsDataURL(file);
    const originalBlob = await fetch(dataUrl).then(r => r.blob());
    setDraft(d => ({ ...d, cropSourceDataUrl: dataUrl, pendingOriginalBlob: originalBlob }));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropOpen(true);
  };

  const handleRecropExisting = async () => {
    const src = trainer?.originalPhotoUrl || trainer?.photoUrl;
    if (!src) { toast.error('No image to re-crop'); return; }
    // For Firebase storage URLs the cropper needs a CORS-friendly dataURL.
    try {
      const blob = await fetch(src).then(r => r.blob());
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(blob);
      });
      setDraft(d => ({ ...d, cropSourceDataUrl: dataUrl }));
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen(true);
    } catch (err: any) {
      toast.error('Could not load the original image for cropping. Try uploading a fresh photo.');
    }
  };

  const handleCropConfirm = async () => {
    if (!draft.cropSourceDataUrl || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedBlob(draft.cropSourceDataUrl, croppedAreaPixels, 512);
      const previewUrl = URL.createObjectURL(blob);
      setDraft(d => ({ ...d, pendingCroppedBlob: blob, pendingPhotoPreview: previewUrl }));
      setCropOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Crop failed');
    }
  };

  const attemptClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const handleSave = async () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const trainerId = trainer?.id || `trainer_${Date.now()}`;
      const docRef = doc(db, 'trainers', trainerId);

      const baseUpdate: Partial<Trainer> = {
        id: trainerId,
        name: draft.name.trim(),
        bio: draft.bio.trim() || undefined,
        quote: draft.quote.trim() || undefined,
        password: draft.password.trim() || undefined,
        socials: pruneSocials(draft.socials),
        active: trainer?.active ?? true,
        createdAt: trainer?.createdAt || new Date().toISOString(),
      };

      if (draft.pendingCroppedBlob) {
        const path = `trainers/${trainerId}.jpg`;
        const photoUrl = await uploadImage(draft.pendingCroppedBlob, path);
        baseUpdate.photoUrl = photoUrl;

        if (draft.pendingOriginalBlob) {
          const originalPath = `trainers/${trainerId}-original.${guessExt(draft.pendingOriginalBlob.type)}`;
          try { baseUpdate.originalPhotoUrl = await uploadImage(draft.pendingOriginalBlob, originalPath); } catch { /* ignore */ }
        }
      }

      await setDoc(docRef, baseUpdate, { merge: true });
      toast.success(trainer ? 'Trainer updated' : 'Trainer added');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Esc-to-close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cropOpen) { setCropOpen(false); return; }
        attemptClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, cropOpen]);

  const currentPhoto = draft.pendingPhotoPreview || trainer?.photoUrl;

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-3 sm:p-4" onClick={attemptClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-display font-bold">{trainer ? `Edit ${trainer.name}` : 'Add trainer'}</h3>
          <button onClick={attemptClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {/* Photo + crop controls */}
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 shrink-0 flex items-center justify-center">
              {currentPhoto ? (
                <img src={currentPhoto} alt={draft.name} className="w-full h-full object-cover object-top" />
              ) : (
                <ImageOff size={28} className="text-gray-300" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              {trainer && (
                <button type="button" onClick={handleRecropExisting} className="text-xs font-bold text-eqc-green hover:bg-eqc-green/5 px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <Pencil size={14} /> Re-crop current photo
                </button>
              )}
              <label className="text-xs font-bold text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer">
                <Upload size={14} /> Upload new photo
                <input type="file" accept="image/*" className="hidden" onChange={handleSelectReplacementFile} />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Name *</label>
            <input value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))} required autoFocus className="w-full p-3 border rounded-lg" placeholder="e.g. Tim" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Bio</label>
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft(d => ({ ...d, bio: e.target.value }))}
              rows={3}
              className="w-full p-3 border rounded-lg"
              placeholder="One or two lines about this trainer."
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Favourite quote</label>
            <input value={draft.quote} onChange={(e) => setDraft(d => ({ ...d, quote: e.target.value }))} className="w-full p-3 border rounded-lg" placeholder="Optional" />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 flex items-center gap-1.5"><KeyRound size={14} /> Login password</label>
            <input
              value={draft.password}
              onChange={(e) => setDraft(d => ({ ...d, password: e.target.value }))}
              className="w-full p-3 border rounded-lg font-mono"
              placeholder="Tim1"
            />
            <p className="text-[10px] text-eqc-muted mt-1">Used to sign in to the admin panel as this trainer. Defaults to <span className="font-mono">{nextTrainerPassword(allTrainers.filter(t => t.id !== trainer?.id), draft.name || 'User')}</span>; override here if needed.</p>
          </div>

          <fieldset className="border rounded-xl p-4 space-y-3">
            <legend className="text-xs font-bold uppercase tracking-widest text-gray-500 px-1">Socials (optional)</legend>
            <SocialInput label="Discord" icon={<MessageSquare size={14} />} value={draft.socials.discord || ''} onChange={(v) => setDraft(d => ({ ...d, socials: { ...d.socials, discord: v } }))} placeholder="e.g. timdaly#1234" />
            <SocialInput label="LinkedIn" icon={<Linkedin size={14} />} value={draft.socials.linkedin || ''} onChange={(v) => setDraft(d => ({ ...d, socials: { ...d.socials, linkedin: v } }))} placeholder="e.g. linkedin.com/in/timdaly" />
            <SocialInput label="Staff email" icon={<Mail size={14} />} value={draft.socials.staffEmail || ''} onChange={(v) => setDraft(d => ({ ...d, socials: { ...d.socials, staffEmail: v } }))} placeholder="e.g. tim@equinimcollege.com" />
            <SocialInput label="GitHub" icon={<Github size={14} />} value={draft.socials.github || ''} onChange={(v) => setDraft(d => ({ ...d, socials: { ...d.socials, github: v } }))} placeholder="e.g. timdaly" />
          </fieldset>
        </div>

        <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-2">
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

        {/* Crop modal */}
        {cropOpen && draft.cropSourceDataUrl && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4" onClick={() => setCropOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b flex justify-between items-center">
                <h3 className="text-lg font-display font-bold">Crop trainer photo</h3>
                <button onClick={() => setCropOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="relative h-96 bg-gray-100">
                <Cropper
                  image={draft.cropSourceDataUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="round"
                />
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Zoom</span>
                  <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-eqc-green" />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setCropOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleCropConfirm} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2">
                    <Check size={16} /> Apply crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmDiscard}
          tone="warning"
          title="Discard your changes?"
          body="You have unsaved edits to this trainer."
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

function pruneSocials(s: TrainerSocials): TrainerSocials | undefined {
  const out: TrainerSocials = {};
  if (s.discord?.trim()) out.discord = s.discord.trim();
  if (s.linkedin?.trim()) out.linkedin = s.linkedin.trim();
  if (s.staffEmail?.trim()) out.staffEmail = s.staffEmail.trim();
  if (s.github?.trim()) out.github = s.github.trim();
  return Object.keys(out).length === 0 ? undefined : out;
}

function guessExt(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

function SocialInput({ label, icon, value, onChange, placeholder }: { label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1 flex items-center gap-1.5">{icon} {label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full p-2 border rounded-lg text-sm" />
    </div>
  );
}
