export type ExtractedKj = {
  knownJobTitle: string;
  coreSkills: string[];
  city: string;
  state: string;
  zip: string;
};

export type JobRecord = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  tags?: string[];
};

const TITLE_KEYWORDS = [
  "software engineer",
  "staff engineer",
  "senior engineer",
  "engineering manager",
  "product manager",
  "program manager",
  "data scientist",
  "data analyst",
  "security architect",
  "architect",
  "developer",
  "manager",
  "director",
  "consultant",
  "designer",
];

const SKILL_KEYWORDS = [
  "leadership",
  "system architecture",
  "distributed systems",
  "react",
  "typescript",
  "javascript",
  "python",
  "aws",
  "gcp",
  "azure",
  "sql",
  "postgres",
  "kubernetes",
  "incident response",
  "budgeting",
  "mentorship",
  "communication",
  "stakeholder management",
  "roadmap",
  "experimentation",
  "machine learning",
  "data modeling",
  "security",
  "hiring",
  "product strategy",
  "conflict resolution",
  "project management",
  "agile",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "this",
  "your",
  "have",
  "you",
  "about",
  "into",
  "role",
  "team",
  "will",
  "years",
  "year",
  "experience",
  "required",
  "preferred",
  "work",
  "across",
  "including",
]);

export function extractKjFromResumeText(text: string): ExtractedKj {
  const normalized = text.replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const lower = normalized.toLowerCase();

  let knownJobTitle = "";
  for (const line of lines.slice(0, 30)) {
    const lineLower = line.toLowerCase();
    if (TITLE_KEYWORDS.some((kw) => lineLower.includes(kw)) && line.length <= 100) {
      knownJobTitle = line;
      break;
    }
  }

  if (!knownJobTitle) {
    for (const kw of TITLE_KEYWORDS) {
      const idx = lower.indexOf(kw);
      if (idx >= 0) {
        knownJobTitle = kw
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        break;
      }
    }
  }

  const cityStateZip = normalized.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
  const cityState = normalized.match(/([A-Za-z .'-]+),\s*([A-Z]{2})(?!\d)/);
  const zipOnly = normalized.match(/\b\d{5}(?:-\d{4})?\b/);

  const city = cityStateZip?.[1]?.trim() ?? cityState?.[1]?.trim() ?? "";
  const state = cityStateZip?.[2]?.trim() ?? cityState?.[2]?.trim() ?? "";
  const zip = cityStateZip?.[3]?.trim() ?? zipOnly?.[0]?.trim() ?? "";

  const coreSkills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill)).slice(0, 8);

  return {
    knownJobTitle,
    coreSkills,
    city,
    state,
    zip,
  };
}

export function autoTagDescription(description: string): string[] {
  const d = description.toLowerCase();
  const tags = new Set<string>();

  if (/(lead|mentor|manager|manage|stakeholder|executive)/.test(d)) tags.add("LEADERSHIP");
  if (/(react|typescript|python|node|system|architecture|api|cloud|kubernetes)/.test(d)) tags.add("TECHNICAL");
  if (/(budget|forecast|kpi|revenue|cost|finance)/.test(d)) tags.add("BUSINESS");
  if (/(security|compliance|incident|risk|privacy)/.test(d)) tags.add("SECURITY");
  if (/(experiment|ab test|model|analysis|analytics|data)/.test(d)) tags.add("DATA");

  return Array.from(tags);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function uniqueWords(text: string): Set<string> {
  return new Set(tokenize(text));
}

export function calculateMatchScore(resumeText: string, jobDescription: string): number {
  const resumeWords = uniqueWords(resumeText);
  const jobWords = Array.from(uniqueWords(jobDescription));

  if (resumeWords.size === 0 || jobWords.length === 0) return 0;

  const overlap = jobWords.filter((w) => resumeWords.has(w)).length;
  return Math.max(0, Math.min(100, Math.round((overlap / jobWords.length) * 100)));
}

export function filterJobsByKj(
  jobs: JobRecord[],
  input: { kjTitle?: string; city?: string; state?: string; query?: string; resumeText?: string; minMatch?: number }
) {
  const kjTitle = (input.kjTitle ?? "").toLowerCase().trim();
  const city = (input.city ?? "").toLowerCase().trim();
  const state = (input.state ?? "").toLowerCase().trim();
  const query = (input.query ?? "").toLowerCase().trim();
  const resumeText = input.resumeText ?? "";
  const minMatch = input.minMatch ?? 0;

  return jobs
    .map((job) => {
      const description = job.description ?? "";
      const titleLower = job.title.toLowerCase();
      const locationLower = job.location.toLowerCase();
      const queryHit = !query || `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(query);

      let baselineBoost = 0;
      if (kjTitle && titleLower.includes(kjTitle)) baselineBoost += 20;
      else if (kjTitle && kjTitle.split(" ").some((word) => word.length > 3 && titleLower.includes(word))) baselineBoost += 10;

      if (city && locationLower.includes(city)) baselineBoost += 10;
      if (state && locationLower.includes(state)) baselineBoost += 8;

      const keywordScore = calculateMatchScore(resumeText, description);
      const score = Math.max(0, Math.min(100, keywordScore + baselineBoost));

      return {
        ...job,
        tags: job.tags?.length ? job.tags : autoTagDescription(description),
        matchScore: score,
        queryHit,
      };
    })
    .filter((job) => job.queryHit && job.matchScore >= minMatch)
    .sort((a, b) => b.matchScore - a.matchScore);
}
