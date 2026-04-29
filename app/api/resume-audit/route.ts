import OpenAI from "openai";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { cleanResumeText, normalizeResumeAuditReport } from "@/app/lib/resumeAudit";
import type { ImpactEntry } from "@/app/lib/impactLog";
import { appendAdminAuditLog } from "@/app/lib/adminAuditLogStore";
import { loadHcAdminConfig } from "@/app/lib/hcAdminConfig";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "number" },
    overallGrade: {
      type: "string",
      enum: ["Needs Work", "Good", "Elite"],
    },
    coachSummary: { type: "string" },
    logSuggestions: { type: "string" },
    topAdvice: { type: "string" },
    metrics: {
      type: "object",
      additionalProperties: false,
      properties: {
        language: { type: "number" },
        structure: { type: "number" },
        layout: { type: "number" },
      },
      required: ["language", "structure", "layout"],
    },
    impactScore: { type: "number" },
    criticalFixes: {
      type: "array",
      items: { type: "string" },
    },
    optimizations: {
      type: "array",
      items: { type: "string" },
    },
    suggestedPowerVerbs: {
      type: "array",
      items: { type: "string" },
    },
    detailedSwaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          youSaid: { type: "string" },
          tryThis: { type: "string" },
          reason: { type: "string" },
        },
        required: ["youSaid", "tryThis", "reason"],
      },
    },
    cleanUp: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          issue: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["issue", "suggestion"],
      },
    },
    xyzAudit: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          currentBullet: { type: "string" },
          formulaBreakdown: {
            type: "object",
            additionalProperties: false,
            properties: {
              x: { type: "string" },
              y: { type: "string" },
              z: { type: "string" },
            },
            required: ["x", "y", "z"],
          },
          powerSuggestion: { type: "string" },
        },
        required: ["currentBullet", "formulaBreakdown", "powerSuggestion"],
      },
    },
    atsCompatibility: {
      type: "string",
      enum: ["High", "Medium", "Low"],
    },
  },
  required: [
    "overallScore",
    "overallGrade",
    "coachSummary",
    "logSuggestions",
    "topAdvice",
    "metrics",
    "impactScore",
    "criticalFixes",
    "optimizations",
    "suggestedPowerVerbs",
    "detailedSwaps",
    "cleanUp",
    "xyzAudit",
    "atsCompatibility",
  ],
} as const;

function formatImpactEntries(entries: ImpactEntry[]): string {
  if (entries.length === 0) return "No Impact Log entries provided.";

  return entries
    .slice(0, 10)
    .map(
      (entry, index) =>
        `Entry ${index + 1}:\nDate: ${new Date(entry.createdAt).toLocaleDateString()}\nAction: ${entry.action}\nProof: ${entry.proof}\nResult: ${entry.result}`
    )
    .join("\n\n");
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
    }

    const body = await req.json();
    const resumeText = cleanResumeText(String(body?.resumeText ?? ""));
    const impactEntries = Array.isArray(body?.impactEntries)
      ? (body.impactEntries as ImpactEntry[])
      : [];
    const config = await loadHcAdminConfig();

    if (!resumeText) {
      return Response.json({ error: "resumeText is required." }, { status: 400 });
    }

    const { userId } = await auth();
    let email: string | null = null;
    if (userId) {
      try {
        const clientForUser = await clerkClient();
        const user = await clientForUser.users.getUser(userId);
        email = user.emailAddresses[0]?.emailAddress ?? null;
      } catch {
        email = null;
      }
    }

    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      seed: 42,
      messages: [
        { role: "system", content: config.systemPrompt },
        {
          role: "user",
          content: `Resume Text:\n\n${resumeText}\n\nImpact Log:\n\n${formatImpactEntries(impactEntries)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "resume_audit_report",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return Response.json({ error: "Model returned an empty response." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return Response.json({ error: "Model returned invalid JSON." }, { status: 502 });
    }

    const report = normalizeResumeAuditReport(parsed);

    appendAdminAuditLog({
      userId: userId ?? null,
      email,
      model: config.model,
      temperature: config.temperature,
      promptPreview: config.systemPrompt.slice(0, 240),
      resumeSnippet: resumeText.slice(0, 320),
      impactEntries,
      rawResponse: content,
      normalizedReport: report,
    });

    return Response.json(report);
  } catch (err) {
    return Response.json(
      {
        error: "Failed to audit resume.",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
