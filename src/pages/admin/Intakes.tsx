import { useMemo, useState } from 'react';
import { GraduationCap, Plus, Trash2, X, Check, Pencil, CalendarDays } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useIntakes } from '../../lib/hooks';
import { formatIntake, parseIntake } from '../../lib/intake';
import ConfirmDialog from '../../components/ConfirmDialog';
import type { Intake } from '../../lib/types';

interface DraftIntake {
  digits: string;
  letter: string;
  courseName: string;
  startDate: string;
  notes: string;
  active: boolean;
}

function makeDraftFrom(existing: Intake | null): DraftIntake {
  const parts = parseIntake(existing?.label);
  return {
    digits: parts.digits,
    letter: parts.letter,
    courseName: existing?.courseName || '',
    startDate: existing?.startDate || '',
    notes: existing?.notes || '',
    active: existing?.active ?? true,
  };
}

export default function AdminIntakes() {
  const intakes = useIntakes();
  const [editingIntake, setEditingIntake] = useState<Intake | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Intake | null>(null);

  return (
    <div className="space-y-6 max-w-5xl">
      <Toaster position="bottom-right" />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-3">
            <GraduationCap size={26} className="text-eqc-green" />
            Intake Management
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Intakes added here appear in the intake dropdown on the Rooms tab. Click a tile to edit.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
          <Plus size={18} /> Add Intake
        </button>
      </div>

      {intakes.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No intakes yet</h3>
          <p className="text-sm text-eqc-muted mb-4">Add your first intake (e.g. 25.G) to populate the Rooms dropdown.</p>
          <button onClick={() => setShowAddForm(true)} className="bg-eqc-green text-white px-4 py-2 rounded-lg font-bold inline-flex items-center gap-2 hover:bg-eqc-green/90 transition-colors">
            <Plus size={18} /> Add your first intake
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {intakes.map(intake => (
            <button
              type="button"
              key={intake.id}
              onClick={() => setEditingIntake(intake)}
              className={`bg-white rounded-2xl border shadow-sm p-5 text-left hover:shadow-md hover:border-eqc-green/40 transition-all group ${intake.active ? '' : 'opacity-60'}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-green-50 border border-green-200 shrink-0 flex items-center justify-center">
                  <span className="font-black text-xl text-eqc-green tracking-tight">{intake.label}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate group-hover:text-eqc-green transition-colors">
                    {intake.courseName || `Intake ${intake.label}`}
                  </h3>
                  {intake.startDate && (
                    <p className="text-xs text-eqc-muted mt-1 flex items-center gap-1.5">
                      <CalendarDays size={12} />
                      Starts {new Date(intake.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  {intake.notes && <p className="text-xs text-eqc-muted mt-1 line-clamp-2">{intake.notes}</p>}
                  {!intake.active && <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-2">Inactive — hidden from dropdown</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-eqc-muted flex items-center gap-1.5">
                  <Pencil size={11} /> Click to edit
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(intake); }}
                  className="text-red-500 p-1.5 hover:bg-red-50 rounded"
                  aria-label="Delete intake"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {(showAddForm || editingIntake) && (
        <IntakeEditorModal
          intake={editingIntake}
          allIntakes={intakes}
          onClose={() => { setShowAddForm(false); setEditingIntake(null); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        tone="danger"
        title={`Delete intake ${confirmDelete?.label || ''}?`}
        body="This cannot be undone. The intake will disappear from the Rooms dropdown. Rooms already using it keep their current value."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await deleteDoc(doc(db, 'intakes', confirmDelete.id));
            toast.success('Intake deleted');
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

function IntakeEditorModal({
  intake, allIntakes, onClose,
}: {
  intake: Intake | null;
  allIntakes: Intake[];
  onClose: () => void;
}) {
  const initial = useMemo(() => makeDraftFrom(intake), [intake]);
  const [draft, setDraft] = useState<DraftIntake>(initial);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const label = formatIntake(draft.digits, draft.letter);
  const labelError = (draft.digits || draft.letter) && !label;
  const duplicate = !!label && allIntakes.some(i => i.label === label && i.id !== intake?.id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const attemptClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const handleSave = async () => {
    if (!label) { toast.error('Intake number must be 2 digits + 1 letter (e.g. 25.G)'); return; }
    if (duplicate) { toast.error(`Intake ${label} already exists`); return; }
    setSaving(true);
    try {
      const intakeId = intake?.id || `intake_${Date.now()}`;
      const update: Intake = {
        id: intakeId,
        label,
        courseName: draft.courseName.trim() || undefined,
        startDate: draft.startDate || undefined,
        notes: draft.notes.trim() || undefined,
        active: draft.active,
        createdAt: intake?.createdAt || new Date().toISOString(),
      };
      await setDoc(doc(db, 'intakes', intakeId), update, { merge: true });
      toast.success(intake ? 'Intake updated' : 'Intake added');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-3 sm:p-4" onClick={attemptClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-lg font-display font-bold">{intake ? `Edit intake ${intake.label}` : 'Add intake'}</h3>
          <button onClick={attemptClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-sm font-bold mb-1">Intake number *</label>
            <div className="flex items-center gap-2">
              <input
                value={draft.digits}
                onChange={(e) => setDraft(d => ({ ...d, digits: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                placeholder="25"
                maxLength={2}
                inputMode="numeric"
                autoFocus={!intake}
                className={`w-20 p-3 border rounded-lg text-center font-bold tabular-nums text-lg ${labelError ? 'border-red-300' : ''}`}
              />
              <span className="text-eqc-muted font-bold text-xl">.</span>
              <input
                value={draft.letter}
                onChange={(e) => setDraft(d => ({ ...d, letter: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1) }))}
                placeholder="G"
                maxLength={1}
                className={`w-16 p-3 border rounded-lg text-center font-bold uppercase text-lg ${labelError ? 'border-red-300' : ''}`}
              />
              {label && <span className="ml-2 text-sm font-bold text-eqc-green">→ {label}</span>}
            </div>
            {duplicate && <p className="text-xs text-red-500 font-bold mt-1">Intake {label} already exists.</p>}
            <p className="text-[10px] text-eqc-muted mt-1">Two digits, then one letter — e.g. 25.G</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Course</label>
            <input
              value={draft.courseName}
              onChange={(e) => setDraft(d => ({ ...d, courseName: e.target.value }))}
              className="w-full p-3 border rounded-lg"
              placeholder="e.g. ICT40120 — Cert IV Cyber Security"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Start date</label>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft(d => ({ ...d, startDate: e.target.value }))}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Notes</label>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="w-full p-3 border rounded-lg"
              placeholder="Optional — anything worth remembering about this intake."
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft(d => ({ ...d, active: e.target.checked }))}
              className="w-5 h-5 accent-eqc-green"
            />
            <div>
              <span className="text-sm font-bold">Active</span>
              <p className="text-[10px] text-eqc-muted">Inactive intakes stay saved but are hidden from the Rooms dropdown.</p>
            </div>
          </label>
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

        <ConfirmDialog
          open={confirmDiscard}
          tone="warning"
          title="Discard your changes?"
          body="You have unsaved edits to this intake."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        />
      </div>
    </div>
  );
}
