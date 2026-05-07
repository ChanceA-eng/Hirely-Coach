import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/growthhub(.*)",
  "/history(.*)",
  "/training(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAdminLoginRoute = createRouteMatcher(["/admin/login"]);
const ADMIN_USER_ID =
  process.env.ADMIN_USER_ID ??
  process.env.NEXT_PUBLIC_ADMIN_USER_ID ??
  "";

const FOUNDATION_ENTRY = "/foundation/home";
const COACH_ENTRY = "/growthhub";
const FOUNDATION_BLOCKED_PREFIXES = [
  "/growthhub",
  "/upload",
  "/voice",
  "/training",
  "/courses",
  "/canvas",
  "/history",
  "/starr-lab",
  "/hirely",
];

function getUserModeFromClaims(claims: unknown): "foundation" | "coach" | null {
  const row = (claims ?? {}) as Record<string, unknown>;
  const publicMetadata = (row.public_metadata ?? row.publicMetadata ?? {}) as Record<string, unknown>;
  const mode = publicMetadata.onboarding_path ?? publicMetadata.current_mode;
  return mode === "foundation" || mode === "coach" ? mode : null;
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Admin route guard
  if (isAdminRoute(req) && !isAdminLoginRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  const { userId, sessionClaims } = await auth();
  const mode = getUserModeFromClaims(sessionClaims);
  const pathname = req.nextUrl.pathname;

  if (userId && pathname.startsWith("/onboarding") && (mode === "foundation" || mode === "coach")) {
    return NextResponse.redirect(new URL(mode === "foundation" ? FOUNDATION_ENTRY : COACH_ENTRY, req.url));
  }

  if (userId && mode === "foundation") {
    const isBlockedRoute = FOUNDATION_BLOCKED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );
    if (isBlockedRoute) {
      return NextResponse.redirect(new URL(FOUNDATION_ENTRY, req.url));
    }
  }

  if (userId && pathname === "/") {
    return NextResponse.redirect(
      new URL(
        mode === "foundation"
          ? FOUNDATION_ENTRY
          : mode === "coach"
            ? COACH_ENTRY
            : "/onboarding",
        req.url
      )
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
