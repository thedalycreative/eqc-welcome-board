import type { Trainer } from './types';

/**
 * Returns the next auto-generated password for a trainer with the given first
 * name. Pattern: {FirstName}{N} where N starts at 1 and increments to handle
 * duplicates. Existing trainers' passwords are scanned regardless of case.
 *
 * Examples:
 *   nextTrainerPassword([], 'Betty')                                 -> "Betty1"
 *   nextTrainerPassword([{password: 'Betty1'}], 'Betty')             -> "Betty2"
 *   nextTrainerPassword([{password: 'Betty1'},{password:'Betty2'}], 'Betty') -> "Betty3"
 */
export function nextTrainerPassword(trainers: Pick<Trainer, 'password' | 'name'>[], firstName: string): string {
  const stem = (firstName || '').trim().split(/\s+/)[0] || 'User';
  const re = new RegExp(`^${escapeRegex(stem)}(\\d+)$`, 'i');
  let max = 0;
  for (const t of trainers) {
    const pw = t.password || '';
    const m = pw.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${stem}${max + 1}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find the trainer whose password matches the given input (case-sensitive
 * match like a real password). Returns undefined when no match.
 */
export function findTrainerByPassword(trainers: Trainer[], password: string): Trainer | undefined {
  if (!password) return undefined;
  return trainers.find(t => t.password === password);
}
