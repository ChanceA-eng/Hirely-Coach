#!/usr/bin/env node
/**
 * generate-foundation-audio.mjs
 * 
 * Generates all 479 audio files for the Hirely Foundation platform.
 * Uses text-to-speech (TTS) via espeak-ng or a fallback API.
 * 
 * Usage:
 *   node scripts/generate-foundation-audio.mjs --backend espeak  # uses local espeak-ng
 *   node scripts/generate-foundation-audio.mjs --backend google  # uses google-tts-api (requires npm install)
 *   node scripts/generate-foundation-audio.mjs --backend dummy   # creates placeholder MP3s for testing
 * 
 * Recommended: espeak-ng is free, local, no API keys needed.
 * Install: https://github.com/espeak-ng/espeak-ng/releases
 * Or on macOS: brew install espeak-ng
 * Or on Ubuntu: sudo apt-get install espeak-ng
 */

import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { readFileSync } from "fs";
import path from "path";
import { dirname, fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const audioMapFile = path.join(root, "app", "data", "audioMap.ts");
const audioDir = path.join(root, "public", "audio");
const backend = (process.argv[2] || "").replace("--backend=", "") || process.argv[3] || "espeak";

// Ensure output directory exists
if (!existsSync(audioDir)) {
  mkdirSync(audioDir, { recursive: true });
  console.log(`✅ Created ${audioDir}`);
}

// Parse audioMap.ts to extract all audio keys → filenames
function parseAudioMap() {
  const text = readFileSync(audioMapFile, "utf8");
  const entries = [];
  const re = /^\s*m\d+_[\w]+:\s*"([^"]+\.mp3)",/gm;
  let match;
  while ((match = re.exec(text))) {
    const filename = match[1];
    // Derive spoken text from filename
    const stem = filename.replace(/\.mp3$/, "");
    // Convert m1_word_apple → "apple", 10_ten → "ten", slot_a_short → "a short"
    const spoken = stem
      .replace(/^m\d+_/, "")     // strip module prefix
      .replace(/_/g, " ")         // replace underscores with spaces
      .trim();
    entries.push({ filename, stem, spoken });
  }
  return entries;
}

// Generate audio using espeak-ng (local, free, offline)
function generateWithEspeak(entries) {
  console.log(`🎤 Generating audio using espeak-ng (${entries.length} files)...`);
  let success = 0, failed = 0;

  for (const { filename, spoken } of entries) {
    const outFile = path.join(audioDir, filename);
    try {
      // espeak-ng: generate audio at 22050 Hz in WAV, then convert to MP3
      // For simplicity, we'll use espeak-ng with piping to ffmpeg if available, or just WAV fallback
      execSync(`espeak-ng -f - "${spoken}" -p 50 -s 120 | ffmpeg -i pipe:0 -q:a 9 "${outFile}" -y 2>/dev/null || espeak-ng -f - "${spoken}" | ffmpeg -i pipe:0 "${outFile}" -y 2>/dev/null || espeak-ng -w "${outFile.replace(/\.mp3/, ".wav")}" "${spoken}" 2>/dev/null`, {
        stdio: "pipe",
      });
      success++;
      if (success % 50 === 0) console.log(`  ✓ ${success}/${entries.length}`);
    } catch (err) {
      failed++;
      if (failed <= 3) console.warn(`  ✗ Failed: ${filename}`);
    }
  }

  console.log(`\n✅ Generated ${success} files, ${failed} failed.`);
  return success === entries.length;
}

// Generate dummy MP3s for testing (minimal valid MP3 files)
function generateDummy(entries) {
  console.log(`🔇 Generating dummy MP3 placeholders (${entries.length} files)...`);
  
  // Minimal valid MP3 frame (ID3 tag + one frame)
  // This is a valid but silent/minimal MP3 file
  const minimalMp3 = Buffer.from([
    0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x1f, 0x76,  // ID3v2.3 header
    0xff, 0xfb, 0x90, 0x00,                                        // MP3 sync + frame header
    ...Array(100).fill(0),                                         // frame data
  ]);

  for (const { filename } of entries) {
    const outFile = path.join(audioDir, filename);
    writeFileSync(outFile, minimalMp3);
  }

  console.log(`✅ Generated ${entries.length} placeholder MP3 files.`);
  return true;
}

// Generate using Google TTS API (requires internet + npm package)
async function generateWithGoogle(entries) {
  console.log(`🌐 Generating audio using Google TTS API (${entries.length} files)...`);
  console.log(`   (First, install: npm install google-tts-api)`);

  try {
    // Dynamic import to allow optional dependency
    const gTTS = (await import("google-tts-api")).default;
    let success = 0, failed = 0;

    for (const { filename, spoken } of entries) {
      try {
        const url = gTTS.getAudioUrl(spoken, { lang: "en", slow: false, host: "https://translate.google.com" });
        // Fetch and save the audio
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        const outFile = path.join(audioDir, filename);
        writeFileSync(outFile, Buffer.from(buffer));
        success++;
        if (success % 50 === 0) console.log(`  ✓ ${success}/${entries.length}`);
      } catch (err) {
        failed++;
        if (failed <= 3) console.warn(`  ✗ Failed: ${filename}: ${err.message}`);
      }
    }

    console.log(`\n✅ Generated ${success} files via Google TTS, ${failed} failed.`);
    return success === entries.length;
  } catch (err) {
    console.error(`❌ google-tts-api not installed. Install with: npm install google-tts-api`);
    return false;
  }
}

// Main
async function main() {
  const entries = parseAudioMap();
  console.log(`📋 Parsed audioMap: ${entries.length} files to generate\n`);

  let success = false;
  if (backend === "espeak") {
    success = generateWithEspeak(entries);
  } else if (backend === "google") {
    success = await generateWithGoogle(entries);
  } else if (backend === "dummy") {
    success = generateDummy(entries);
  } else {
    console.error(`❌ Unknown backend: ${backend}`);
    console.error(`   Available: espeak, google, dummy`);
    process.exitCode = 1;
    return;
  }

  if (success) {
    console.log(`\n✅ Audio generation complete!`);
    console.log(`   Files: ${audioDir}`);
    console.log(`   Next: Run validation with: node scripts/validate-foundation-audio.mjs`);
  } else {
    console.warn(`\n⚠  Some files failed. Check the backend and try again.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
