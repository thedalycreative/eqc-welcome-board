import { useState, useMemo } from 'react';
import { ClipboardList, Search, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSignOnLog } from '../../lib/hooks';
import type { SignOnLogEntry } from '../../lib/types';

const PAGE_SIZE = 50;
const BREAK_OPTIONS = [15, 30, 45, 60];

type RowKind = 'session' | 'auto-reset' | 'manual-reset' | 'admin-update';

interface MergedEntry {
  key: string;
  kind: RowKind;
  trainerName: string;
  trainerId?: string;
  roomNumber: string;
  intakeNumber: string;
  course: string;
  topics?: string;
  signOnTimestamp: string;
  signOffTimestamp?: string;
  breakMinutes?: number;
}

/** Row palette: trainer sessions green, auto-reset black, Reset All orange, admin edits grey. */
const ROW_STYLES: Record<RowKind, { row: string; time: string; muted: string }> = {
  'session':      { row: 'bg-green-50 text-eqc-text',        time: 'text-green-700',  muted: 'text-green-800/70' },
  'auto-reset':   { row: 'bg-gray-900 text-white',           time: 'text-white/80',   muted: 'text-white/70' },
  'manual-reset': { row: 'bg-orange-50 text-orange-700',     time: 'text-orange-600', muted: 'text-orange-600/80' },
  'admin-update': { row: 'bg-gray-100 text-gray-900',        time: 'text-gray-600',   muted: 'text-gray-600' },
};

const KIND_LABELS: Record<RowKind, string> = {
  'session': 'Sign-on',
  'auto-reset': 'Auto reset',
  'manual-reset': 'Reset all',
  'admin-update': 'Admin update',
};

function kindOf(e: SignOnLogEntry): RowKind {
  if (e.action === 'admin-update') return 'admin-update';
  if (e.action === 'reset') {
    // Newer entries carry an explicit source; older ones only differ by name.
    if (e.source === 'manual' || e.trainerName.toLowerCase().includes('manual')) return 'manual-reset';
    return 'auto-reset';
  }
  return 'session';
}

/**
 * Joins sign-on and sign-off entries into a single row per session.
 * Pairing key: trainer + room + same calendar day. The earliest sign-on is
 * matched with the earliest sign-off that comes after it. Unmatched entries
 * (sign-ons with no sign-off yet, or orphan sign-offs) still render with a
 * dash in the missing column.
 */
function mergeEntries(entries: SignOnLogEntry[]): MergedEntry[] {
  // entries arrive sorted desc; flip to asc for pairing.
  const asc = [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const byKey = new Map<string, MergedEntry[]>();
  const dayKey = (ts: string) => new Date(ts).toISOString().slice(0, 10);

  const standalone: MergedEntry[] = [];

  for (const e of asc) {
    // Resets and admin edits are single events, not sessions — never pair them.
    const kind = kindOf(e);
    if (kind !== 'session') {
      standalone.push({
        key: `${e.id}`,
        kind,
        trainerName: e.trainerName,
        roomNumber: e.roomNumber,
        intakeNumber: e.intakeNumber,
        course: e.course,
        signOnTimestamp: e.timestamp,
      });
      continue;
    }

    const k = `${e.trainerId || e.trainerName}|${e.roomNumber}|${dayKey(e.timestamp)}`;
    if (!byKey.has(k)) byKey.set(k, []);
    const bucket = byKey.get(k)!;

    if (e.action === 'sign-on') {
      bucket.push({
        key: `${k}|${e.timestamp}`,
        kind: 'session',
        trainerName: e.trainerName,
        trainerId: e.trainerId,
        roomNumber: e.roomNumber,
        intakeNumber: e.intakeNumber,
        course: e.course,
        topics: e.topics,
        signOnTimestamp: e.timestamp,
        breakMinutes: e.breakMinutes,
      });
    } else {
      // pair to the most recent un-matched sign-on in this bucket
      const open = [...bucket].reverse().find(b => !b.signOffTimestamp);
      if (open) {
        open.signOffTimestamp = e.timestamp;
        if (e.breakMinutes != null) open.breakMinutes = e.breakMinutes;
      } else {
        // orphan sign-off — synthesize a row with no sign-on
        bucket.push({
          key: `${k}|${e.timestamp}`,
          kind: 'session',
          trainerName: e.trainerName,
          trainerId: e.trainerId,
          roomNumber: e.roomNumber,
          intakeNumber: e.intakeNumber,
          course: e.course,
          topics: e.topics,
          signOnTimestamp: '',
          signOffTimestamp: e.timestamp,
          breakMinutes: e.breakMinutes,
        });
      }
    }
  }

  // Flatten + sort desc by sign-on (or sign-off when sign-on missing)
  const all: MergedEntry[] = [...standalone];
  for (const arr of byKey.values()) all.push(...arr);
  all.sort((a, b) => {
    const ta = new Date(a.signOnTimestamp || a.signOffTimestamp || 0).getTime();
    const tb = new Date(b.signOnTimestamp || b.signOffTimestamp || 0).getTime();
    return tb - ta;
  });
  return all;
}

// All log times display in WA time (Australia/Perth), 12-hour clock.
function fmtTime(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-AU', {
    timeZone: 'Australia/Perth',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AdminSignOnLog() {
  const entries = useSignOnLog();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [breakOverride, setBreakOverride] = useState<Record<string, number>>({});

  const merged = useMemo(() => mergeEntries(entries), [entries]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    return merged.filter(e => {
      // Open/closed only makes sense for trainer sessions, not resets/admin edits.
      if (statusFilter !== 'all' && e.kind !== 'session') return false;
      if (statusFilter === 'open' && e.signOffTimestamp) return false;
      if (statusFilter === 'closed' && !e.signOffTimestamp) return false;
      if (!q) return true;
      return (
        e.trainerName.toLowerCase().includes(q) ||
        e.roomNumber.toLowerCase().includes(q) ||
        e.intakeNumber.toLowerCase().includes(q) ||
        e.course.toLowerCase().includes(q) ||
        (e.topics || '').toLowerCase().includes(q)
      );
    });
  }, [merged, filter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageEntries = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const buildExportRows = () => filtered.map(e => ({
    Type: KIND_LABELS[e.kind],
    'Sign-on': fmtTime(e.signOnTimestamp),
    'Sign-off': fmtTime(e.signOffTimestamp),
    Trainer: e.trainerName,
    Room: e.roomNumber,
    Intake: e.intakeNumber,
    Course: e.course,
    Topic: e.topics || '',
    'Break (min)': breakOverride[e.key] ?? e.breakMinutes ?? '',
  }));

  const handleExportXlsx = () => {
    const rows = buildExportRows();
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Sign-On Log');
    XLSX.writeFile(wb, `sign-on-log-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCsv = () => {
    const rows = buildExportRows();
    const sheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sign-on-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-3">
            <ClipboardList size={26} className="text-eqc-green" />
            Sign-On Log
          </h2>
          <p className="text-sm text-eqc-muted mt-1">Each row pairs a sign-on with its matching sign-off. Open sessions show a dash in the sign-off column.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
            <FileText size={16} /> Export CSV
          </button>
          <button onClick={handleExportXlsx} className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-white bg-eqc-green hover:bg-eqc-green/90 rounded-lg">
            <FileSpreadsheet size={16} /> Export XLSX
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            placeholder="Filter by name, room, intake, course, topic…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-bold">
          <option value="all">All sessions</option>
          <option value="open">Open (no sign-off)</option>
          <option value="closed">Closed</option>
        </select>
        <span className="text-xs text-eqc-muted">
          {filtered.length} {filtered.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      {/* Colour legend — times shown in WA time (12-hour) */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-eqc-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Trainer sign-on</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-900" /> Daily auto reset</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300" /> Reset all</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Admin panel update</span>
        <span className="ml-auto normal-case font-medium tracking-normal">All times in WA (Perth), 12-hour</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-[1fr_1fr_1fr_70px_80px_1.4fr_1.4fr_120px] gap-3 px-4 py-2 bg-gray-100 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-eqc-muted">
            <span>Sign-on</span>
            <span>Sign-off</span>
            <span>Trainer</span>
            <span>Room</span>
            <span>Intake</span>
            <span>Course</span>
            <span>Topic</span>
            <span>Break</span>
          </div>

          {pageEntries.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-eqc-muted italic text-sm">
                {entries.length === 0 ? 'No sign-on activity recorded yet.' : 'No entries match the current filter.'}
              </p>
            </div>
          ) : (
            pageEntries.map(entry => {
              const breakValue = breakOverride[entry.key] ?? entry.breakMinutes ?? '';
              const style = ROW_STYLES[entry.kind];
              const isSession = entry.kind === 'session';
              return (
                <div key={entry.key} className={`grid grid-cols-[1fr_1fr_1fr_70px_80px_1.4fr_1.4fr_120px] gap-3 px-4 py-3 items-center border-b border-gray-100 last:border-b-0 text-sm ${style.row}`}>
                  <span className={`font-mono text-xs ${style.time}`}>{fmtTime(entry.signOnTimestamp)}</span>
                  <span className={`font-mono text-xs ${!isSession ? style.muted : entry.signOffTimestamp ? style.time : 'text-amber-600 font-bold'}`}>
                    {isSession ? fmtTime(entry.signOffTimestamp) : '—'}
                  </span>
                  <span className="font-bold truncate flex items-center gap-2 min-w-0">
                    {!isSession && (
                      <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        entry.kind === 'auto-reset' ? 'bg-white/15 text-white'
                          : entry.kind === 'manual-reset' ? 'bg-orange-500 text-white'
                          : 'bg-gray-700 text-white'
                      }`}>
                        {KIND_LABELS[entry.kind]}
                      </span>
                    )}
                    <span className="truncate">{entry.trainerName}</span>
                  </span>
                  <span className={style.muted}>{entry.roomNumber}</span>
                  <span className={style.muted}>{entry.intakeNumber}</span>
                  <span className="truncate text-xs">{entry.course}</span>
                  <span className="truncate text-xs">{entry.topics || <span className={`italic ${style.muted}`}>—</span>}</span>
                  {isSession ? (
                    <select
                      value={breakValue}
                      onChange={(e) => setBreakOverride(prev => ({ ...prev, [entry.key]: Number(e.target.value) || 0 }))}
                      className="px-2 py-1 border border-gray-200 rounded text-xs bg-white text-gray-900"
                    >
                      <option value="">—</option>
                      {BREAK_OPTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                    </select>
                  ) : (
                    <span className={`italic text-xs ${style.muted}`}>—</span>
                  )}
                </div>
              );
            })
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
