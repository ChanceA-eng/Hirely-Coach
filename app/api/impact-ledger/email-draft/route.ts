import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadHcAdminConfig } from "@/app/lib/hcAdminConfig";
import type { ImpactEntry } from "@/app/lib/impactLog";

type EmailMode = "pulse" | "promotion" | "recap";
type EmailTone = "casual" | "formal";

type RequestBody = {
  wins?: ImpactEntry[];
  mode?: EmailMode;
  tone?: EmailTone;
  levelTitle?: string;
  certificationsCompleted?: number;
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
  required: ["subject", "body"],
} as const;

function normalizeWins(input: unknown): ImpactEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const id = String(row.id || "").trim();
      const createdAt = Number(row.createdAt || 0);
      const action = String(row.action || "").trim();
      const proof = String(row.proof || "").trim();
      const result = String(row.result || "").trim();
      if (!id || !createdAt || !action || !proof || !result) return null;
      return { id, createdAt, action, proof, result } as ImpactEntry;
    })
    .filter(Boolean)
    .slice(0, 5) as ImpactEntry[];
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const body = (await request.json()) as RequestBody;
    const wins = normalizeWins(body.wins);
    if (wins.length < 3) {
      return NextResponse.json({ error: "Select at least 3 wins." }, { status: 400 });
    }

    const mode = body.mode === "promotion" || body.mode === "recap" ? body.mode : "pulse";
    const tone = body.tone === "casual" ? "casual" : "formal";
    const levelTitle = String(body.levelTitle || "Professional").trim();
    const certificationsCompleted = Math.max(0, Math.floor(Number(body.certificationsCompleted || 0)));

    const modeInstruction =
      mode === "promotion"
        ? "Frame the update as a promotion/raise request with ROI and business value emphasis."
        : mode === "recap"
        ? "Frame the update as a project recap centered on one major theme from the selected wins."
        : "Frame the update as a concise weekly/monthly progress pulse.";

    const toneInstruction =
      tone === "casual"
        ? "Use a concise, direct, low-friction tone in short paragraphs."
        : "Use a formal, executive-ready tone with clear business framing.";

    const certificationLine =
      certificationsCompleted > 0
        ? `The user has completed ${certificationsCompleted} certifications. Mention this naturally in one sentence.`
        : "Do not invent certifications.";

    const config = await loadHcAdminConfig();

    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an executive career coach. Take raw wins and transform them into a concise, professional email for a manager. Focus on measurable results and value added. Avoid internal app jargon. When drafting emails, NEVER use the words 'points', 'XP', 'streaks', 'games', or 'levels'. Instead, translate these into 'achievements', 'measurable impact', 'consistency', 'professional development', and 'competency milestones'. The output must be plain professional language.",
        },
        {
          role: "user",
          content: `${modeInstruction}\n${toneInstruction}\nInclude one line that references the user's current professional development status: ${levelTitle}.\n${certificationLine}\n\nSelected wins:\n${wins
            .map(
              (win, index) =>
                `${index + 1}. Date: ${new Date(win.createdAt).toLocaleDateString()} | Action: ${win.action} | Proof: ${win.proof} | Result: ${win.result}`
            )
            .join("\n")}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "manager_email_draft",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return NextResponse.json({ error: "Model returned an empty response." }, { status: 502 });
    }

    const parsed = JSON.parse(content) as { subject?: string; body?: string };

    return NextResponse.json({
      subject: String(parsed.subject || "Professional Update"),
      body: String(parsed.body || ""),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to draft manager email.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
