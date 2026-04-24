import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const QUESTION_LIMITS = {
  quick: 3,
  medium: 6,
  intensive: 9,
};

export async function POST(req) {
  try {
    const { resume, job, level } = await req.json();

    if (!resume || !job || !level) {
      return Response.json(
        { error: "Resume, job description, and level are required." },
        { status: 400 }
      );
    }

    const count = QUESTION_LIMITS[level] || QUESTION_LIMITS.medium;

    const prompt = `You are an expert interview coach.
Generate exactly ${count} high-quality mock interview questions tailored to the candidate and role.

Candidate Resume:
${resume}

Target Job Description:
${job}

Rules:
- Output ONLY the questions
- One question per line
- No headings, no commentary, no explanations`; 

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = completion.choices?.[0]?.message?.content || "";

    return Response.json({
      questions: content,
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
