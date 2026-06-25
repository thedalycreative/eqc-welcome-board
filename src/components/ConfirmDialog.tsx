import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional middle button (e.g. "Save changes" in a 3-way dialog). */
  altLabel?: string;
  onAlt?: () => void;
}

const TONE_STYLES = {
  danger:  { ring: 'ring-red-500/20',    text: 'text-red-700',    btn: 'bg-red-600 hover:bg-red-700',          icon: 'text-red-500'    },
  warning: { ring: 'ring-amber-500/20',  text: 'text-amber-700',  btn: 'bg-amber-600 hover:bg-amber-700',      icon: 'text-amber-500'  },
  info:    { ring: 'ring-eqc-green/20',  text: 'text-eqc-green',  btn: 'bg-eqc-green hover:bg-eqc-green/90',   icon: 'text-eqc-green'  },
};

export default function ConfirmDialog({
  open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'warning', onConfirm, onCancel, altLabel, onAlt,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;
  const styles = TONE_STYLES[tone];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden ring-4 ${styles.ring}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 border-b border-gray-100 flex items-start gap-3">
          <div className={`shrink-0 mt-0.5 ${styles.icon}`}>
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-bold ${styles.text}`}>{title}</h3>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 shrink-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {body && (
          <div className="px-5 py-4 text-sm text-gray-600">
            {body}
          </div>
        )}
        <div className="px-5 py-4 bg-gray-50 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            {cancelLabel}
          </button>
          {altLabel && onAlt && (
            <button
              type="button"
              onClick={onAlt}
              className="px-4 py-2 text-sm font-bold text-eqc-green border border-eqc-green hover:bg-eqc-green/5 rounded-lg"
            >
              {altLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg ${styles.btn}`}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
