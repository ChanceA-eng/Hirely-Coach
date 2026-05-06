"use client";

import CoachTooltip from "./CoachTooltip";

/**
 * Plain-English definitions for common career jargon.
 * Keys should be lowercase for case-insensitive matching.
 */
const TERM_DEFINITIONS: Record<string, string> = {
  "kpis": "Numbers that show how well you did — like 'I sold 50 cars' or 'I saved the team 10 hours a week.'",
  "kpi": "A number that shows how well you (or your team) did — for example, 'sales went up 20%.'",
  "stakeholders": "The people who care about the outcome of your work — your manager, your team, your clients, or your company.",
  "stakeholder": "Someone who cares about what you're doing — like your manager, a client, or a teammate.",
  "deliverables": "The actual things you finish and hand over — like a report, a product, or a project.",
  "deliverable": "Something specific you promise to finish and give to someone — like a report or a finished project.",
  "quantitative metrics": "Numbers that show how well you did — like 'I helped 200 customers' or 'revenue grew by 30%.'",
  "roi": "Return on Investment — did the work pay off? For example: 'We spent $500 and made $2,000 back.'",
  "okrs": "Goals you set at the start of a period — what you want to achieve and how you'll know you got there.",
  "okr": "A goal you set — what you want to achieve and a number to show you hit it.",
  "bandwidth": "How much time and energy you have available right now.",
  "synergy": "When two people or teams work together and get better results than they would alone.",
  "leverage": "Using what you already have — skills, connections, or tools — to get a bigger result.",
  "cross-functional": "A team made up of people from different departments working together on one project.",
  "agile": "A way of working where you break big projects into small steps and check in often.",
  "scrum": "A popular Agile method where a small team works in short bursts (called sprints) to get things done fast.",
  "sprint": "A short work period — usually 1–2 weeks — where your team focuses on finishing specific tasks.",
  "pipeline": "A step-by-step process — for example, a sales pipeline tracks deals from first contact to closed sale.",
  "headcount": "The number of people on a team or in a company.",
  "escalation": "When a problem is passed up to a manager because it needs more authority or resources to fix.",
  "core competencies": "The key skills and strengths that make you (or a company) really good at what you do.",
  "value proposition": "A clear, simple reason why someone should choose you — what makes you different and worth it.",
};

interface TermTooltipProps {
  /** The technical term to display with a tooltip. */
  term: string;
  /** Optional override for the definition. Falls back to the built-in dictionary. */
  definition?: string;
}

/**
 * Wraps a single career-jargon term with a plain-English tooltip on hover/tap.
 * Uses the built-in TERM_DEFINITIONS dictionary, or a custom definition prop.
 *
 * Example:
 *   <TermTooltip term="KPIs" />
 */
export default function TermTooltip({ term, definition }: TermTooltipProps) {
  const resolved = definition ?? TERM_DEFINITIONS[term.toLowerCase()];

  if (!resolved) {
    // No definition available — render plain text to avoid breaking UI.
    return <span>{term}</span>;
  }

  return (
    <CoachTooltip
      message={resolved}
      context="general"
      placement="top"
      triggerSymbol="?"
    >
      <span
        style={{
          borderBottom: "1px dotted #10b981",
          cursor: "help",
          color: "inherit",
        }}
      >
        {term}
      </span>
    </CoachTooltip>
  );
}

/**
 * Renders a block of text, automatically wrapping any recognized career terms
 * with TermTooltip. Safe to use for article body text in Help Center / Academy.
 *
 * Example:
 *   <RichBody text="You'll track KPIs and work with stakeholders daily." />
 */
export function RichBody({ text, className }: { text: string; className?: string }) {
  const allTerms = Object.keys(TERM_DEFINITIONS).sort((a, b) => b.length - a.length);

  // Build a regex that matches any known term (case-insensitive, whole-word).
  const pattern = allTerms.map((t) => t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|");
  const regex = new RegExp(`\\b(${pattern})\\b`, "gi");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    parts.push(
      <TermTooltip key={`${matched}-${match.index}`} term={matched} />
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <p className={className}>{parts}</p>;
}
