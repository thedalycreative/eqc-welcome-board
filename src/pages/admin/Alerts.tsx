import { useState, useEffect, FormEvent } from 'react';
import { Plus, Megaphone, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAnnouncements } from '../../lib/hooks';
import type { Announcement } from '../../lib/types';

type StatusMsg = { text: string; type: 'success' | 'error' } | null;

export default function AdminAlerts() {
  const announcements = useAnnouncements();
  const [statusMessage, setStatusMessage] = useState<StatusMsg>(null);

  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  const createAlert = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const text = formData.get('text') as string;
    const color = formData.get('color') as string;
    const duration = parseInt(formData.get('duration') as string) || 1;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);
    const id = Date.now();
    try {
      await setDoc(doc(db, 'announcements', `ann_${id}`), {
        text,
        color,
        id,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
      e.currentTarget.reset();
      setStatusMessage({ text: 'Alert posted!', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to post alert.', type: 'error' });
    }
  };

  const deleteAlert = async (ann: Announcement) => {
    if (!confirm(`Delete this alert?\n\n"${ann.text}"`)) return;
    try {
      await deleteDoc(doc(db, 'announcements', `ann_${ann.id}`));
      setStatusMessage({ text: 'Alert removed.', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to delete alert.', type: 'error' });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold serif flex items-center gap-3">
          <Megaphone size={26} className="text-eqc-green" />
          Manage Alerts
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Scrolling announcements that appear at the top of every screen.</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus size={18} className="text-eqc-green" /> Create Alert
        </h3>
        <form onSubmit={createAlert} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Alert Text</label>
            <input name="text" required className="w-full p-3 border rounded-lg" placeholder="e.g. Campus closed this Friday for public holiday" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Banner Colour</label>
              <select name="color" className="w-full p-3 border rounded-lg" defaultValue="bg-eqc-green">
                <option value="bg-eqc-green">EQC Green</option>
                <option value="bg-red-600">Urgent Red</option>
                <option value="bg-blue-600">Info Blue</option>
                <option value="bg-orange-500">Warning Orange</option>
                <option value="bg-purple-600">Special Purple</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Duration (Days)</label>
              <input name="duration" type="number" min="1" max="30" defaultValue="1" className="w-full p-3 border rounded-lg" />
            </div>
          </div>
          <button type="submit" className="w-full bg-eqc-green text-white py-3 rounded-xl font-bold hover:bg-eqc-green/90 transition-all">
            Post Alert
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Megaphone size={20} className="text-eqc-green" /> Active Alerts ({announcements.length})
        </h3>
        {announcements.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Megaphone size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-eqc-muted italic">No active alerts. Create one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-white p-5 rounded-xl border flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${ann.color}`} />
                  <div>
                    <p className="font-bold">{ann.text}</p>
                    <p className="text-xs text-eqc-muted">Expires: {new Date(ann.expiresAt).toLocaleString()}</p>
                  </div>
                </div>
                <button onClick={() => deleteAlert(ann)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

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
