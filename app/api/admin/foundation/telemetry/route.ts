import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  appendTelemetry,
  listTelemetry,
  clearTelemetry,
  dropoutHeatmap,
  commonErrors,
  voiceSuccessStats,
  slowAssets,
  type TelemetryEventType,
} from "@/app/lib/foundationTelemetryStore";

function isAdmin(userId: string | null): boolean {
  const adminId =
    process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  return !!adminId && userId === adminId;
}

/** POST /api/admin/foundation/telemetry — log an event (called from client) */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;
  appendTelemetry({
    type: (body.type as TelemetryEventType) ?? "error",
    userId: (body.userId as string | null) ?? null,
    moduleId: Number(body.moduleId ?? 0),
    lessonId: String(body.lessonId ?? ""),
    lessonTitle: body.lessonTitle as string | undefined,
    typed: body.typed as string | undefined,
    expected: body.expected as string | undefined,
    attemptNumber: body.attemptNumber as number | undefined,
    success: body.success as boolean | undefined,
    errorMessage: body.errorMessage as string | undefined,
    audioFile: body.audioFile as string | undefined,
    latencyMs: body.latencyMs as number | undefined,
  });
  return NextResponse.json({ ok: true });
}

/** GET /api/admin/foundation/telemetry?view=heatmap|errors|voice|slow|raw — admin only */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const view = req.nextUrl.searchParams.get("view") ?? "raw";

  if (view === "heatmap") return NextResponse.json(dropoutHeatmap());
  if (view === "errors") return NextResponse.json(commonErrors());
  if (view === "voice") return NextResponse.json(voiceSuccessStats());
  if (view === "slow") return NextResponse.json(slowAssets());

  // raw — support CSV export
  const format = req.nextUrl.searchParams.get("format");
  const events = listTelemetry({ limit: 1000 });

  if (format === "csv") {
    const rows = [
      "id,type,ts,userId,moduleId,lessonId,typed,expected,attemptNumber,success,latencyMs",
      ...events.map((e) =>
        [
          e.id, e.type, new Date(e.ts).toISOString(), e.userId ?? "",
          e.moduleId, e.lessonId,
          `"${(e.typed ?? "").replace(/"/g, '""')}"`,
          `"${(e.expected ?? "").replace(/"/g, '""')}"`,
          e.attemptNumber ?? "", e.success ?? "", e.latencyMs ?? "",
        ].join(",")
      ),
    ].join("\n");
    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="foundation-telemetry-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(events);
}

/** DELETE /api/admin/foundation/telemetry — clear all events */
export async function DELETE() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  clearTelemetry();
  return NextResponse.json({ ok: true });
}
