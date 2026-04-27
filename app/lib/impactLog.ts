export type ImpactEntry = {
  id: string;
  createdAt: number;
  action: string;
  proof: string;
  result: string;
};

const GUEST_IMPACT_LOG_KEY = "hirelyImpactLog";

function getImpactLogKey(userId?: string | null) {
  return userId ? `hirelyImpactLog:${userId}` : GUEST_IMPACT_LOG_KEY;
}

function safeParseImpactEntries(raw: string | null): ImpactEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<ImpactEntry>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        id: String(entry.id || "").trim(),
        createdAt: Number(entry.createdAt || 0),
        action: String(entry.action || "").trim(),
        proof: String(entry.proof || "").trim(),
        result: String(entry.result || "").trim(),
      }))
      .filter((entry) => entry.id && entry.createdAt && entry.action && entry.proof && entry.result)
      .sort((left, right) => right.createdAt - left.createdAt);
  } catch {
    return [];
  }
}

export function loadImpactEntries(userId?: string | null): ImpactEntry[] {
  if (typeof window === "undefined") return [];
  return safeParseImpactEntries(window.localStorage.getItem(getImpactLogKey(userId)));
}

export function saveImpactEntry(
  entry: Omit<ImpactEntry, "id" | "createdAt">,
  userId?: string | null
): ImpactEntry | null {
  if (typeof window === "undefined") return null;

  const action = entry.action.trim();
  const proof = entry.proof.trim();
  const result = entry.result.trim();

  if (!action || !proof || !result) return null;

  const nextEntry: ImpactEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    action,
    proof,
    result,
  };

  const current = loadImpactEntries(userId);
  current.unshift(nextEntry);
  window.localStorage.setItem(getImpactLogKey(userId), JSON.stringify(current.slice(0, 40)));
  return nextEntry;
}

export function migrateGuestImpactEntriesToUser(userId: string) {
  if (typeof window === "undefined") return;

  const guestEntries = loadImpactEntries(null);
  if (guestEntries.length === 0) return;

  const existingEntries = loadImpactEntries(userId);
  const mergedEntries = [...guestEntries, ...existingEntries]
    .filter((entry, index, entries) => entries.findIndex((item) => item.id === entry.id) === index)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 40);

  window.localStorage.setItem(getImpactLogKey(userId), JSON.stringify(mergedEntries));
  window.localStorage.removeItem(getImpactLogKey(null));
}