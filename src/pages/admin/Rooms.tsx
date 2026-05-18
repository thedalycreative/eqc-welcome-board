import { useState, useEffect } from 'react';
import { Layout, Plus, X, Trash2, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRooms } from '../../lib/hooks';
import type { RoomAllocation } from '../../lib/types';

const TRAINER_SIGN_ON_URL = `${import.meta.env.BASE_URL}trainer-sign-on.html`;

const INITIAL_ROOMS: RoomAllocation[] = [
  { id: 1, roomName: 'Room 1', status: 'available' },
  { id: 2, roomName: 'Room 2', status: 'available' },
  { id: 3, roomName: 'Room 3', status: 'available' },
  { id: 4, roomName: 'Room 4', status: 'available' },
  { id: 5, roomName: 'Room 5', status: 'available' },
  { id: 6, roomName: 'Room 6', status: 'available' },
];

type StatusMsg = { text: string; type: 'success' | 'error' } | null;

export default function AdminRooms() {
  const [rooms] = useRooms(INITIAL_ROOMS);
  const [draftRooms, setDraftRooms] = useState<RoomAllocation[]>(rooms);
  const [statusMessage, setStatusMessage] = useState<StatusMsg>(null);
  const [dirty, setDirty] = useState(false);

  // Keep draft in sync when external updates come in AND we don't have unsaved changes.
  useEffect(() => {
    if (!dirty) setDraftRooms(rooms);
  }, [rooms, dirty]);

  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  const updateDraft = (idx: number, field: keyof RoomAllocation, value: string) => {
    setDirty(true);
    setDraftRooms(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = value || undefined;
      if (field === 'status' && value === 'available') {
        next[idx] = { ...next[idx], course: undefined, trainer: undefined, intake: undefined, topic: undefined };
      }
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
      await persist(draftRooms);
      setDirty(false);
      setStatusMessage({ text: 'Room changes saved.', type: 'success' });
    } catch {
      setStatusMessage({ text: 'Failed to save. Try again.', type: 'error' });
    }
  };

  const handleReset = () => {
    setDraftRooms(rooms);
    setDirty(false);
    setStatusMessage({ text: 'Reverted to last saved state.', type: 'success' });
  };

  const handleResetAll = async () => {
    const reset = rooms.map(r => ({ ...r, status: 'available' as const, course: undefined, trainer: undefined, intake: undefined, topic: undefined }));
    await persist(reset);
    setDraftRooms(reset);
    setDirty(false);
    setStatusMessage({ text: 'All rooms reset to available.', type: 'success' });
  };

  const handleAddRoom = () => {
    setDirty(true);
    setDraftRooms(prev => [...prev, { id: Date.now(), roomName: 'New Room', status: 'available' }]);
  };

  const handleClearRoom = (idx: number) => {
    setDirty(true);
    setDraftRooms(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], status: 'available', course: undefined, trainer: undefined, intake: undefined, topic: undefined };
      return next;
    });
  };

  const handleDeleteRoom = (id: number) => {
    setDirty(true);
    setDraftRooms(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold serif flex items-center gap-3">
            <Layout size={26} className="text-eqc-green" />
            Manage Room Allocations
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Changes save when you press Save. Trainer sign-ons still update rooms automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleResetAll} className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-100 transition-colors">
            <X size={18} /> Reset All
          </button>
          <button onClick={handleAddRoom} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
            <Plus size={18} /> Add Room
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[80px_110px_1fr_1fr_90px_1fr_70px] gap-2 px-3 py-2 bg-gray-100 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-eqc-muted">
            <span>Room</span>
            <span>Status</span>
            <span>Course</span>
            <span>Trainer</span>
            <span>Intake</span>
            <span>Topic</span>
            <span className="text-right">Actions</span>
          </div>
        {draftRooms.map((room, idx) => {
          const num = parseInt(room.roomName.replace('Room ', ''));
          const isCoreRoom = !isNaN(num) && num >= 1 && num <= 6;
          return (
            <div
              key={room.id}
              className={`grid grid-cols-[80px_110px_1fr_1fr_90px_1fr_70px] gap-2 px-3 py-2 items-center border-b border-gray-100 last:border-b-0 ${
                room.status === 'live' ? 'bg-green-50' : room.status === 'break' ? 'bg-orange-50' : 'bg-white'
              }`}
            >
              <input
                value={room.roomName}
                readOnly={isCoreRoom}
                onChange={(e) => updateDraft(idx, 'roomName', e.target.value)}
                className={`w-full px-2 py-1.5 border border-gray-200 rounded text-sm font-bold ${isCoreRoom ? 'bg-gray-50 border-transparent cursor-not-allowed' : 'bg-white'}`}
              />
              <select
                value={room.status === 'available' ? 'live' : room.status}
                onChange={(e) => updateDraft(idx, 'status', e.target.value)}
                disabled={room.status === 'available' && !room.course && !room.trainer}
                className={`w-full px-2 py-1.5 border border-gray-200 rounded text-xs font-bold ${
                  room.status === 'available' && !room.course && !room.trainer ? 'text-gray-400 bg-gray-50 cursor-not-allowed' :
                  room.status === 'live' ? 'text-green-700' : room.status === 'break' ? 'text-orange-700' : room.status === 'inactive' ? 'text-gray-500' : 'text-gray-600'
                }`}
              >
                <option value="live">Live</option>
                <option value="break">Break</option>
                <option value="inactive">Signed Off</option>
              </select>
              <input value={room.course || ''} onChange={(e) => updateDraft(idx, 'course', e.target.value)} placeholder="—" className={`w-full px-2 py-1.5 border border-gray-200 rounded text-sm ${room.status === 'available' ? 'bg-gray-50 text-gray-400' : 'bg-white'}`} />
              <input value={room.trainer || ''} onChange={(e) => updateDraft(idx, 'trainer', e.target.value)} placeholder="—" className={`w-full px-2 py-1.5 border border-gray-200 rounded text-sm ${room.status === 'available' ? 'bg-gray-50 text-gray-400' : 'bg-white'}`} />
              <input value={room.intake || ''} onChange={(e) => updateDraft(idx, 'intake', e.target.value)} placeholder="—" className={`w-full px-2 py-1.5 border border-gray-200 rounded text-sm ${room.status === 'available' ? 'bg-gray-50 text-gray-400' : 'bg-white'}`} />
              <input value={room.topic || ''} onChange={(e) => updateDraft(idx, 'topic', e.target.value)} placeholder="—" className={`w-full px-2 py-1.5 border border-gray-200 rounded text-sm ${room.status === 'available' ? 'bg-gray-50 text-gray-400' : 'bg-white'}`} />
              <div className="flex justify-end gap-1">
                {room.status !== 'available' && (
                  <button onClick={() => handleClearRoom(idx)} className="text-orange-500 p-1.5 hover:bg-orange-100 rounded" title="Clear Room">
                    <X size={16} />
                  </button>
                )}
                {!isCoreRoom && (
                  <button onClick={() => handleDeleteRoom(room.id)} className="text-red-500 p-1.5 hover:bg-red-50 rounded" title="Delete Room">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-xs text-blue-700 font-medium flex items-center gap-2">
          <ExternalLink size={14} />
          Rooms also update when trainers sign on via the{' '}
          <a href={TRAINER_SIGN_ON_URL} target="_blank" rel="noreferrer" className="underline font-bold">Trainer Sign-On Portal</a>.
        </p>
      </div>

      {/* Save bar */}
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
          <button onClick={handleReset} disabled={!dirty} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
            Revert
          </button>
          <button onClick={handleSave} disabled={!dirty} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Save Changes
          </button>
        </div>
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
