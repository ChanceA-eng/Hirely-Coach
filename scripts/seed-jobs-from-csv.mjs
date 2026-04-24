import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/seed-jobs-from-csv.mjs <path/to/jobs.csv>");
  process.exit(1);
}

const absoluteInput = path.resolve(process.cwd(), inputPath);
const outputPath = path.resolve(process.cwd(), "app/data/jobs.json");

const csv = fs.readFileSync(absoluteInput, "utf8");

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      if (current.length || row.length) {
        row.push(current.trim());
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

function autoTag(description) {
  const d = String(description || "").toLowerCase();
  const tags = new Set();
  if (/(lead|manager|mentor|stakeholder|executive)/.test(d)) tags.add("LEADERSHIP");
  if (/(react|typescript|python|api|system|architecture|cloud|kubernetes)/.test(d)) tags.add("TECHNICAL");
  if (/(security|compliance|incident|risk|privacy)/.test(d)) tags.add("SECURITY");
  if (/(model|analytics|analysis|experiment|data)/.test(d)) tags.add("DATA");
  if (/(budget|revenue|kpi|forecast|finance)/.test(d)) tags.add("BUSINESS");
  return [...tags];
}

const parsed = parseCSV(csv);
if (parsed.length < 2) {
  console.error("CSV has no data rows.");
  process.exit(1);
}

const [header, ...records] = parsed;
const idx = {
  title: header.findIndex((h) => /title/i.test(h)),
  company: header.findIndex((h) => /company/i.test(h)),
  location: header.findIndex((h) => /location/i.test(h)),
  salary: header.findIndex((h) => /salary|pay/i.test(h)),
  description: header.findIndex((h) => /description|summary|details/i.test(h)),
};

if (Object.values(idx).some((v) => v < 0)) {
  console.error("CSV must include columns for Title, Company, Location, Salary, Description.");
  process.exit(1);
}

const jobs = records
  .filter((r) => r[idx.title] && r[idx.company])
  .map((r, i) => {
    const title = r[idx.title];
    const company = r[idx.company];
    const location = r[idx.location] || "";
    const salary = r[idx.salary] || "";
    const description = r[idx.description] || "";

    return {
      id: `job-${i + 1}-${company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title,
      company,
      location,
      salary,
      description,
      tags: autoTag(description),
    };
  });

fs.writeFileSync(outputPath, `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
console.log(`Seeded ${jobs.length} jobs to app/data/jobs.json`);
