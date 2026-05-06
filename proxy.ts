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
  const mode = publicMetadata.current_mode;
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

  if (userId && mode === "foundation") {
    const isBlockedRoute = FOUNDATION_BLOCKED_PREFIXES.some((prefix) =>
      req.nextUrl.pathname.startsWith(prefix)
    );
    if (isBlockedRoute) {
      return NextResponse.redirect(new URL(FOUNDATION_ENTRY, req.url));
    }
  }

  if (userId && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(
      new URL(mode === "foundation" ? FOUNDATION_ENTRY : "/growthhub", req.url)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
