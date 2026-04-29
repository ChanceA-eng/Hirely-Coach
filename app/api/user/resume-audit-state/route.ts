import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json()) as {
    overallScore?: number;
    fileName?: string;
    updatedAt?: number;
  };

  const overallScore = Number(body.overallScore);
  if (!Number.isFinite(overallScore)) {
    return NextResponse.json({ error: "overallScore required" }, { status: 400 });
  }

  const updatedAt = Number(body.updatedAt || Date.now());

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...publicMetadata,
      resumeAuditState: {
        overallScore: Math.max(0, Math.min(100, Math.round(overallScore))),
        fileName: String(body.fileName || "").trim(),
        updatedAt,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
