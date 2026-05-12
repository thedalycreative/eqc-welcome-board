import { useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, ChevronUp, ChevronDown, Upload } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useCarousel } from '../../lib/hooks';
import { uploadImage, deleteImage } from '../../lib/storage';
import type { CarouselItem } from '../../lib/types';

export default function AdminCarousel() {
  const items = useCarousel();
  const [uploading, setUploading] = useState(false);
  const [captionEditId, setCaptionEditId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const baseOrder = items.length;
      let i = 0;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`Skipping non-image: ${file.name}`);
          continue;
        }
        const id = `carousel_${Date.now()}_${i}`;
        const path = `carousel/${id}.${file.name.split('.').pop() || 'jpg'}`;
        const imageUrl = await uploadImage(file, path);
        await setDoc(doc(db, 'carousel', id), {
          id,
          imageUrl,
          caption: '',
          order: baseOrder + i,
          createdAt: new Date().toISOString(),
        } as CarouselItem);
        i++;
      }
      toast.success(`${i} image${i === 1 ? '' : 's'} uploaded`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (item: CarouselItem) => {
    if (!confirm('Delete this image from the carousel?')) return;
    try {
      await deleteDoc(doc(db, 'carousel', item.id));
      if (item.imageUrl) {
        try { await deleteImage(item.imageUrl); } catch { /* ignore */ }
      }
      toast.success('Image removed');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleReorder = async (item: CarouselItem, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const swap = items[swapIdx];
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'carousel', item.id), { order: swap.order }, { merge: true });
      batch.set(doc(db, 'carousel', swap.id), { order: item.order }, { merge: true });
      await batch.commit();
    } catch (err: any) {
      toast.error(err.message || 'Reorder failed');
    }
  };

  const saveCaption = async (item: CarouselItem) => {
    try {
      await setDoc(doc(db, 'carousel', item.id), { caption: captionDraft }, { merge: true });
      setCaptionEditId(null);
      setCaptionDraft('');
      toast.success('Caption saved');
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Toaster position="bottom-right" />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-3">
            <ImageIcon size={26} className="text-eqc-green" />
            Campus Life Carousel
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Photos rotate on the lobby dashboard. Use the arrows to set display order.</p>
        </div>
        <label className="cursor-pointer bg-eqc-green text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
          <Upload size={18} />
          {uploading ? 'Uploading…' : 'Upload Images'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No photos yet</h3>
          <p className="text-sm text-eqc-muted">Upload campus life photos to display in rotation on the lobby screen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="aspect-video bg-gray-100">
                <img src={item.imageUrl} alt={item.caption || 'Carousel image'} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 space-y-2">
                {captionEditId === item.id ? (
                  <div className="flex gap-2">
                    <input value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="Caption…" autoFocus />
                    <button onClick={() => saveCaption(item)} className="px-3 py-1.5 bg-eqc-green text-white text-xs font-bold rounded">Save</button>
                    <button onClick={() => { setCaptionEditId(null); setCaptionDraft(''); }} className="px-3 py-1.5 text-gray-500 text-xs font-bold">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setCaptionEditId(item.id); setCaptionDraft(item.caption || ''); }}
                    className="text-sm w-full text-left hover:text-eqc-green transition-colors"
                  >
                    {item.caption || <span className="italic text-eqc-muted">Add caption…</span>}
                  </button>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleReorder(item, 'up')} disabled={idx === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => handleReorder(item, 'down')} disabled={idx === items.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                      <ChevronDown size={16} />
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">#{idx + 1}</span>
                  </div>
                  <button onClick={() => handleDelete(item)} className="text-red-500 p-1.5 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
