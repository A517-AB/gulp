/**
 * Client-side archive management for Jules sessions
 * Since the Jules API doesn't support archiving, we store archived session IDs in localStorage
 */

const ARCHIVED_SESSIONS_KEY = "jules-archived-sessions";

function parseArchivedSessions(stored: string): string[] {
  const parsed: unknown = JSON.parse(stored)
  if (!Array.isArray(parsed)) return []
  return parsed.filter((item): item is string => typeof item === 'string')
}

export function getArchivedSessions(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const stored = localStorage.getItem(ARCHIVED_SESSIONS_KEY);
    return stored ? new Set(parseArchivedSessions(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function archiveSession(sessionId: string): void {
  if (typeof window === "undefined") return;

  const archived = getArchivedSessions();
  archived.add(sessionId);
  localStorage.setItem(ARCHIVED_SESSIONS_KEY, JSON.stringify([...archived]));
}

export function unarchiveSession(sessionId: string): void {
  if (typeof window === "undefined") return;

  const archived = getArchivedSessions();
  archived.delete(sessionId);
  localStorage.setItem(ARCHIVED_SESSIONS_KEY, JSON.stringify([...archived]));
}

export function isSessionArchived(sessionId: string): boolean {
  return getArchivedSessions().has(sessionId);
}
