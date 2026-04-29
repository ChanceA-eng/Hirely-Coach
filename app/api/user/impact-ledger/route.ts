import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { ImpactEntry } from "@/app/lib/impactLog";

function normalizeEntry(input: unknown): ImpactEntry | null {
  const row = (input ?? {}) as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const createdAt = Number(row.createdAt);
  const action = String(row.action || "").trim();
  const proof = String(row.proof || "").trim();
  const result = String(row.result || "").trim();

  if (!id || !Number.isFinite(createdAt) || !action || !proof || !result) return null;

  return { id, createdAt, action, proof, result };
}

function normalizeEntries(input: unknown): ImpactEntry[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((entry) => normalizeEntry(entry))
    .filter(Boolean)
    .sort((left, right) => {
      const a = left as ImpactEntry;
      const b = right as ImpactEntry;
      return b.createdAt - a.createdAt;
    })
    .slice(0, 40) as ImpactEntry[];
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ entries: [] });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    entries: normalizeEntries(publicMetadata.impactLedger),
  });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { entries?: unknown[] };
  const incoming = normalizeEntries(body.entries);

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const existing = normalizeEntries(publicMetadata.impactLedger);

  const merged = [...incoming, ...existing]
    .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 40);

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...publicMetadata,
      impactLedger: merged,
    },
  });

  return NextResponse.json({ ok: true, entries: merged });
}
