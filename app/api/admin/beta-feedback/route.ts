import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  betaFeedbackSummary,
  listBetaFeedback,
  type BetaFeedbackCategory,
  updateBetaFeedback,
} from "@/app/lib/betaFeedbackStore";

function isAdmin(userId: string | null): boolean {
  const adminId = process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  return !!userId && (!adminId || userId === adminId);
}

function parseCategory(input: string | null): BetaFeedbackCategory | undefined {
  if (!input) return undefined;
  const value = input.toLowerCase();
  if (
    value === "layout_issue" ||
    value === "translation_error" ||
    value === "pronunciation_help" ||
    value === "idea" ||
    value === "translation_quality" ||
    value === "pronunciation_clarity" ||
    value === "confusing_content"
  ) {
    return value;
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const moduleParam = req.nextUrl.searchParams.get("module");
  const resolvedParam = req.nextUrl.searchParams.get("resolved");
  const starredParam = req.nextUrl.searchParams.get("starred");
  const format = req.nextUrl.searchParams.get("format");

  const rows = listBetaFeedback({
    query,
    module:
      moduleParam && moduleParam !== "all" ? Math.max(1, Math.min(12, Math.floor(Number(moduleParam)))) : undefined,
    category: parseCategory(req.nextUrl.searchParams.get("category")),
    resolved:
      resolvedParam === "true" ? true : resolvedParam === "false" ? false : undefined,
    starred:
      starredParam === "true" ? true : starredParam === "false" ? false : undefined,
    limit: 3000,
  });

  if (format === "csv") {
    const header = [
      "id",
      "createdAt",
      "kind",
      "category",
      "moduleNumber",
      "sentimentScore",
      "userComment",
      "deviceType",
      "screenResolution",
      "viewportSize",
      "url",
      "resolved",
      "starred",
    ];

    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          row.id,
          new Date(row.createdAt).toISOString(),
          row.kind,
          row.category,
          row.moduleNumber ?? "",
          row.sentimentScore,
          `"${row.userComment.replace(/"/g, '""')}"`,
          `"${row.deviceType.replace(/"/g, '""')}"`,
          row.screenResolution,
          row.viewportSize,
          `"${row.url.replace(/"/g, '""')}"`,
          row.resolved,
          row.starred,
        ].join(",")
      ),
    ].join("\n");

    return new NextResponse(lines, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="user-voice-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ rows, summary: betaFeedbackSummary(rows) });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    id?: string;
    resolved?: boolean;
    starred?: boolean;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = updateBetaFeedback(body.id, {
    resolved: typeof body.resolved === "boolean" ? body.resolved : undefined,
    starred: typeof body.starred === "boolean" ? body.starred : undefined,
    actorUserId: userId,
  });

  if (!updated) {
    return NextResponse.json({ error: "Feedback entry not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, row: updated });
}
