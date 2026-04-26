import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Server-side guard for all protected admin routes (/admin/jobs, etc.).
 * The login page lives outside this group and is not wrapped by this layout.
 *
 * Checks:
 *  1. User must be signed in.
 *  2. User's Clerk ID must match ADMIN_USER_ID (server-only) or
 *     NEXT_PUBLIC_ADMIN_USER_ID as fallback.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  // Not signed in → send to admin login
  if (!userId) {
    redirect("/admin/login");
  }

  const adminId =
    process.env.ADMIN_USER_ID ??
    process.env.NEXT_PUBLIC_ADMIN_USER_ID ??
    "";

  // Signed in but not the admin → back to home
  if (adminId && userId !== adminId) {
    redirect("/");
  }

  return <>{children}</>;
}
