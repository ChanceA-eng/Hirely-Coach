export type EmailDeliveryStatus =
  | "sent"
  | "delivered"
  | "opened"
  | "bounced"
  | "blocked"
  | "failed"
  | "unread";

export type EmailLogEntry = {
  id: string;
  email: string;
  template: string;
  subject: string;
  status: EmailDeliveryStatus;
  provider: "resend";
  providerMessageId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
};

const MAX_EMAIL_LOGS = 5000;

const g = globalThis as typeof globalThis & {
  __hirelyEmailLogs?: EmailLogEntry[];
};
if (!g.__hirelyEmailLogs) g.__hirelyEmailLogs = [];

function store() {
  return g.__hirelyEmailLogs!;
}

export function listEmailLogs(limit = 300): EmailLogEntry[] {
  return store().slice(0, limit);
}

export function appendEmailLog(input: Omit<EmailLogEntry, "id" | "createdAt" | "updatedAt">): EmailLogEntry {
  const row: EmailLogEntry = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const logs = store();
  logs.unshift(row);
  if (logs.length > MAX_EMAIL_LOGS) logs.splice(MAX_EMAIL_LOGS);
  return row;
}

export function updateEmailStatusByProviderId(
  providerMessageId: string,
  status: EmailDeliveryStatus
): EmailLogEntry | null {
  const logs = store();
  const idx = logs.findIndex((entry) => entry.providerMessageId === providerMessageId);
  if (idx < 0) return null;
  logs[idx] = { ...logs[idx], status, updatedAt: Date.now() };
  return logs[idx];
}
