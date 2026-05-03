import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

type InterviewSetupState = {
  currentResumeName: string;
  currentResumeText: string;
  currentResumeUrl: string;
  targetJobTitle: string;
  targetJobDescription: string;
  targetJobLink: string;
  targetJobHeader: string;
  updatedAt: number;
};

function coerceInterviewSetupState(value: unknown): InterviewSetupState {
  if (!value || typeof value !== "object") {
    return {
      currentResumeName: "",
      currentResumeText: "",
      currentResumeUrl: "",
      targetJobTitle: "",
      targetJobDescription: "",
      targetJobLink: "",
      targetJobHeader: "",
      updatedAt: 0,
    };
  }

  const data = value as Partial<InterviewSetupState>;
  return {
    currentResumeName: typeof data.currentResumeName === "string" ? data.currentResumeName : "",
    currentResumeText: typeof data.currentResumeText === "string" ? data.currentResumeText : "",
    currentResumeUrl: typeof data.currentResumeUrl === "string" ? data.currentResumeUrl : "",
    targetJobTitle: typeof data.targetJobTitle === "string" ? data.targetJobTitle : "",
    targetJobDescription:
      typeof data.targetJobDescription === "string" ? data.targetJobDescription : "",
    targetJobLink: typeof data.targetJobLink === "string" ? data.targetJobLink : "",
    targetJobHeader: typeof data.targetJobHeader === "string" ? data.targetJobHeader : "",
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const setup = coerceInterviewSetupState(user.publicMetadata?.interviewSetupState);
  return NextResponse.json(setup);
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<InterviewSetupState>;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const current = coerceInterviewSetupState(user.publicMetadata?.interviewSetupState);

  const next: InterviewSetupState = {
    ...current,
    ...(body.currentResumeName !== undefined
      ? { currentResumeName: String(body.currentResumeName || "").trim() }
      : {}),
    ...(body.currentResumeText !== undefined
      ? { currentResumeText: String(body.currentResumeText || "") }
      : {}),
    ...(body.currentResumeUrl !== undefined
      ? { currentResumeUrl: String(body.currentResumeUrl || "").trim() }
      : {}),
    ...(body.targetJobTitle !== undefined
      ? { targetJobTitle: String(body.targetJobTitle || "").trim() }
      : {}),
    ...(body.targetJobDescription !== undefined
      ? { targetJobDescription: String(body.targetJobDescription || "") }
      : {}),
    ...(body.targetJobLink !== undefined
      ? { targetJobLink: String(body.targetJobLink || "").trim() }
      : {}),
    ...(body.targetJobHeader !== undefined
      ? { targetJobHeader: String(body.targetJobHeader || "").trim() }
      : {}),
    updatedAt: Date.now(),
  };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      interviewSetupState: next,
    },
  });

  return NextResponse.json(next);
}
