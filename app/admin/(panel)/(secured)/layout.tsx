import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Secured sub-layout — Gate 2 (Vault Cookie) check.
 * Gate 1 (Clerk auth) is already enforced by the parent (panel)/layout.tsx.
 * Any route nested here requires the hc_vault cookie set by /api/admin/unlock.
 */
export default async function SecuredLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const vaultCookie = cookieStore.get("hc_vault");

  if (vaultCookie?.value !== "unlocked") {
    redirect("/admin/vault");
  }

  return <>{children}</>;
}
