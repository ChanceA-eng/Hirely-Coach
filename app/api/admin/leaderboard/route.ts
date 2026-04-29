import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdminRequest } from "@/app/lib/hcAdminConfig";

type ResumeAuditState = {
  overallScore: number;
  updatedAt: number;
  fileName?: string;
};

function normalizeAuditState(input: unknown): ResumeAuditState | null {
  const row = (input ?? {}) as Record<string, unknown>;
  const score = Number(row.overallScore);
  const updatedAt = Number(row.updatedAt);

  if (!Number.isFinite(score) || !Number.isFinite(updatedAt)) return null;

  return {
    overallScore: Math.max(0, Math.min(100, Math.round(score))),
    updatedAt,
    fileName: String(row.fileName || "").trim() || undefined,
  };
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 500 });

  const leaderboard = users
    .map((user) => {
      const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
      const auditState = normalizeAuditState(metadata.resumeAuditState);
      if (!auditState) return null;

      return {
        userId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown",
        email: user.emailAddresses[0]?.emailAddress ?? "",
        score: auditState.overallScore,
        updatedAt: auditState.updatedAt,
        fileName: auditState.fileName ?? "",
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const a = left as { score: number; updatedAt: number };
      const b = right as { score: number; updatedAt: number };
      return b.score - a.score || b.updatedAt - a.updatedAt;
    })
    .slice(0, 10);

  return NextResponse.json({ leaderboard });
}
