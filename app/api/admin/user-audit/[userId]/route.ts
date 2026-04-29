import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdminRequest } from "@/app/lib/hcAdminConfig";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    user: {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown",
      email: user.emailAddresses[0]?.emailAddress ?? "",
      createdAt: user.createdAt,
    },
    impactLedger: Array.isArray(publicMetadata.impactLedger)
      ? publicMetadata.impactLedger
      : [],
    resumeAuditState:
      typeof publicMetadata.resumeAuditState === "object" && publicMetadata.resumeAuditState
        ? publicMetadata.resumeAuditState
        : null,
  });
}
