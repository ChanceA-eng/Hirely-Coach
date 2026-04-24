import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { resume, job, questions, answers } = await req.json();

    if (!resume || !job || !Array.isArray(questions) || !Array.isArray(answers)) {
      return Response.json(
        { error: "Resume, job description, questions, and answers are required." },
        { status: 400 }
      );
    }

    const formattedQA = questions
      .map((question, index) => {
        const answer = answers[index] || "(no response)";
        return `Question ${index + 1}: ${question}\nAnswer: ${answer}`;
      })
      .join("\n\n");

    const prompt = `You are a Senior Career Coach evaluating a mock interview using the STARR Performance Metric (Situation, Task, Action, Result, Reflection).

Resume:
${resume}

Job Description:
${job}

Candidate Q&A:
${formattedQA}

Task:
Analyze every answer against the STARR framework and produce structured feedback in EXACTLY the format below. Use ### for all section headers and **bold** for all metrics, component labels, key strengths, and the final score.

### Overall Performance
Write a 3-4 sentence executive summary of the candidate's overall interview performance relative to the job description. End with a bolded score on its own line:
**STARR Score: [0-100]/100**
(Calculate by scoring how thoroughly the candidate addressed each of the five STARR components across all answers — 20 points per component maximum.)

### STARR Breakdown
Provide a dedicated paragraph for each component with a bolded label:

**Situation** — Assess whether the candidate clearly described relevant context and background in their answers.

**Task** — Assess whether the candidate clearly defined their specific role and responsibility within each scenario.

**Action** — Assess whether the candidate described concrete, specific actions they personally took (not the team).

**Result** — Assess whether the candidate quantified outcomes or clearly articulated the impact of their actions.

**Reflection** — Assess whether the candidate demonstrated self-awareness, growth mindset, or lessons learned.

### Areas for Improvement
List exactly 3 specific, actionable recommendations. Use a **bold label** for each (e.g. **Quantify Your Results**). Reference specific answers where relevant. Close with one short motivating sentence.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return Response.json({ feedback: completion.choices[0].message.content });
  } catch (err) {
    return Response.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
