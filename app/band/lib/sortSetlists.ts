// app/band/lib/sortSetlists.ts
import { Setlist } from '../types/band';

/**
 * Returns today's date in YYYY-MM-DD format based on local system time.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD date into a compact, human-readable string like "Sep 27" or "Oct 4".
 */
export function formatServiceDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(m) && !isNaN(d) && m >= 1 && m <= 12) {
      return `${monthNames[m - 1]} ${d}`;
    }
  }
  return dateStr;
}

/**
 * Sorts setlists so future/upcoming dates come first, ordered from closest upcoming to furthest upcoming,
 * followed by past dates in reverse chronological order (most recent first), and finally undated drafts.
 */
export function sortSetlistsUpcomingFirst(list: Setlist[]): Setlist[] {
  const todayStr = getTodayDateString();

  return [...list].sort((a, b) => {
    const dateA = (a.serviceDate || '').trim();
    const dateB = (b.serviceDate || '').trim();

    const isUpcomingA = dateA.length > 0 && dateA >= todayStr;
    const isUpcomingB = dateB.length > 0 && dateB >= todayStr;

    // Both are upcoming (today or future):
    // Soonest upcoming event first (ascending: e.g. Sep 27 before Oct 4)
    if (isUpcomingA && isUpcomingB) {
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    }

    // A is upcoming, B is not: A comes first
    if (isUpcomingA && !isUpcomingB) {
      return -1;
    }

    // B is upcoming, A is not: B comes first
    if (!isUpcomingA && isUpcomingB) {
      return 1;
    }

    // Both are previous / past dates:
    // Most recent past event first (descending: e.g. Sep 23 before Sep 13)
    if (dateA.length > 0 && dateB.length > 0) {
      const cmp = dateB.localeCompare(dateA);
      if (cmp !== 0) return cmp;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    }

    // One is dated, one is undated: dated comes first
    if (dateA.length > 0 && dateB.length === 0) return -1;
    if (dateA.length === 0 && dateB.length > 0) return 1;

    // Neither has a date: sort by updatedAt descending
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}
