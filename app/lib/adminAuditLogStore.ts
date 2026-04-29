import type { ImpactEntry } from "@/app/lib/impactLog";

type StoredAuditLog = {
  id: string;
  createdAt: number;
  userId: string | null;
  email: string | null;
  model: string;
  temperature: number;
  promptPreview: string;
  resumeSnippet: string;
  impactEntries: ImpactEntry[];
  rawResponse: string;
  normalizedReport: unknown;
};

const MAX_LOGS = 150;
const globalStore = globalThis as typeof globalThis & {
  __hirelyAdminAuditLogs?: StoredAuditLog[];
};

if (!globalStore.__hirelyAdminAuditLogs) {
  globalStore.__hirelyAdminAuditLogs = [];
}

function getStore(): StoredAuditLog[] {
  return globalStore.__hirelyAdminAuditLogs as StoredAuditLog[];
}

export function appendAdminAuditLog(log: Omit<StoredAuditLog, "id" | "createdAt">) {
  const store = getStore();
  const next: StoredAuditLog = {
    ...log,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };

  store.unshift(next);
  if (store.length > MAX_LOGS) {
    store.splice(MAX_LOGS);
  }
}

export function listAdminAuditLogs(): StoredAuditLog[] {
  return [...getStore()];
}
