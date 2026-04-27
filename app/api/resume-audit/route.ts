import OpenAI from "openai";
import { cleanResumeText, normalizeResumeAuditReport } from "@/app/lib/resumeAudit";
import type { ImpactEntry } from "@/app/lib/impactLog";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `ACTING ROLE: You are a high-stakes Recruiter. You review 500 resumes per day and are looking for reasons to REJECT a resume. Be strict, precise, and direct.

TASK: Audit the resume with a rejection-first mindset while still giving clear, simple, and encouraging rewrite guidance.
Scoring is a calculation, not an opinion. For the same exact input, produce the same score and same rubric reasoning.

CORE LOGIC GATE (MANDATORY):
1) Default to low score.
- Start every resume at 3/10 quality.
- Points must be earned with concrete evidence of results.
- If there are no numbers, no specific achievements, and poor grammar, overallScore cannot exceed 40.

2) Penalty system (apply hard penalties):
- Spelling or grammar error: -10 points per error.
- Cliche phrases (example: "hard worker", "motivated individual"): -5 points per instance.
- Vague statements (example: "responsible for", "helped with"): -10 points per instance.

3) Score bands:
- 0-30 (Weak): Contains typos, vague duties ("responsible for..."), or objective statements.
- 31-60 (Average): Clean layout but lacks proof (numbers/results). Sounds like a job description, not a list of wins.
- 61-85 (Strong): Uses active verbs and has at least 3-5 measurable results (example: "Saved 20% time").
- 86-100 (Elite): Perfect grammar, zero fluff, and every single bullet point shows a clear benefit to the employer.

4) Hard cap rule:
- If you find even one spelling error or a phrase like "I am a motivated individual", overallScore cannot be higher than 60.

SCORING CRITERIA:
- Language (33%): Active voice, strong verbs, and clarity.
- Structure (33%): Contact, Summary, Experience, Skills order and readability.
- Looks/Layout (34%): Human readability and ATS scannability.
- Impact score: Strength of measurable proof and outcomes.

XYZ METHODOLOGY (MANDATORY):
- For Language and Impact scoring, use Google XYZ: "Accomplished X as measured by Y, by doing Z".
- Identify the 3 weakest bullets in Experience.
- For each bullet, provide x, y, z breakdown and a rewritten powerSuggestion.

COACHING STYLE (MANDATORY):
- Avoid technical jargon.
- Use before-and-after style for rewrite suggestions.
- Be specific, actionable, and concise.
- Do not praise weak content.
- Never use the words "XYZ", "STAR", or "ATS" in user-facing feedback strings.

IMPACT LOG INTEGRATION:
- If ImpactEntries are provided, inspect them carefully.
- Identify a specific win from the log that would strengthen a weak part of the resume.
- Say so directly in logSuggestions and include the date, using this phrase pattern: "I found a win in your Ledger from [Date] that would fit here!"

OUTPUT FORMAT: Return valid JSON only. Do not include markdown, headings, wrapper text, or titles like "Resume Audit" in JSON values.
Use exactly these keys and no additional keys:
{
  "overallScore": 0,
  "overallGrade": "Needs Work / Good / Elite",
  "coachSummary": "Encouraging high-level advice.",
  "logSuggestions": "Personalized advice based on Impact Log history.",
  "topAdvice": "One main thing the user should fix first.",
  "metrics": {
    "language": 0,
    "structure": 0,
    "layout": 0
  },
  "impactScore": 0,
  "criticalFixes": ["list of highest-priority items"],
  "optimizations": ["list of improvements"],
  "suggestedPowerVerbs": ["list of 5 verbs to swap"],
  "detailedSwaps": [
    {
      "youSaid": "Original sentence from resume",
      "tryThis": "Better, high-impact version",
      "reason": "Why the second version is more professional."
    }
  ],
  "cleanUp": [
    {
      "issue": "Repetitive statement or cliché",
      "suggestion": "How to fix or remove it."
    }
  ],
  "xyzAudit": [
    {
      "currentBullet": "string",
      "formulaBreakdown": {
        "x": "string",
        "y": "string",
        "z": "string"
      },
      "powerSuggestion": "string"
    }
  ],
  "atsCompatibility": "High/Medium/Low"
}`;

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

    if (!resumeText) {
      return Response.json({ error: "resumeText is required." }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      seed: 42,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
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
