import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, "app", "data", "lessons"),
  path.join(ROOT, "app", "data"),
];

function walk(dir, collected = []) {
  if (!fs.existsSync(dir)) return collected;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, collected);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(json|ts|tsx|js|jsx)$/i.test(entry.name)) continue;
    collected.push(full);
  }
  return collected;
}

function normalizeFilename(filename) {
  return filename
    .replace(/\.mp3$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeAudioMatch(rawPath) {
  const name = path.basename(rawPath);
  const normalized = normalizeFilename(name);
  if (!normalized) return rawPath;
  return `/audio/${normalized}.mp3`;
}

const files = Array.from(new Set(TARGET_DIRS.flatMap((dir) => walk(dir))));
let changed = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = before.replace(/(["'])([^"'\n]*?\.mp3)\1/g, (full, quote, val) => {
    if (val.startsWith("/audio/")) {
      const normalizedExisting = normalizeAudioMatch(val);
      return `${quote}${normalizedExisting}${quote}`;
    }
    if (!val.includes(".mp3")) return full;
    if (val.startsWith("data:audio/")) return full;
    const normalized = normalizeAudioMatch(val);
    return `${quote}${normalized}${quote}`;
  });

  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
  }
}

console.log(`Normalized audio paths in ${changed} file(s).`);
