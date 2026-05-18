import { useState, useMemo } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { useSignOnLog } from '../../lib/hooks';

const PAGE_SIZE = 50;

export default function AdminSignOnLog() {
  const entries = useSignOnLog();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<'all' | 'sign-on' | 'sign-off'>('all');

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return entries.filter(e => {
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      if (!q) return true;
      return (
        e.trainerName.toLowerCase().includes(q) ||
        e.roomNumber.toLowerCase().includes(q) ||
        e.intakeNumber.toLowerCase().includes(q) ||
        e.course.toLowerCase().includes(q)
      );
    });
  }, [entries, filter, actionFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageEntries = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-display font-bold flex items-center gap-3">
          <ClipboardList size={26} className="text-eqc-green" />
          Sign-On Log
        </h2>
        <p className="text-sm text-eqc-muted mt-1">Historical record of trainer sign-ons and sign-offs. Break events are not recorded.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            placeholder="Filter by name, room, intake, course…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          />
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value as any); setPage(0); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-bold">
          <option value="all">All actions</option>
          <option value="sign-on">Sign-on only</option>
          <option value="sign-off">Sign-off only</option>
        </select>
        <span className="text-xs text-eqc-muted">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[140px_1fr_90px_90px_1fr_100px] gap-3 px-4 py-2 bg-gray-100 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-eqc-muted">
          <span>When</span>
          <span>Trainer</span>
          <span>Room</span>
          <span>Intake</span>
          <span>Course</span>
          <span className="text-right">Action</span>
        </div>

        {pageEntries.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-eqc-muted italic text-sm">
              {entries.length === 0 ? 'No sign-on activity recorded yet.' : 'No entries match the current filter.'}
            </p>
          </div>
        ) : (
          pageEntries.map(entry => (
            <div key={entry.id} className="grid grid-cols-[140px_1fr_90px_90px_1fr_100px] gap-3 px-4 py-3 items-center border-b border-gray-100 last:border-b-0 text-sm">
              <span className="font-mono text-xs text-eqc-muted">{new Date(entry.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="font-bold truncate">{entry.trainerName}</span>
              <span className="text-eqc-muted">{entry.roomNumber}</span>
              <span className="text-eqc-muted">{entry.intakeNumber}</span>
              <span className="truncate text-xs">{entry.course}</span>
              <span className={`text-right text-[10px] font-black uppercase tracking-widest ${entry.action === 'sign-on' ? 'text-green-700' : 'text-orange-700'}`}>
                {entry.action}
              </span>
            </div>
          ))
        )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-eqc-muted">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border rounded-lg font-bold disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 border rounded-lg font-bold disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
