import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clerkClient();
  const current = await client.users.getUser(userId);
  const email = current.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ ok: true, duplicate: false, canonicalUserId: userId, duplicates: 0 });
  }

  const normalized = normalizeEmail(email);
  const candidates = await client.users.getUserList({ query: normalized, limit: 100 });
  const exactMatches = candidates.data.filter((user) =>
    user.emailAddresses.some((entry) => normalizeEmail(entry.emailAddress) === normalized)
  );

  if (exactMatches.length <= 1) {
    return NextResponse.json({ ok: true, duplicate: false, canonicalUserId: userId, duplicates: exactMatches.length });
  }

  const canonical = [...exactMatches].sort((left, right) => left.createdAt - right.createdAt)[0];

  return NextResponse.json({
    ok: true,
    duplicate: canonical.id !== userId,
    canonicalUserId: canonical.id,
    duplicates: exactMatches.length,
  });
}
