import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function isAdmin(userId: string | null): boolean {
  const adminId =
    process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  return !!adminId && userId === adminId;
}

const LESSONS_DIR = path.join(process.cwd(), "app", "data", "lessons");

type AudioAsset = { file: string; exists: boolean; sizeKb: number | null };
type ModuleReport = {
  moduleNum: number;
  jsonFile: string;
  jsonExists: boolean;
  lessonCount: number;
  audioAssets: AudioAsset[];
  contentIssues: number;
  status: "ok" | "missing_json" | "missing_audio";
};

type ObjectRow = Record<string, unknown>;

const AUDIO_KEY_CANDIDATES = [
  "audio_en",
  "audio_url",
  "audio_letter_en",
  "audio_example_en",
  "audio_left_en",
  "audio_right_en",
  "audio_from_en",
  "audio_to_en",
  "boss_audio",
  "success_audio",
];

function walk(value: unknown, onObject: (row: ObjectRow) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, onObject);
    return;
  }
  if (!value || typeof value !== "object") return;

  const row = value as ObjectRow;
  onObject(row);
  for (const nested of Object.values(row)) walk(nested, onObject);
}

function extractAudioUrls(row: ObjectRow): string[] {
  const urls: string[] = [];
  for (const [key, val] of Object.entries(row)) {
    if (typeof val !== "string") continue;
    if (key.includes("audio") && val.trim()) {
      urls.push(val.trim());
    }
  }
  return urls;
}

function hasAny(row: ObjectRow, keys: string[]): boolean {
  return keys.some((key) => {
    const value = row[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function needsContentStack(row: ObjectRow): boolean {
  if (typeof row.en === "string" && row.en.trim()) return true;
  if (typeof row.word === "string" && row.word.trim()) return true;
  if (typeof row.phrase_en === "string" && row.phrase_en.trim()) return true;
  if (typeof row.prompt_text_en === "string" && row.prompt_text_en.trim()) return true;
  if (typeof row.example_word_en === "string" && row.example_word_en.trim()) return true;
  return false;
}

function validateContentRow(row: ObjectRow): number {
  if (!needsContentStack(row)) return 0;

  const hasSw = hasAny(row, ["sw", "translation_sw", "prompt_sw", "title_sw", "instruction_sw"]);
  const hasPhonetic = hasAny(row, ["phonetic_sw", "example_phonetic_sw", "letter_phonetic_sw"]);
  const hasAudio = hasAny(row, AUDIO_KEY_CANDIDATES);

  let issues = 0;
  if (!hasSw) issues += 1;
  if (!hasPhonetic) issues += 1;
  if (!hasAudio) issues += 1;
  return issues;
}

/** GET /api/admin/foundation/asset-validate — check all modules for assets */
export async function GET() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const PUBLIC_DIR = path.join(process.cwd(), "public");
  const moduleFiles: Record<number, string> = {
    1: "module-1-phonics.json",
    2: "module-2-grammar.json",
    3: "module-3-vocabulary.json",
    4: "module-4-pronouns-verbs.json",
    5: "module-5-food-shopping.json",
    6: "module-6-vocabulary.json",
    7: "module-7-conversation.json",
    8: "module-8-weather-feelings.json",
    9: "module-9-directions-community.json",
    10: "module-10-introducing-yourself.json",
    11: "module-11-interview.json",
    12: "module-12-exit-exam.json",
  };

  const reports: ModuleReport[] = [];

  for (const [numStr, jsonFile] of Object.entries(moduleFiles)) {
    const moduleNum = Number(numStr);
    const jsonPath = path.join(LESSONS_DIR, jsonFile);
    const jsonExists = fs.existsSync(jsonPath);

    if (!jsonExists) {
      reports.push({
        moduleNum,
        jsonFile,
        jsonExists: false,
        lessonCount: 0,
        audioAssets: [],
        contentIssues: 0,
        status: "missing_json",
      });
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as {
      lessons?: unknown[];
    };

    const lessons = Array.isArray(raw.lessons) ? raw.lessons : [];
    const audioFiles = new Set<string>();
    let contentIssues = 0;

    for (const lesson of lessons) {
      walk(lesson, (row) => {
        for (const url of extractAudioUrls(row)) {
          audioFiles.add(url);
        }
        contentIssues += validateContentRow(row);
      });
    }

    const audioAssets: AudioAsset[] = [...audioFiles].map((file) => {
      const normalized = file.startsWith("/") ? file.slice(1) : file;
      const abs = path.join(PUBLIC_DIR, normalized);
      const exists = fs.existsSync(abs);
      let sizeKb: number | null = null;
      if (exists) {
        try {
          sizeKb = Math.round(fs.statSync(abs).size / 1024);
        } catch {
          // ignore
        }
      }
      return { file, exists, sizeKb };
    });

    const missingAudio = audioAssets.some((a) => !a.exists) || contentIssues > 0;
    reports.push({
      moduleNum,
      jsonFile,
      jsonExists: true,
      lessonCount: lessons.length,
      audioAssets,
      contentIssues,
      status: missingAudio ? "missing_audio" : "ok",
    });
  }

  const summary = {
    total: reports.length,
    ok: reports.filter((r) => r.status === "ok").length,
    missingJson: reports.filter((r) => r.status === "missing_json").length,
    missingAudio: reports.filter((r) => r.status === "missing_audio").length,
    contentIssues: reports.reduce((sum, report) => sum + report.contentIssues, 0),
  };

  return NextResponse.json({ summary, reports });
}
