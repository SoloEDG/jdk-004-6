import { fnv1aHex } from "./encoding";

/** Strict local-date parser; returns null for anything that is not YYYY-MM-DD. */
export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // Reject rollover dates such as 2026-02-31.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;
  return date;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function today(now: Date = new Date()): string {
  return formatDate(now);
}

/**
 * The daily seed binds calendar day and the human challenge code, so the same
 * pair always produces the same enemy tide, upgrade draws and drop rolls.
 */
export function dailySeed(date: string, code: string): number {
  return parseInt(fnv1aHex(`void-signal:${date}:${code.trim()}`), 16);
}

/** Short display identifier shared alongside the full challenge code. */
export function challengeId(date: string, code: string): string {
  return `${date.replace(/-/g, "")}-${fnv1aHex(`${date}:${code.trim()}`)}`;
}
