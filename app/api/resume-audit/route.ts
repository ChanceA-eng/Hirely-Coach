import OpenAI from "openai";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { cleanResumeText, normalizeResumeAuditReport } from "@/app/lib/resumeAudit";
import type { ImpactEntry } from "@/app/lib/impactLog";
import { appendAdminAuditLog } from "@/app/lib/adminAuditLogStore";
import { loadHcAdminConfig } from "@/app/lib/hcAdminConfig";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_MODEL_CHARS = 32000; // ~8000 tokens at ~4 chars/token
const CACHE_TTL_MS = 5 * 60 * 1000;
const PHASE_CACHE = new Map<string, { at: number; value: unknown }>();

type AuditPhase = "fast" | "deep";

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
    scoreDiagnostics: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          metric: {
            type: "string",
            enum: ["Clarity", "Storyflow", "Scanability", "Strength"],
          },
          score: { type: "number" },
          critical_flaw: { type: "string" },
        },
        required: ["metric", "score", "critical_flaw"],
      },
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
    "scoreDiagnostics",
  ],
} as const;

const FAST_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "number" },
    overallGrade: {
      type: "string",
      enum: ["Needs Work", "Good", "Elite"],
    },
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
    atsCompatibility: {
      type: "string",
      enum: ["High", "Medium", "Low"],
    },
    scoreDiagnostics: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          metric: {
            type: "string",
            enum: ["Clarity", "Storyflow", "Scanability", "Strength"],
          },
          score: { type: "number" },
          critical_flaw: { type: "string" },
        },
        required: ["metric", "score", "critical_flaw"],
      },
    },
    keywords: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: { type: "string" },
    },
  },
  required: [
    "overallScore",
    "overallGrade",
    "metrics",
    "impactScore",
    "atsCompatibility",
    "scoreDiagnostics",
    "keywords",
  ],
} as const;

const STRICT_EVIDENCE_SCORING_INSTRUCTIONS = `NON-NEGOTIABLE SCORING POLICY:
- Start every metric at a Base Score of 3.
- Deduct 1-2 points for every cliche found (examples: "hard-working", "team player", "motivated individual").
- Deduct 2 points when a job entry lacks a quantitative result (%, $, or # evidence).
- Deduct 3 points for inconsistent margins/font hierarchy or visibly uneven layout rhythm.
- Award +1 only when specific, high-impact evidence is present.

CRITICAL FAILURE TRIGGERS (must force that metric to 3/10 or lower):
- Scanability: blocks of text longer than 4 lines without bullets.
- Clarity: unexplained or irrelevant jargon.
- Storyflow: employment gaps over 6 months without context.
- Strength: passive voice patterns like "was responsible for" instead of active verbs.

FORCED CRITICAL FEEDBACK:
- For every metric score below 8, include a specific critical_flaw statement.
- scoreDiagnostics must contain exactly 4 rows for Clarity, Storyflow, Scanability, and Strength.
- Keep critical_flaw concrete and evidence-based, not generic encouragement.`;

const FAST_PASS_INSTRUCTIONS = `FAST PASS MODE:
- Return only numeric scoring output and concise keywords.
- Be strict and evidence-based.
- Start each metric from 3 and adjust only with concrete proof.
- Keep output compact and deterministic.`;

function fnvHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function stripLowSignalSections(rawText: string): string {
  let text = String(rawText || "").trim();
  if (text.length <= MAX_MODEL_CHARS) return text;

  text = text.replace(
    /\n(?:appendix|references|publications|certifications|additional information)\b[\s\S]*$/i,
    ""
  ).trim();

  if (text.length > MAX_MODEL_CHARS) {
    text = text.slice(0, MAX_MODEL_CHARS);
  }
  return text;
}

function buildCacheKey(phase: AuditPhase, scanKey: string, resumeText: string, impactEntries: ImpactEntry[]): string {
  if (scanKey) return `${phase}:${scanKey}`;
  const impactSig = fnvHash(
    JSON.stringify(
      impactEntries
        .map((entry) => ({
          createdAt: entry.createdAt,
          action: String(entry.action || "").trim().toLowerCase(),
          proof: String(entry.proof || "").trim().toLowerCase(),
          result: String(entry.result || "").trim().toLowerCase(),
        }))
        .sort((left, right) => left.createdAt - right.createdAt)
    )
  );
  return `${phase}:${fnvHash(resumeText)}:${impactSig}`;
}

function readCached<T>(key: string): T | null {
  const hit = PHASE_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    PHASE_CACHE.delete(key);
    return null;
  }
  return hit.value as T;
}

function writeCached(key: string, value: unknown) {
  PHASE_CACHE.set(key, { at: Date.now(), value });
}

function formatImpactEntries(entries: ImpactEntry[], limit = 10): string {
  if (entries.length === 0) return "No Impact Log entries provided.";

  return entries
    .slice(0, limit)
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

    const startedAt = Date.now();
    const url = new URL(req.url);
    const body = await req.json();
    const phase = ((url.searchParams.get("phase") || body?.phase || "deep").toLowerCase() === "fast" ? "fast" : "deep") as AuditPhase;
    const resumeText = cleanResumeText(String(body?.resumeText ?? ""));
    const scanKey = String(body?.scanKey || "").trim();
    const impactEntries = Array.isArray(body?.impactEntries)
      ? (body.impactEntries as ImpactEntry[])
      : [];
    const config = await loadHcAdminConfig();

    if (!resumeText) {
      return Response.json({ error: "resumeText is required." }, { status: 400 });
    }

    // Safety guard: API expects plain text content, never raw file payloads.
    if (/^data:application\/pdf;base64,/i.test(resumeText) || /^JVBERi0x/i.test(resumeText)) {
      return Response.json({ error: "Provide extracted text only, not binary/base64 resume content." }, { status: 400 });
    }

    const modelReadyText = stripLowSignalSections(resumeText);
    const cacheKey = buildCacheKey(phase, scanKey, modelReadyText, impactEntries);
    const cached = readCached<Record<string, unknown>>(cacheKey);
    if (cached) {
      return Response.json({ ...cached, cached: true, phase });
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
      model: phase === "fast" ? "gpt-4o-mini" : config.model,
      temperature: phase === "fast" ? 0 : config.temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      seed: 42,
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "system", content: STRICT_EVIDENCE_SCORING_INSTRUCTIONS },
        ...(phase === "fast" ? [{ role: "system" as const, content: FAST_PASS_INSTRUCTIONS }] : []),
        {
          role: "user",
          content: `Resume Text:\n\n${modelReadyText}\n\nImpact Log:\n\n${formatImpactEntries(impactEntries, phase === "fast" ? 3 : 10)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: phase === "fast" ? "resume_audit_fast" : "resume_audit_report",
          strict: true,
          schema: phase === "fast" ? FAST_RESPONSE_SCHEMA : RESPONSE_SCHEMA,
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

    if (phase === "fast") {
      const fastPayload = {
        ...(parsed as Record<string, unknown>),
        phase,
        durationMs: Date.now() - startedAt,
      };
      writeCached(cacheKey, fastPayload);
      return Response.json(fastPayload);
    }

    const report = normalizeResumeAuditReport(parsed);

    appendAdminAuditLog({
      userId: userId ?? null,
      email,
      model: config.model,
      temperature: config.temperature,
      promptPreview: config.systemPrompt.slice(0, 240),
      resumeSnippet: modelReadyText.slice(0, 320),
      impactEntries,
      rawResponse: content,
      normalizedReport: report,
    });

    const deepPayload = {
      ...report,
      phase,
      durationMs: Date.now() - startedAt,
    };
    writeCached(cacheKey, deepPayload);

    return Response.json(deepPayload);
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
