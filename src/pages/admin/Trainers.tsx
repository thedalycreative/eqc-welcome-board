import { useState, useCallback, FormEvent } from 'react';
import { Users, Plus, Trash2, Edit3, X, Check, Upload, ImageOff } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTrainers } from '../../lib/hooks';
import { uploadImage, readFileAsDataURL, getCroppedBlob, deleteImage } from '../../lib/storage';
import type { Trainer } from '../../lib/types';

interface CropModalState {
  srcDataUrl: string;
  file: File;
  name: string;
  bio: string;
  quote: string;
  editingId?: string;
  existingPhotoUrl?: string;
}

export default function AdminTrainers() {
  const trainers = useTrainers();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [cropState, setCropState] = useState<CropModalState | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPx: Area) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const openAddForm = () => {
    setEditingTrainer(null);
    setShowAddForm(true);
  };

  const handleFileSelect = async (
    file: File,
    name: string,
    bio: string,
    quote: string,
    editingId?: string,
    existingPhotoUrl?: string
  ) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const dataUrl = await readFileAsDataURL(file);
    setCropState({ srcDataUrl: dataUrl, file, name, bio, quote, editingId, existingPhotoUrl });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropConfirm = async () => {
    if (!cropState || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropState.srcDataUrl, croppedAreaPixels, 512);
      const trainerId = cropState.editingId || `trainer_${Date.now()}`;
      const path = `trainers/${trainerId}.jpg`;
      const photoUrl = await uploadImage(blob, path);

      await setDoc(doc(db, 'trainers', trainerId), {
        id: trainerId,
        name: cropState.name,
        photoUrl,
        bio: cropState.bio || undefined,
        quote: cropState.quote || undefined,
        active: true,
        createdAt: cropState.editingId ? undefined : new Date().toISOString(),
      } as Trainer, { merge: true });

      toast.success(cropState.editingId ? 'Trainer updated' : 'Trainer added');
      setCropState(null);
      setShowAddForm(false);
      setEditingTrainer(null);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveWithoutPhoto = async (
    name: string,
    bio: string,
    quote: string,
    editingId?: string
  ) => {
    setUploading(true);
    try {
      const trainerId = editingId || `trainer_${Date.now()}`;
      await setDoc(doc(db, 'trainers', trainerId), {
        id: trainerId,
        name,
        bio: bio || undefined,
        quote: quote || undefined,
        active: true,
        createdAt: editingId ? undefined : new Date().toISOString(),
      }, { merge: true });
      toast.success(editingId ? 'Trainer updated' : 'Trainer added');
      setShowAddForm(false);
      setEditingTrainer(null);
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (trainer: Trainer) => {
    if (!confirm(`Delete ${trainer.name}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'trainers', trainer.id));
      if (trainer.photoUrl) {
        try { await deleteImage(trainer.photoUrl); } catch { /* ignore */ }
      }
      toast.success('Trainer deleted');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const toggleActive = async (trainer: Trainer) => {
    try {
      await setDoc(doc(db, 'trainers', trainer.id), { active: !trainer.active }, { merge: true });
      toast.success(trainer.active ? 'Marked inactive' : 'Marked active');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Toaster position="bottom-right" />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-3">
            <Users size={26} className="text-eqc-green" />
            Trainer Management
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Add and manage trainer profiles. Photos appear next to their name on the lobby dashboard.</p>
        </div>
        <button onClick={openAddForm} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
          <Plus size={18} /> Add Trainer
        </button>
      </div>

      {trainers.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No trainers yet</h3>
          <p className="text-sm text-eqc-muted mb-4">Add your first trainer to get started.</p>
          <button onClick={openAddForm} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
            <Plus size={18} /> Add your first trainer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map(trainer => (
            <div key={trainer.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${!trainer.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 shrink-0 flex items-center justify-center">
                  {trainer.photoUrl ? (
                    <img src={trainer.photoUrl} alt={trainer.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; e.currentTarget.parentElement!.querySelector('.fallback-icon')?.classList.remove('hidden'); }} />
                  ) : null}
                  <ImageOff size={24} className={`text-gray-300 fallback-icon ${trainer.photoUrl ? 'hidden' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{trainer.name}</h3>
                  {trainer.bio && <p className="text-xs text-eqc-muted mt-1 line-clamp-2">{trainer.bio}</p>}
                  {trainer.quote && <p className="text-xs italic text-eqc-green mt-2">"{trainer.quote}"</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => toggleActive(trainer)} className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${trainer.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {trainer.active ? 'Active' : 'Inactive'}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingTrainer(trainer); setShowAddForm(true); }} className="text-blue-500 p-1.5 hover:bg-blue-50 rounded">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(trainer)} className="text-red-500 p-1.5 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <TrainerForm
          existing={editingTrainer}
          onCancel={() => { setShowAddForm(false); setEditingTrainer(null); }}
          onSelectFile={handleFileSelect}
          onSaveNoPhoto={handleSaveWithoutPhoto}
        />
      )}

      {cropState && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="text-lg font-display font-bold">Crop trainer photo</h3>
              <button onClick={() => setCropState(null)} className="p-2 hover:bg-gray-100 rounded-full" disabled={uploading}>
                <X size={20} />
              </button>
            </div>
            <div className="relative h-96 bg-gray-100">
              <Cropper
                image={cropState.srcDataUrl}
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
                <button onClick={() => setCropState(null)} disabled={uploading} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleCropConfirm} disabled={uploading} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2 disabled:opacity-50">
                  <Check size={16} /> {uploading ? 'Uploading…' : 'Save Trainer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Trainer Form (add/edit dialog) ---

interface TrainerFormProps {
  existing: Trainer | null;
  onCancel: () => void;
  onSelectFile: (file: File, name: string, bio: string, quote: string, editingId?: string, existingPhotoUrl?: string) => void;
  onSaveNoPhoto: (name: string, bio: string, quote: string, editingId?: string) => void;
}

function TrainerForm({ existing, onCancel, onSelectFile, onSaveNoPhoto }: TrainerFormProps) {
  const [name, setName] = useState(existing?.name || '');
  const [bio, setBio] = useState(existing?.bio || '');
  const [quote, setQuote] = useState(existing?.quote || '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!name.trim()) {
      toast.error('Enter a name first');
      return;
    }
    const file = e.target.files?.[0];
    if (file) onSelectFile(file, name.trim(), bio.trim(), quote.trim(), existing?.id, existing?.photoUrl);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    onSaveNoPhoto(name.trim(), bio.trim(), quote.trim(), existing?.id);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-display font-bold">{existing ? 'Edit trainer' : 'Add trainer'}</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-3 border rounded-lg" placeholder="e.g. Tim" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">One-liner bio</label>
            <input value={bio} onChange={(e) => setBio(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">Favourite quote</label>
            <input value={quote} onChange={(e) => setQuote(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Optional" />
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
            <label className="cursor-pointer inline-flex items-center gap-2 text-sm font-bold text-eqc-green hover:text-eqc-green/80">
              <Upload size={18} />
              {existing?.photoUrl ? 'Replace photo' : 'Upload trainer photo'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
            <p className="text-xs text-eqc-muted mt-2">Will open a crop tool. JPEG/PNG up to ~10MB.</p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90">
              Save without photo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
