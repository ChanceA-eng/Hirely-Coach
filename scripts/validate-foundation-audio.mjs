import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LESSON_DIR = path.join(ROOT, "app", "data", "lessons");
const CONTENT_FILES = [
  path.join(ROOT, "app", "data", "phonetics.ts"),
];
const AUDIO_DIR = path.join(ROOT, "public", "audio");
const AUDIO_MAP_FILE = path.join(ROOT, "app", "data", "audioMap.ts");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (entry.isFile() && /\.(json|ts|tsx|js|jsx)$/i.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function toStandardAudioFilename(input) {
  const base = path.basename(input).replace(/\.mp3$/i, "");
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized ? `${normalized}.mp3` : "";
}

function hasValidNameRule(filename) {
  return /^[a-z0-9_]+\.mp3$/.test(filename);
}

const sourceFiles = [...walk(LESSON_DIR), ...CONTENT_FILES.filter((f) => fs.existsSync(f))];
const referenced = new Set();
const invalidNames = new Set();

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  const matches = text.matchAll(/\/audio\/([a-zA-Z0-9_\-\.]+\.mp3)|([a-zA-Z0-9_\-\/\.]+\.mp3)/g);
  for (const match of matches) {
    const raw = match[1] || match[2];
    if (!raw) continue;
    const normalizedFile = toStandardAudioFilename(raw);
    if (!normalizedFile) continue;
    referenced.add(normalizedFile);
    if (!hasValidNameRule(normalizedFile)) {
      invalidNames.add(normalizedFile);
    }
  }
}

const missing = [];
for (const filename of [...referenced].sort()) {
  const full = path.join(AUDIO_DIR, filename);
  if (!fs.existsSync(full)) {
    missing.push(filename);
  }
}

if (invalidNames.size) {
  console.log("Invalid audio filename(s):");
  for (const name of [...invalidNames].sort()) {
    console.log(`- ${name}`);
  }
  console.log("");
}

if (missing.length) {
  console.log("Missing audio files:");
  for (const name of missing) {
    console.log(`- ${name}`);
  }
  process.exitCode = 1;
} else {
  console.log("All referenced Foundation audio files exist in /public/audio.");
}

// ── audioMap coverage check ────────────────────────────────────────────────
// Every file referenced in lesson JSONs should also appear in audioMap.ts.
if (fs.existsSync(AUDIO_MAP_FILE)) {
  const mapText = fs.readFileSync(AUDIO_MAP_FILE, "utf8");
  // Extract all value filenames: "something.mp3" strings on the right side of audioMap entries
  const mapFiles = new Set();
  for (const match of mapText.matchAll(/:\s*"([a-z0-9_]+\.mp3)"/g)) {
    mapFiles.add(match[1]);
  }

  const notInMap = [...referenced].filter((f) => !mapFiles.has(f)).sort();
  const notReferenced = [...mapFiles].filter((f) => !referenced.has(f)).sort();

  if (notInMap.length) {
    console.log("\n⚠  Audio files referenced in lesson data but missing from audioMap.ts:");
    for (const f of notInMap) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
  if (notReferenced.length) {
    console.log("\n⚠  audioMap.ts entries that are NOT referenced in any lesson data:");
    for (const f of notReferenced) console.log(`  - ${f}`);
  }
  if (!notInMap.length && !notReferenced.length) {
    console.log("✅ audioMap.ts is in sync with lesson data.");
  }

  console.log(`\naudioMap.ts: ${mapFiles.size} unique files mapped`);
  console.log(`Lesson data: ${referenced.size} unique files referenced`);
}
