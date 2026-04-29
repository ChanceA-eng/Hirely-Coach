import OpenAI from "openai";
import {
  coerceStarrTierId,
  buildBossQuestionRules,
} from "@/app/lib/hirelySupremacy";
import { loadHcAdminConfig } from "@/app/lib/hcAdminConfig";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { resume, job, jobLink, tier } = await req.json();
    const adminConfig = await loadHcAdminConfig();

    const selectedTier = coerceStarrTierId(tier);
    const bossConfig = adminConfig.starrLab.tiers[selectedTier];
    const jobInput = (job || "").trim() || (jobLink ? `Job listing URL: ${jobLink}` : "");

    if (!resume || !jobInput) {
      return Response.json(
        { error: "Resume and job description or job link are required." },
        { status: 400 }
      );
    }

    const count = bossConfig.questionCount;

    const prompt = `You are an expert interview coach.
Generate exactly ${count} high-quality mock interview questions tailored to the candidate and role.

Candidate Resume:
${resume}

Target Job Description:
${jobInput}

Rules:
- Output ONLY the questions
- One question per line
- No headings, no commentary, no explanations

STARR Lab Tier:
- Tier ${bossConfig.tier}: ${bossConfig.title}
- Scenario: ${bossConfig.scenarioTitle}
- Persona: ${bossConfig.persona}
- Persona Prompt: ${bossConfig.systemPrompt}
- ${buildBossQuestionRules(bossConfig)}`;

    const completion = await client.chat.completions.create({
      model: adminConfig.model,
      messages: [{ role: "user", content: prompt }],
      temperature: bossConfig.temperature,
      presence_penalty: bossConfig.presencePenalty,
    });

    const content = completion.choices?.[0]?.message?.content || "";

    return Response.json({
      questions: content,
      tier: bossConfig.tier,
      tierTitle: bossConfig.title,
      bossPersona: bossConfig.persona,
      runtimeBehavior: {
        silenceAnchorMs: bossConfig.silenceAnchorMs,
        interruptThresholdSeconds: bossConfig.interruptThresholdSeconds,
        multiPartSegments: bossConfig.multiPartSegments,
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: "Server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
