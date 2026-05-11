"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BOTTOM_NAV_ITEMS = [
  { href: "/growthhub", label: "Home", icon: "🏠" },
  { href: "/history", label: "Interviews", icon: "🗂️" },
  { href: "/courses", label: "Academy", icon: "📚" },
  { href: "/growthhub/profile", label: "Profile", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Don't render on hidden routes
  if (
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/onboarding") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    pathname?.startsWith("/interview/complete-sign-up") ||
    pathname?.startsWith("/verify")
  ) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "#0f172a",
        borderTop: "1px solid rgba(148, 163, 184, 0.24)",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        paddingTop: "10px",
      }}
    >
      <div className="flex justify-around items-center gap-2 max-w-full px-2">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/growthhub" && pathname?.startsWith("/growthhub"));
          
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-lg transition-colors"
              style={{
                color: isActive ? "#93c5fd" : "#cbd5e1",
                background: "transparent",
              }}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-[10px] font-600 whitespace-nowrap" style={{ letterSpacing: "0.01em" }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
