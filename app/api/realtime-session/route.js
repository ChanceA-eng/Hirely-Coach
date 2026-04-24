export async function POST(req) {
  try {
    const { questions } = await req.json();

    if (!Array.isArray(questions) || questions.length === 0) {
      return Response.json({ error: "Questions are required" }, { status: 400 });
    }

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
        instructions: `You are a Senior Career Coach and Professional Interview Specialist conducting a live mock interview session. Your role is to create a realistic, professional interview environment that helps the candidate grow.

You will mentally evaluate every response using the STARR Performance Metric — Situation, Task, Action, Result, and Reflection — as the candidate speaks, because written feedback will be generated at the end.

You have exactly ${questions.length} questions to ask, in this order:

${questionsText}

Conduct Rules:
- Open with a single warm, professional greeting, then immediately ask Question 1. Do not explain the STARR process or mention it to the candidate.
- Ask exactly one question at a time. Wait for the candidate to finish speaking before responding.
- After each answer give only a brief, neutral acknowledgment (e.g. "Thank you, I appreciate that." or "Got it, let's move on.") — no coaching, no hints, no feedback during the session.
- Do NOT ask follow-up questions, clarifications, or deviate from the question list above.
- Maintain a professional, calm, and encouraging tone throughout — like a senior HR Business Partner at a top-tier company.
- After ALL ${questions.length} questions have been answered, provide a brief professional closing and end your response by saying exactly: "Thank you." and then stay completely silent.

- If the candidate gives a non-substantive answer (examples: "okay", "yeah", "mmm", "no", very short fragments), re-ask the same question one more time to request a clear, specific response. Do this at most once per question, then continue.

Persona: Professional, precise, encouraging, and highly observant. Use industry-standard HR and behavioral interview terminology.`,
        turn_detection: {
          type: "server_vad",
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 2000,
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
    return Response.json({ clientSecret: session.client_secret.value });
  } catch (err) {
    return Response.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
