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

  const { userId } = await auth();

  if (userId && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/growthhub", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
