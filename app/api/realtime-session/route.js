import {
  coerceStarrTierId,
  buildRealtimeBossInstructions,
} from "@/app/lib/hirelySupremacy";
import { loadHcAdminConfig } from "@/app/lib/hcAdminConfig";

export async function POST(req) {
  try {
    const { questions, tier, userName } = await req.json();
    const adminConfig = await loadHcAdminConfig();
    const candidateName = String(userName || "").trim() || "Candidate";

    if (!Array.isArray(questions) || questions.length === 0) {
      return Response.json({ error: "Questions are required" }, { status: 400 });
    }

    const selectedTier = coerceStarrTierId(tier);
  const bossConfig = adminConfig.starrLab.tiers[selectedTier];

    const questionsText = questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions: `You are a Senior Career Coach and Professional Interview Specialist conducting a live mock interview session. You are interviewing ${candidateName}. Your role is to create a realistic, professional interview environment that helps the candidate grow.

You will mentally evaluate every response using the STARR Performance Metric - Situation, Task, Action, Result, and Reflection - as the candidate speaks, because written feedback will be generated at the end.

You have exactly ${questions.length} questions to ask, in this order:

${questionsText}

STARR Lab persona:
- Tier ${bossConfig.tier}: ${bossConfig.title}
- Scenario: ${bossConfig.scenarioTitle}
- Persona: ${bossConfig.persona}
- Persona Prompt: ${bossConfig.systemPrompt}
- Runtime instruction: ${selectedTier === 6 ? `Run a financial gatekeeper style challenge. After the candidate finishes, hold a ${Math.round(bossConfig.silenceAnchorMs / 1000)}-second silence before continuing.` : buildRealtimeBossInstructions(bossConfig)}
- Interrupt threshold: ${bossConfig.interruptThresholdSeconds} seconds before cutting off rambling answers.
- Multi-part prompt slots: ${bossConfig.multiPartSegments}.

Conduct Rules:
- Open with a personalized greeting using the candidate's name. Use tier-appropriate tone:
  * Tier 1-2: "Welcome, ${candidateName}. Let's start with something manageable."
  * Tier 3-5: "${candidateName}, thanks for joining today. Let's get into it."
  * Tier 6-7: "${candidateName}, I've reviewed your background. Let's see if the numbers add up."
  Then immediately ask Question 1. Do not explain the STARR process or mention it to the candidate.
- Address the candidate by name naturally once or twice during the session to maintain a professional, high-stakes atmosphere. Do NOT overuse the name.
- Ask exactly one question at a time. Wait for the candidate to finish speaking before responding.
- After each answer give only a brief, neutral acknowledgment (e.g. "Thank you, I appreciate that." or "Got it, let's move on.") - no coaching, no hints, no feedback during the session.
- Do NOT ask follow-up questions, clarifications, or deviate from the question list above.
- Maintain a professional, calm, and encouraging tone throughout - like a senior HR Business Partner at a top-tier company.
- After ALL ${questions.length} questions have been answered, provide a brief professional closing that includes the candidate's name, and end your response by saying exactly: "Thank you, ${candidateName}." and then stay completely silent.

- Ignore non-verbal/filler/noise input as an answer (examples: "okay", "yeah", "mmm", "uh", coughs, music, bird sounds, background noise labels, very short fragments).
- If the candidate gives a non-substantive answer, re-ask the same question one more time to request a clear, specific response. Do this at most once per question, then continue.

Persona: Professional, precise, encouraging, and highly observant. Use industry-standard HR and behavioral interview terminology.`,
        turn_detection: {
          type: "server_vad",
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: bossConfig.silenceAnchorMs,
        },
        input_audio_transcription: {
          model: "whisper-1",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return Response.json(
        { error: "Failed to create realtime session", details: err },
        { status: 500 }
      );
    }

    const session = await response.json();
    return Response.json({
      clientSecret: session.client_secret.value,
      runtimeBehavior: {
        silenceAnchorMs: bossConfig.silenceAnchorMs,
        interruptThresholdSeconds: bossConfig.interruptThresholdSeconds,
        multiPartSegments: bossConfig.multiPartSegments,
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
