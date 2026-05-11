import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  const email = normalizeEmail(String(body.email || ""));

  if (!email || !isEmail(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const client = await clerkClient();
  const users = await client.users.getUserList({ query: email, limit: 100 });
  const exists = users.data.some((user) =>
    user.emailAddresses.some((entry) => normalizeEmail(entry.emailAddress) === email)
  );

  return NextResponse.json({ ok: true, exists, signInUrl: "/sign-in" });
}
