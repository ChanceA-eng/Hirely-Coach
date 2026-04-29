import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

type VerificationProfile = {
  slug: string;
  credentialId: string;
  publicEnabled: boolean;
  showContact: boolean;
  levelTitle: string;
  resumeScore: number;
  topSimulationScore: number;
  consistencyWeeks: number;
  certificationsCompleted: number;
  badges: string[];
  updatedAt: number;
};

function normalizeVerificationProfile(input: unknown): VerificationProfile {
  const row = (input ?? {}) as Record<string, unknown>;
  return {
    slug: String(row.slug || "").trim(),
    credentialId: String(row.credentialId || "").trim(),
    publicEnabled: Boolean(row.publicEnabled),
    showContact: Boolean(row.showContact),
    levelTitle: String(row.levelTitle || "Novice").trim(),
    resumeScore: Math.max(0, Math.min(100, Math.floor(Number(row.resumeScore || 0)))),
    topSimulationScore: Math.max(0, Math.min(100, Math.floor(Number(row.topSimulationScore || 0)))),
    consistencyWeeks: Math.max(0, Math.floor(Number(row.consistencyWeeks || 0))),
    certificationsCompleted: Math.max(0, Math.floor(Number(row.certificationsCompleted || 0))),
    badges: Array.isArray(row.badges) ? row.badges.map((b) => String(b || "").trim()).filter(Boolean).slice(0, 8) : [],
    updatedAt: Math.max(0, Number(row.updatedAt || Date.now())),
  };
}

function ensureSlug(existing: string): string {
  if (existing) return existing;
  return randomBytes(6).toString("hex");
}

function ensureCredentialId(existing: string): string {
  if (existing) return existing;
  const seed = `${Date.now()}-${randomBytes(16).toString("hex")}`;
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 16);
  return `HC-2026-${hash.toUpperCase()}`;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const profile = normalizeVerificationProfile(publicMetadata.verificationProfile);
  const slug = ensureSlug(profile.slug);
  const credentialId = ensureCredentialId(profile.credentialId);

  if (!profile.slug || !profile.credentialId) {
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...publicMetadata,
        verificationProfile: {
          ...profile,
          slug,
          credentialId,
          updatedAt: Date.now(),
        },
      },
    });
  }

  return NextResponse.json({
    profile: {
      ...profile,
      slug,
      credentialId,
    },
  });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<VerificationProfile>;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const current = normalizeVerificationProfile(publicMetadata.verificationProfile);

  const requestedPublicEnabled = body.publicEnabled ?? current.publicEnabled;
  const requestedLevelTitle = String(body.levelTitle || current.levelTitle || "Novice").trim();
  if (requestedPublicEnabled && requestedLevelTitle !== "Master") {
    return NextResponse.json(
      { error: "Public verification unlocks at Master tier." },
      { status: 403 }
    );
  }

  const next: VerificationProfile = {
    ...current,
    slug: ensureSlug(current.slug),
    credentialId: ensureCredentialId(current.credentialId),
    publicEnabled: requestedPublicEnabled,
    showContact: body.showContact ?? current.showContact,
    levelTitle: requestedLevelTitle,
    resumeScore: Math.max(0, Math.min(100, Math.floor(Number(body.resumeScore ?? current.resumeScore)))),
    topSimulationScore: Math.max(0, Math.min(100, Math.floor(Number(body.topSimulationScore ?? current.topSimulationScore)))),
    consistencyWeeks: Math.max(0, Math.floor(Number(body.consistencyWeeks ?? current.consistencyWeeks))),
    certificationsCompleted: Math.max(0, Math.floor(Number(body.certificationsCompleted ?? current.certificationsCompleted))),
    badges: Array.isArray(body.badges)
      ? body.badges.map((b) => String(b || "").trim()).filter(Boolean).slice(0, 8)
      : current.badges,
    updatedAt: Date.now(),
  };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...publicMetadata,
      verificationProfile: next,
    },
  });

  return NextResponse.json({ profile: next });
}
