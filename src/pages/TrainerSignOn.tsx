import { useState, useEffect, FormEvent, useMemo, useCallback, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, LogOut, Check, X, Clock, AlertTriangle, ExternalLink, Camera, Play, Edit3, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast, { Toaster } from 'react-hot-toast';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRooms, useTrainers } from '../lib/hooks';
import { getTrainerImagePath, SKELLY_PATH } from '../lib/trainers';
import { uploadImage, deleteImage, readFileAsDataURL, getCroppedBlob } from '../lib/storage';
import type { RoomAllocation, Trainer } from '../lib/types';

const FIXED_COURSES = ['Cyber Security', 'Back End Web Dev'];
const BREAK_PRESETS = [15, 30, 45, 60];
const CORE_ROOMS = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5', 'Room 6'];

const INITIAL_ROOMS: RoomAllocation[] = [
  { id: 1, roomName: 'Room 1', status: 'available' },
  { id: 2, roomName: 'Room 2', status: 'available' },
  { id: 3, roomName: 'Room 3', status: 'available' },
  { id: 4, roomName: 'Room 4', status: 'available' },
  { id: 5, roomName: 'Room 5', status: 'available' },
  { id: 6, roomName: 'Room 6', status: 'available' },
];

// --- Helper: write a sign-on log entry ---

async function writeLogEntry(entry: {
  trainerName: string;
  trainerId?: string;
  roomNumber: string;
  intakeNumber: string;
  course: string;
  action: 'sign-on' | 'sign-off';
}) {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'signOnLog', id), {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to write sign-on log:', err);
  }
}

// --- Helper: format remaining break time ---

function formatBreakRemaining(breakUntil: string): string {
  const ms = new Date(breakUntil).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

// --- Currently-signed-on tile ---

interface SignedOnTileProps {
  room: RoomAllocation;
  trainers: Trainer[];
  onBreak: () => void;
  onSignOff: () => void;
  onUpdatePhoto: (trainer: Trainer) => void;
  onEndBreak: (room: RoomAllocation) => void;
  onEditBreak: (room: RoomAllocation) => void;
}

function SignedOnTile({ room, trainers, onBreak, onSignOff, onUpdatePhoto, onEndBreak, onEditBreak }: SignedOnTileProps) {
  const [expanded, setExpanded] = useState(false);
  const matchedTrainer = trainers.find(t => t.name.toLowerCase() === (room.trainer || '').toLowerCase());
  const photoUrl = matchedTrainer?.photoUrl || getTrainerImagePath(room.trainer);
  const isBreak = room.status === 'break';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${isBreak ? 'border-orange-200' : 'border-eqc-green/20'}`}
    >
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white border-2 border-gray-100 shrink-0">
          <img src={photoUrl} alt={room.trainer || 'Trainer'} className="w-full h-full object-cover object-top" onError={(e) => { (e.target as HTMLImageElement).src = SKELLY_PATH; }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{room.trainer}</p>
          <p className="text-xs text-eqc-muted">
            {room.roomName} · {room.intake}
            {isBreak && room.breakUntil && <span className="text-orange-600 font-bold"> · Break ({formatBreakRemaining(room.breakUntil)} left)</span>}
          </p>
        </div>
        <div className="text-eqc-muted text-xs">
          {expanded ? '▼' : '▶'}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-3 space-y-2">
              {isBreak ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => { onEndBreak(room); setExpanded(false); }}
                    className="flex-1 px-3 py-2.5 min-h-[44px] text-xs font-bold bg-eqc-green/10 text-eqc-green hover:bg-eqc-green/20 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Play size={14} /> End break now
                  </button>
                  <button
                    onClick={() => { onEditBreak(room); setExpanded(false); }}
                    className="flex-1 px-3 py-2.5 min-h-[44px] text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Edit3 size={14} /> Edit break time
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onBreak(); setExpanded(false); }}
                  className="w-full px-3 py-2.5 min-h-[44px] text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Coffee size={14} /> Start break
                </button>
              )}
              <div className="flex gap-2">
                {matchedTrainer && (
                  <button
                    onClick={() => { onUpdatePhoto(matchedTrainer); setExpanded(false); }}
                    className="flex-1 px-3 py-2.5 min-h-[44px] text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Camera size={14} /> Update photo
                  </button>
                )}
                <button
                  onClick={() => { onSignOff(); setExpanded(false); }}
                  className="flex-1 px-3 py-2.5 min-h-[44px] text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Photo Update Modal (file pick + crop + upload) ---

interface PhotoModalProps {
  trainer: Trainer;
  onCancel: () => void;
  onSaved: () => void;
}

function PhotoModal({ trainer, onCancel, onSaved }: PhotoModalProps) {
  const [srcDataUrl, setSrcDataUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onCropComplete = useCallback((_: Area, px: Area) => {
    setCroppedAreaPixels(px);
  }, []);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file');
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setSrcDataUrl(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch {
      toast.error('Could not read file');
    }
  };

  const handleSave = async () => {
    if (!srcDataUrl || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(srcDataUrl, croppedAreaPixels, 512);
      const path = `trainers/${trainer.id}.jpg`;
      const photoUrl = await uploadImage(blob, path);
      // If the URL changed (Firebase may return same path with a new token), delete old.
      if (trainer.photoUrl && trainer.photoUrl !== photoUrl) {
        try { await deleteImage(trainer.photoUrl); } catch { /* ignore */ }
      }
      await setDoc(doc(db, 'trainers', trainer.id), { photoUrl }, { merge: true });
      toast.success('Profile photo updated');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-5 border-b flex justify-between items-center shrink-0">
          <h3 className="text-lg font-display font-bold">Update profile photo</h3>
          <button onClick={onCancel} disabled={uploading} className="p-2 hover:bg-gray-100 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {!srcDataUrl ? (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50">
                <img
                  src={trainer.photoUrl || getTrainerImagePath(trainer.name)}
                  alt={trainer.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => { (e.target as HTMLImageElement).src = SKELLY_PATH; }}
                />
              </div>
              <p className="text-sm font-bold">{trainer.name}</p>
            </div>
            <label className="cursor-pointer block w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
              <Upload size={20} className="mx-auto text-eqc-green mb-2" />
              <span className="text-sm font-bold text-eqc-green">Choose a photo</span>
              <p className="text-xs text-eqc-muted mt-1">JPEG or PNG, up to ~10MB</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="px-4 py-2.5 min-h-[44px] text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative h-[50vh] sm:h-80 bg-gray-100 shrink-0">
              <Cropper
                image={srcDataUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
              />
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 shrink-0">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-eqc-green"
                  aria-label="Zoom"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setSrcDataUrl(null)}
                  disabled={uploading}
                  className="px-4 py-2.5 min-h-[44px] text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  Pick different
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={uploading}
                  className="px-6 py-2.5 min-h-[44px] text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 flex items-center gap-2 disabled:opacity-50"
                >
                  <Check size={16} /> {uploading ? 'Uploading…' : 'Save photo'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Edit Break Modal ---

interface EditBreakModalProps {
  room: RoomAllocation;
  onCancel: () => void;
  onSave: (newMinutesFromNow: number) => Promise<void>;
}

function EditBreakModal({ room, onCancel, onSave }: EditBreakModalProps) {
  const initialRemaining = useMemo(() => {
    if (!room.breakUntil) return 15;
    const remainingMin = Math.max(0, Math.round((new Date(room.breakUntil).getTime() - Date.now()) / 60000));
    return remainingMin || 15;
  }, [room.breakUntil]);
  const [minutes, setMinutes] = useState<string>(String(initialRemaining));
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const n = parseInt(minutes, 10);
    if (isNaN(n) || n <= 0) {
      toast.error('Enter a positive number of minutes');
      return;
    }
    setSubmitting(true);
    try {
      await onSave(n);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold flex items-center gap-2"><Clock size={20} className="text-amber-600" /> Edit break time</h3>
          <p className="text-sm text-eqc-muted mt-1">{room.trainer} · {room.roomName}</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
              Minutes from now
            </label>
            <input
              type="number"
              min={1}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-full p-3 min-h-[48px] border border-gray-200 rounded-lg text-base"
              autoFocus
            />
            <p className="text-xs text-eqc-muted mt-1">Currently ends in {initialRemaining} minute{initialRemaining === 1 ? '' : 's'}.</p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onCancel} disabled={submitting} className="px-4 py-2.5 min-h-[44px] text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={submitting} className="px-6 py-2.5 min-h-[44px] text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 disabled:opacity-50">
              {submitting ? 'Saving…' : 'Update break'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Break Modal ---

interface BreakModalProps {
  room: RoomAllocation;
  onCancel: () => void;
  onConfirm: (minutes: number) => Promise<void>;
}

function BreakModal({ room, onCancel, onConfirm }: BreakModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [customMinutes, setCustomMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    const minutes = customMinutes ? parseInt(customMinutes) : selectedMinutes;
    if (!minutes || minutes <= 0) {
      toast.error('Enter a valid number of minutes');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(minutes);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold flex items-center gap-2"><Coffee size={20} className="text-amber-600" /> Set break duration</h3>
          <p className="text-sm text-eqc-muted mt-1">{room.trainer} · {room.roomName}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {BREAK_PRESETS.map(min => (
              <button
                key={min}
                onClick={() => { setSelectedMinutes(min); setCustomMinutes(''); }}
                className={`py-3 rounded-lg text-sm font-bold transition-colors ${
                  !customMinutes && selectedMinutes === min ? 'bg-eqc-green text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Or enter custom (minutes)</label>
            <input
              type="number"
              min={1}
              max={480}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="e.g. 25"
              className="w-full p-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onCancel} disabled={submitting} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
            <button onClick={handleConfirm} disabled={submitting} className="px-6 py-2 text-sm font-bold text-white bg-eqc-green rounded-lg hover:bg-eqc-green/90 disabled:opacity-50">
              {submitting ? 'Saving…' : 'Start Break'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Confirm Sign-Off Modal ---

function ConfirmModal({ title, body, onCancel, onConfirm, confirmLabel = 'Confirm', confirmClass = 'bg-red-600' }: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  confirmLabel?: string;
  confirmClass?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
        <div className="p-5">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> {title}</h3>
          <p className="text-sm text-eqc-muted">{body}</p>
        </div>
        <div className="p-5 pt-0 flex gap-3 justify-end">
          <button onClick={onCancel} disabled={submitting} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
          <button
            onClick={async () => {
              setSubmitting(true);
              try { await onConfirm(); } finally { setSubmitting(false); }
            }}
            disabled={submitting}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-50 ${confirmClass}`}
          >
            {submitting ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Sign-On Page ---

export default function TrainerSignOn() {
  const [rooms] = useRooms(INITIAL_ROOMS);
  const trainers = useTrainers();
  const activeTrainers = useMemo(() => trainers.filter(t => t.active), [trainers]);

  // Form state
  const [trainerSelection, setTrainerSelection] = useState('');
  const [guestName, setGuestName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [customRoom, setCustomRoom] = useState('');
  const [course, setCourse] = useState('');
  const [customCourse, setCustomCourse] = useState('');
  const [intake, setIntake] = useState('');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [breakTarget, setBreakTarget] = useState<RoomAllocation | null>(null);
  const [signOffTarget, setSignOffTarget] = useState<RoomAllocation | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{
    room: RoomAllocation;
    payload: { trainerName: string; trainerId?: string; roomNumber: string; course: string; intake: string; topic: string };
  } | null>(null);
  const [photoTarget, setPhotoTarget] = useState<Trainer | null>(null);
  const [editBreakTarget, setEditBreakTarget] = useState<RoomAllocation | null>(null);

  // Auto-expire breaks
  useEffect(() => {
    const interval = setInterval(() => {
      rooms.forEach(room => {
        if (room.status === 'break' && room.breakUntil && new Date(room.breakUntil).getTime() <= Date.now()) {
          const roomNum = parseInt(room.roomName.replace('Room ', ''));
          const roomId = (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 6) ? roomNum : room.id;
          // Return to live status
          setDoc(doc(db, 'rooms', `room_${roomId}`), { ...room, status: 'live', breakUntil: null }, { merge: true }).catch(console.error);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [rooms]);

  const signedOnRooms = useMemo(
    () => rooms.filter(r => r.status === 'live' || r.status === 'break'),
    [rooms]
  );

  const writeSignOn = async (
    target: RoomAllocation,
    payload: { trainerName: string; trainerId?: string; roomNumber: string; course: string; intake: string; topic: string }
  ) => {
    const roomNum = parseInt(target.roomName.replace('Room ', ''));
    const roomId = (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 6) ? roomNum : target.id;
    await setDoc(doc(db, 'rooms', `room_${roomId}`), {
      id: roomId,
      roomName: payload.roomNumber,
      status: 'live',
      course: payload.course,
      trainer: payload.trainerName,
      trainerId: payload.trainerId,
      intake: payload.intake,
      topic: payload.topic,
      breakUntil: null,
    });
    await writeLogEntry({
      trainerName: payload.trainerName,
      trainerId: payload.trainerId,
      roomNumber: payload.roomNumber,
      intakeNumber: payload.intake,
      course: payload.course,
      action: 'sign-on',
    });
  };

  const resetForm = () => {
    setTrainerSelection('');
    setGuestName('');
    setRoomName('');
    setCustomRoom('');
    setCourse('');
    setCustomCourse('');
    setIntake('');
    setTopic('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const resolvedRoom = roomName === 'other' ? customRoom : roomName;
    const resolvedCourse = course === 'other' ? customCourse : course;

    if (!resolvedRoom || !resolvedCourse || !intake) {
      toast.error('Please fill in all required fields');
      return;
    }

    let trainerName = '';
    let trainerId: string | undefined;
    if (trainerSelection === 'guest') {
      if (!guestName.trim()) {
        toast.error('Please enter the guest trainer name');
        return;
      }
      trainerName = guestName.trim();
    } else if (trainerSelection) {
      const t = activeTrainers.find(t => t.id === trainerSelection);
      if (t) {
        trainerName = t.name;
        trainerId = t.id;
      }
    }

    if (!trainerName) {
      toast.error('Please choose a trainer or "Other / Guest"');
      return;
    }

    const targetRoom = rooms.find(r => r.roomName === resolvedRoom);

    // Override warning if room already occupied
    if (targetRoom && (targetRoom.status === 'live' || targetRoom.status === 'break') && targetRoom.trainer !== trainerName) {
      setOverrideTarget({
        room: targetRoom,
        payload: { trainerName, trainerId, roomNumber: resolvedRoom, course: resolvedCourse, intake, topic: topic || 'Class in session' },
      });
      return;
    }

    setSubmitting(true);
    try {
      const room = targetRoom || { id: Date.now(), roomName: resolvedRoom, status: 'available' as const };
      await writeSignOn(room, { trainerName, trainerId, roomNumber: resolvedRoom, course: resolvedCourse, intake, topic: topic || 'Class in session' });
      toast.success(`Signed on: ${trainerName} → ${resolvedRoom}`);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Sign-on failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBreak = async (minutes: number) => {
    if (!breakTarget) return;
    const breakUntil = new Date(Date.now() + minutes * 60_000).toISOString();
    const roomNum = parseInt(breakTarget.roomName.replace('Room ', ''));
    const roomId = (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 6) ? roomNum : breakTarget.id;
    try {
      await setDoc(doc(db, 'rooms', `room_${roomId}`), { ...breakTarget, status: 'break', breakUntil }, { merge: true });
      toast.success(`${breakTarget.trainer} on break for ${minutes} min`);
      setBreakTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to set break');
    }
  };

  const handleSignOff = async () => {
    if (!signOffTarget) return;
    const roomNum = parseInt(signOffTarget.roomName.replace('Room ', ''));
    const roomId = (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 6) ? roomNum : signOffTarget.id;
    try {
      // Mark room inactive (line greys/fades but content stays until midnight reset)
      await setDoc(doc(db, 'rooms', `room_${roomId}`), {
        ...signOffTarget,
        status: 'inactive',
        breakUntil: null,
      }, { merge: true });
      await writeLogEntry({
        trainerName: signOffTarget.trainer || 'Unknown',
        trainerId: signOffTarget.trainerId,
        roomNumber: signOffTarget.roomName,
        intakeNumber: signOffTarget.intake || '',
        course: signOffTarget.course || '',
        action: 'sign-off',
      });
      toast.success(`${signOffTarget.trainer} signed off`);
      setSignOffTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Sign-off failed');
    }
  };

  const handleEndBreak = async (room: RoomAllocation) => {
    const roomNum = parseInt(room.roomName.replace('Room ', ''));
    const roomId = (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 6) ? roomNum : room.id;
    try {
      await setDoc(doc(db, 'rooms', `room_${roomId}`), { ...room, status: 'live', breakUntil: null }, { merge: true });
      toast.success(`${room.trainer || 'Trainer'} back from break`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to end break');
    }
  };

  const handleEditBreak = async (newMinutesFromNow: number) => {
    if (!editBreakTarget) return;
    const breakUntil = new Date(Date.now() + newMinutesFromNow * 60_000).toISOString();
    const roomNum = parseInt(editBreakTarget.roomName.replace('Room ', ''));
    const roomId = (!isNaN(roomNum) && roomNum >= 1 && roomNum <= 6) ? roomNum : editBreakTarget.id;
    try {
      await setDoc(doc(db, 'rooms', `room_${roomId}`), { ...editBreakTarget, status: 'break', breakUntil }, { merge: true });
      toast.success(`Break updated to ${newMinutesFromNow} min`);
      setEditBreakTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update break');
    }
  };

  const handleOverride = async () => {
    if (!overrideTarget) return;
    try {
      // Log the override as the previous trainer's sign-off
      if (overrideTarget.room.trainer) {
        await writeLogEntry({
          trainerName: overrideTarget.room.trainer,
          trainerId: overrideTarget.room.trainerId,
          roomNumber: overrideTarget.room.roomName,
          intakeNumber: overrideTarget.room.intake || '',
          course: overrideTarget.room.course || '',
          action: 'sign-off',
        });
      }
      await writeSignOn(overrideTarget.room, overrideTarget.payload);
      toast.success(`Override complete: ${overrideTarget.payload.trainerName} → ${overrideTarget.payload.roomNumber}`);
      setOverrideTarget(null);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Override failed');
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="bottom-center" />

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <img src="/images/eqc-logo.png" alt="EQC Institute" className="h-12 w-auto object-contain" />
          <div className="h-8 w-px bg-gray-300" />
          <h1 className="text-xl font-display font-bold text-gray-800">Trainer Sign-On Portal</h1>
        </div>
        <span className="text-sm text-gray-500 font-medium">{today}</span>
      </header>

      <main className="flex-1 p-6 max-w-3xl w-full mx-auto space-y-6">
        {/* Currently signed-on */}
        {signedOnRooms.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Currently signed on ({signedOnRooms.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {signedOnRooms.map(room => (
                <SignedOnTile
                  key={room.id}
                  room={room}
                  trainers={trainers}
                  onBreak={() => setBreakTarget(room)}
                  onSignOff={() => setSignOffTarget(room)}
                  onUpdatePhoto={(t) => setPhotoTarget(t)}
                  onEndBreak={(r) => handleEndBreak(r)}
                  onEditBreak={(r) => setEditBreakTarget(r)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Sign-on form */}
        <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="bg-eqc-green text-white p-5 text-center">
            <h2 className="text-lg font-display font-bold">Sign on for class</h2>
            <p className="text-sm opacity-90">Your sign-on updates the lobby board in real time.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Trainer dropdown */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Your name *</label>
              <select
                required
                value={trainerSelection}
                onChange={(e) => setTrainerSelection(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-eqc-green outline-none"
              >
                <option value="">Select a trainer…</option>
                {activeTrainers.length > 0 && (
                  <optgroup label="Trainers">
                    {activeTrainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                )}
                <option value="guest">Other / Guest…</option>
              </select>
              {trainerSelection === 'guest' && (
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter trainer name"
                  className="w-full p-3 border border-gray-200 rounded-xl mt-2 focus:ring-2 focus:ring-eqc-green outline-none"
                />
              )}
              {activeTrainers.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> No trainers added yet — use "Other / Guest" or add trainers in the admin panel.
                </p>
              )}
            </div>

            {/* Room */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Room *</label>
              <select
                required
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-eqc-green outline-none"
              >
                <option value="">Select a room…</option>
                {CORE_ROOMS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="other">Other (specify)</option>
              </select>
              {roomName === 'other' && (
                <input
                  type="text"
                  required
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  placeholder="Enter room name"
                  className="w-full p-3 border border-gray-200 rounded-xl mt-2 focus:ring-2 focus:ring-eqc-green outline-none"
                />
              )}
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Course *</label>
              <select
                required
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-eqc-green outline-none"
              >
                <option value="">Select a course…</option>
                {FIXED_COURSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="other">Other (specify)</option>
              </select>
              {course === 'other' && (
                <input
                  type="text"
                  required
                  value={customCourse}
                  onChange={(e) => setCustomCourse(e.target.value)}
                  placeholder="Enter course name"
                  className="w-full p-3 border border-gray-200 rounded-xl mt-2 focus:ring-2 focus:ring-eqc-green outline-none"
                />
              )}
            </div>

            {/* Intake */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Intake *</label>
              <input
                type="text"
                required
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                placeholder="e.g. 25g"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-eqc-green outline-none"
              />
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Today's topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Network Defence (optional)"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-eqc-green outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-eqc-green text-white py-4 rounded-xl font-bold text-lg hover:bg-eqc-green/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Signing on…' : <><Check size={20} /> Sign On & Update Board</>}
            </button>
          </form>
        </section>

        <div className="text-center pt-2">
          <Link to="/" className="text-xs text-gray-500 hover:text-eqc-green inline-flex items-center gap-1">
            <ExternalLink size={12} /> Back to lobby dashboard
          </Link>
        </div>
      </main>

      {breakTarget && (
        <BreakModal room={breakTarget} onCancel={() => setBreakTarget(null)} onConfirm={handleBreak} />
      )}

      {signOffTarget && (
        <ConfirmModal
          title="Sign off?"
          body={`Sign ${signOffTarget.trainer} off from ${signOffTarget.roomName}? The room will grey out on the dashboard until tomorrow.`}
          onCancel={() => setSignOffTarget(null)}
          onConfirm={handleSignOff}
          confirmLabel="Sign Off"
          confirmClass="bg-red-600 hover:bg-red-700"
        />
      )}

      {overrideTarget && (
        <ConfirmModal
          title="Override active sign-on?"
          body={`${overrideTarget.room.trainer} is already signed on to ${overrideTarget.room.roomName}. Continue and override?`}
          onCancel={() => setOverrideTarget(null)}
          onConfirm={handleOverride}
          confirmLabel="Override"
          confirmClass="bg-amber-600 hover:bg-amber-700"
        />
      )}

      {photoTarget && (
        <PhotoModal
          trainer={photoTarget}
          onCancel={() => setPhotoTarget(null)}
          onSaved={() => setPhotoTarget(null)}
        />
      )}

      {editBreakTarget && (
        <EditBreakModal
          room={editBreakTarget}
          onCancel={() => setEditBreakTarget(null)}
          onSave={handleEditBreak}
        />
      )}
    </div>
  );
}
