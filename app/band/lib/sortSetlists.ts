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
 * Returns "Sunday Service" for Sundays (day 0), "Grace Night" for Wednesdays (day 3), or "" otherwise.
 */
export function getServiceTypeLabel(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  if (dayOfWeek === 0) return 'Sunday Service';
  if (dayOfWeek === 3) return 'Grace Night';
  return '';
}

/**
 * Formats a setlist's service type + date metadata without duplicating words already in the name.
 * Example: "Sunday Service • Nov 29" or "Grace Night • Nov 25".
 */
export function formatSetlistMeta(setlist: Pick<Setlist, 'name' | 'serviceDate'>): string {
  const lowerName = (setlist.name || '').toLowerCase();
  const serviceType = getServiceTypeLabel(setlist.serviceDate);
  const dateTag = formatServiceDate(setlist.serviceDate);

  const parts: string[] = [];
  if (dateTag && !lowerName.includes(dateTag.toLowerCase())) {
    parts.push(dateTag);
  }
  if (serviceType) {
    const alreadyMentionsType =
      (serviceType === 'Sunday Service' && lowerName.includes('sunday')) ||
      (serviceType === 'Grace Night' && (lowerName.includes('grace night') || lowerName.includes('wednesday')));
    if (!alreadyMentionsType) {
      parts.push(serviceType);
    }
  }
  return parts.join(' • ');
}

/**
 * Formats a setlist's full display label for dropdowns and pickers.
 * Example: "Ryan • Sunday Service • Nov 29 (3)"
 */
export function formatSetlistLabel(
  setlist: Pick<Setlist, 'name' | 'serviceDate' | 'songs' | 'leader'>,
  options?: { includeCount?: boolean; includeLeader?: boolean }
): string {
  const meta = formatSetlistMeta(setlist);
  let label = meta ? `${setlist.name} • ${meta}` : setlist.name;
  if (options?.includeLeader && setlist.leader && !setlist.name.toLowerCase().includes(setlist.leader.toLowerCase())) {
    label += ` (${setlist.leader})`;
  }
  if (options?.includeCount) {
    label += ` (${setlist.songs?.length || 0})`;
  }
  return label;
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
