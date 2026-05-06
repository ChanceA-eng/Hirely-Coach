import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function isAdmin(userId: string | null): boolean {
  const adminId =
    process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  return !!adminId && userId === adminId;
}

const LESSONS_DIR = path.join(process.cwd(), "app", "data", "lessons");

type LessonPatch = {
  moduleFile: string; // e.g. "module-1-phonics.json"
  lessonIndex: number;
  field: string; // e.g. "word", "phonetic", "translation_sw", "hint_sw", "hint_en"
  value: string;
};

/** PATCH /api/admin/foundation/lesson-edit — update a single field in a lesson JSON */
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await req.json()) as LessonPatch;
  const { moduleFile, lessonIndex, field, value } = body;

  // Validate the filename to prevent path traversal
  if (!/^module-\d+-[\w-]+\.json$/.test(moduleFile)) {
    return NextResponse.json({ error: "Invalid module file name" }, { status: 400 });
  }

  const ALLOWED_FIELDS = ["word", "phonetic", "translation_sw", "translation_en", "hint_sw", "hint_en", "instruction", "instruction_sw"];
  if (!ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: "Field not editable" }, { status: 400 });
  }

  const filePath = path.join(LESSONS_DIR, moduleFile);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Module file not found" }, { status: 404 });
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    lessons?: Record<string, unknown>[];
  };

  const lessons = raw.lessons ?? [];
  if (lessonIndex < 0 || lessonIndex >= lessons.length) {
    return NextResponse.json({ error: "Lesson index out of range" }, { status: 400 });
  }

  lessons[lessonIndex][field] = value;
  fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), "utf-8");

  return NextResponse.json({ ok: true, updated: { moduleFile, lessonIndex, field, value } });
}

/** GET /api/admin/foundation/lesson-edit?module=module-1-phonics.json — read a module's lessons */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const moduleFile = req.nextUrl.searchParams.get("module") ?? "";
  if (!/^module-\d+-[\w-]+\.json$/.test(moduleFile)) {
    return NextResponse.json({ error: "Invalid module file name" }, { status: 400 });
  }

  const filePath = path.join(LESSONS_DIR, moduleFile);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Module file not found" }, { status: 404 });
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as object;
  return NextResponse.json(raw);
}
