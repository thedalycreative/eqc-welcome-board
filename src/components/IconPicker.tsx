import { useMemo, useState, type ReactNode } from 'react';
import { Search, Smile, X } from 'lucide-react';
import { ALL_LUCIDE_ICONS, getLucideIcon } from '../lib/eventIcons';

interface IconPickerProps {
  value?: string;
  onChange: (name: string) => void;
  /** Icon shown on the trigger button when no value is selected. Defaults to a Smile. */
  triggerFallbackIcon?: ReactNode;
  /** Optional label rendered next to the icon on the trigger. */
  triggerLabel?: string;
  /** Color preset shown as a thin colored ring around the trigger and selected grid cell. */
  accentColor?: string;
}

const PAGE_SIZE = 96;

export default function IconPicker({
  value, onChange,
  triggerFallbackIcon = <Smile size={20} />,
  triggerLabel,
  accentColor = '#1a7a54',
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const allNames = useMemo(() => Object.keys(ALL_LUCIDE_ICONS).sort(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allNames;
    return allNames.filter(n => n.toLowerCase().includes(q));
  }, [allNames, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );

  const SelectedIcon = value ? getLucideIcon(value) : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(true); setSearch(''); setPage(0); }}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
        style={{ boxShadow: value ? `inset 0 0 0 1px ${accentColor}40` : undefined }}
      >
        <span className="text-eqc-green">
          {SelectedIcon ? <SelectedIcon size={20} /> : triggerFallbackIcon}
        </span>
        <span className="text-eqc-muted truncate max-w-[10rem]">
          {value || triggerLabel || 'Choose icon'}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold">Choose Icon</h3>
                <p className="text-xs text-eqc-muted">
                  {filtered.length} of {allNames.length} icons from lucide.dev
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="p-3 border-b">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Search the full lucide library…"
                  className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-6 sm:grid-cols-8 gap-2">
              {pageItems.map((name) => {
                const Icon = ALL_LUCIDE_ICONS[name];
                const selected = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { onChange(name); setOpen(false); setSearch(''); }}
                    title={name}
                    className={`flex flex-col items-center justify-start gap-1 p-2 rounded-lg hover:bg-gray-50 text-[10px] ${
                      selected ? 'bg-green-50 ring-2 ring-eqc-green' : ''
                    }`}
                  >
                    <Icon size={20} className="text-eqc-green" />
                    <span className="truncate w-full text-center">{name}</span>
                  </button>
                );
              })}
              {pageItems.length === 0 && (
                <div className="col-span-full p-12 text-center text-sm text-gray-400">
                  No icons match "{search}".
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t flex items-center justify-between text-xs">
                <span className="text-eqc-muted">Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 border rounded-lg font-bold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 border rounded-lg font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
