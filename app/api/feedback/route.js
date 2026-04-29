import OpenAI from "openai";
import {
  coerceStarrTierId,
  getStarrTierConfig,
  getTierSkillAssessment,
  evaluateBattleStats,
  buildReviewTape,
  formatBattleStatsForReport,
} from "@/app/lib/hirelySupremacy";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const NON_SUBSTANTIVE_PATTERNS = [
  /^\s*$/, /^(mm+|mmm+|uh+|um+|hmm+|ah+|eh+)\b/i,
  /^(ok(ay)?|yeah|yep|nope|nah|sure|right)\s*$/i,
  /^(noise|background|bird|music|cough|laugh|static)\s*$/i,
];

function sanitizeAnswer(rawAnswer) {
  const text = String(rawAnswer || "").trim();
  if (!text) return "[insufficient response]";
  const normalized = text.replace(/\s+/g, " ").trim();
  // Only flag as noise if both short AND matches filler pattern
  // Concise substantive answers ("Led 50-person restructuring") must pass
  const tooShort = normalized.split(" ").length < 3;
  const looksLikeNoise = NON_SUBSTANTIVE_PATTERNS.some((pattern) => pattern.test(normalized));
  return (tooShort && looksLikeNoise) || looksLikeNoise ? "[insufficient response]" : normalized;
}

export async function POST(req) {
  try {
    const { resume, job, questions, answers, tier } = await req.json();

    if (!resume || !job || !Array.isArray(questions) || !Array.isArray(answers)) {
      return Response.json(
        { error: "Resume, job description, questions, and answers are required." },
        { status: 400 }
      );
    }

    const formattedQA = questions
      .map((question, index) => {
        const answer = sanitizeAnswer(answers[index]);
        return `Question ${index + 1}: ${question}\nAnswer: ${answer}`;
      })
      .join("\n\n");

    const prompt = `You are a Senior Career Coach evaluating a mock interview using the STARR Performance Metric (Situation, Task, Action, Result, Reflection).

Candidate Level: ${tier ? `Tier ${tier}` : "Unspecified"}
Resume:
${resume}

Job Description:
${job}

Candidate Q&A:
${formattedQA}

Task:
Analyze every answer against the STARR framework and produce structured feedback in EXACTLY the format below. Use ### for all section headers and **bold** for all metrics, component labels, key strengths, and the final score.

Scoring rules:
- Treat any answer shown as [insufficient response] as a failed answer (0 points for that question).
- Ignore non-verbal filler (mmm, uh, okay, yeah), acknowledgements, and background noise text — do not count them as answers.
- If an answer is vague, off-topic, or lacks specifics, score it as weak even if the wording sounds confident.
- Be strict and realistic: this score should reflect real senior-recruiter standards, not encouragement.
- Level-aware penalty calibration:
  * Tier 1–2 (Novice/Apprentice): note gaps as learning opportunities, deduct lightly.
  * Tier 3–5 (Candidate/Expert): apply moderate deductions for missing STARR components.
  * Tier 6–7 (Executive/Master): apply significant deductions for vague or unquantified answers; expect executive-quality precision.

### Overall Performance
Write a 3–4 sentence executive summary of the candidate's overall interview performance relative to the job description. End with a bolded score on its own line:
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
List exactly 3 specific, actionable recommendations. Use a **bold label** for each (e.g. **Quantify Your Results**). Reference specific answers where relevant.
Recommendation policy:
- Refer to "Lessons" (not "courses" or "modules").
- When a score is below 60, reference a specific Hirely Academy Lesson by name, e.g. "Review the 'Efficiency Auditor' Lesson to sharpen your Result framing" or "The 'Impact Storytelling' Lesson covers how to quantify soft-skill wins."
- Prioritize Lesson names from this catalog: Impact Storytelling, Efficiency Auditor, Strategic Influence, Executive Presence, Conflict Resolution, Negotiation Mastery, Leadership Under Pressure, Data-Driven Decision Making, Stakeholder Management, Career Narrative Architect.
Close with one short motivating sentence.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const qaTurns = questions.map((question, index) => ({
      question,
      answer: answers[index] || "",
    }));
    const selectedTier = coerceStarrTierId(tier);
    const tierConfig = getStarrTierConfig(selectedTier);
    const battleStats = evaluateBattleStats(qaTurns);
    const reviewTape = buildReviewTape(qaTurns);
    const tierAssessment = getTierSkillAssessment(tierConfig, battleStats);
    const supremacyAppendix = formatBattleStatsForReport(battleStats, reviewTape);
    const postMatchAnalysis = [
      "### Post-Match Analysis",
      `Tier ${tierConfig.tier} - ${tierConfig.title} (${tierConfig.persona})`,
      `Mastered: ${tierAssessment.mastered}`,
      `Missed: ${tierAssessment.missed}`,
    ].join("\n");

    const baseFeedback = completion.choices[0].message.content || "";
    const feedback = `${baseFeedback}\n\n${supremacyAppendix}\n\n${postMatchAnalysis}`;

    return Response.json({ feedback, status: "complete" });
  } catch (err) {
    return Response.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
