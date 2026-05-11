import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  insertBetaFeedback,
  type BetaFeedbackCategory,
  type BetaFeedbackKind,
} from "@/app/lib/betaFeedbackStore";

function normalizeCategory(input: unknown): BetaFeedbackCategory {
  const value = String(input ?? "idea").toLowerCase();
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
  return "idea";
}

function normalizeKind(input: unknown): BetaFeedbackKind {
  return String(input ?? "pulse") === "module_milestone" ? "module_milestone" : "pulse";
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Record<string, unknown>;

  const sentimentScore = Math.max(1, Math.min(5, Math.round(Number(body.sentiment_score ?? 3))));
  const comment = String(body.user_comment ?? "").trim();

  if (!comment) {
    return NextResponse.json({ error: "user_comment is required" }, { status: 400 });
  }

  const { userId } = await auth();
  let userEmail: string | null = null;

  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      userEmail = user.emailAddresses[0]?.emailAddress ?? null;
    } catch {
      userEmail = null;
    }
  }

  const row = await insertBetaFeedback({
    kind: normalizeKind(body.kind),
    category: normalizeCategory(body.category),
    sentimentScore,
    userComment: comment,
    moduleNumber: typeof body.module_number === "number" ? Number(body.module_number) : null,
    url: String(body.url ?? ""),
    userAgent: String(body.user_agent ?? ""),
    viewportSize: String(body.viewport_size ?? ""),
    screenResolution: String(body.screen_resolution ?? ""),
    deviceType: String(body.device_type ?? "Unknown Device"),
    userId: userId ?? null,
    userEmail,
    emoji:
      body.emoji === "happy" || body.emoji === "neutral" || body.emoji === "sad"
        ? body.emoji
        : null,
    swahiliInstructionClarity:
      typeof body.swahili_instruction_clarity === "number"
        ? Number(body.swahili_instruction_clarity)
        : null,
    pronunciationGuideHelpful:
      typeof body.pronunciation_guide_helpful === "boolean"
        ? Boolean(body.pronunciation_guide_helpful)
        : null,
    confusingNotes:
      typeof body.confusing_notes === "string" ? String(body.confusing_notes).trim() : null,
  });

  return NextResponse.json({ ok: true, entry: row });
}
