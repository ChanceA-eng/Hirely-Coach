import { NextResponse } from "next/server";
import {
  HC_MODEL_OPTIONS,
  isAdminRequest,
  loadHcAdminConfig,
  normalizeHcAdminConfig,
  saveHcAdminConfig,
} from "@/app/lib/hcAdminConfig";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await loadHcAdminConfig();
  return NextResponse.json({
    ...config,
    modelOptions: HC_MODEL_OPTIONS,
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    config?: unknown;
    systemPrompt?: string;
    temperature?: number;
    model?: string;
    clearResumeCache?: boolean;
  };

  const current = await loadHcAdminConfig();
  const candidateConfig = body.config && typeof body.config === "object"
    ? {
        ...current,
        ...(body.config as Record<string, unknown>),
      }
    : {
        ...current,
        ...(body.systemPrompt !== undefined ? { systemPrompt: body.systemPrompt } : {}),
        ...(body.temperature !== undefined ? { temperature: body.temperature } : {}),
        ...(body.model !== undefined ? { model: body.model } : {}),
      };

  const next = normalizeHcAdminConfig({
    ...candidateConfig,
    resumeCacheVersion: body.clearResumeCache
      ? current.resumeCacheVersion + 1
      : current.resumeCacheVersion,
    updatedAt: Date.now(),
  });

  await saveHcAdminConfig(next);
  return NextResponse.json({
    ok: true,
    config: {
      ...next,
      modelOptions: HC_MODEL_OPTIONS,
    },
  });
}
