"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, useAuth, useClerk, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import SmartBrand from "./SmartBrand";

const NAV = [
  { href: "/growthhub", label: "GrowthHub" },
  { href: "/voice?mode=new", label: "Mock Interview" },
  { href: "/training", label: "Accelerator" },
  { href: "/history", label: "History" },
];

const UTILITY_NAV = [
  { href: "/#capabilities", label: "Features" },
  { href: "/#features", label: "The Lab" },
  { href: "/#why", label: "Impact" },
  { href: "/#metrics", label: "Success Metrics" },
];

// ─── Identity Nudge Dropdown ──────────────────────────────────────────────
function IdentityNudge() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const firstName = user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "Account";

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: open ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          padding: "7px 14px",
          color: "#e2e8f0",
          fontSize: "0.84rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 7,
          transition: "background 0.2s, border-color 0.2s",
          letterSpacing: "0.01em",
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          style={{
            width: 22,
            height: 22,
            background: "#064e3b",
            border: "1px solid rgba(16,185,129,0.35)",
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#a7f3d0",
            flexShrink: 0,
          }}
        >
          {firstName[0]?.toUpperCase()}
        </span>
        {firstName}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
        >
          <path d="M2 4L6 8L10 4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              minWidth: 200,
              background: "#0a0a0a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "8px",
              boxShadow: "0 20px 48px rgba(0,0,0,0.55)",
              zIndex: 200,
            }}
          >
            <NudgeItem
              icon="⌂"
              label="Go to GrowthHub"
              onClick={() => { router.push("/growthhub"); setOpen(false); }}
            />
            <NudgeItem
              icon="◎"
              label="Profile & Settings"
              onClick={() => { router.push("/growthhub/profile"); setOpen(false); }}
            />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
            <NudgeItem
              icon="→"
              label="Logout"
              danger
              onClick={() => { setOpen(false); signOut({ redirectUrl: "/" }); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NudgeItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        background: "transparent",
        border: "none",
        borderRadius: 8,
        padding: "9px 12px",
        color: danger ? "#fca5a5" : "#e2e8f0",
        fontSize: "0.85rem",
        fontWeight: 500,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
        fontFamily: "inherit",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.06)"
          : "rgba(255,255,255,0.05)";
      }}
      onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: "0.78rem", color: danger ? "#fca5a5" : "#6b7280", width: 14, flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function Header() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const showLandingButtons = !isSignedIn && pathname === "/";

  return (
    <header className="global-header">
      <div className="global-header-inner">
        <div className="global-header-left">
          <SmartBrand className="global-header-brand" />
          {showLandingButtons && (
            <nav className="global-header-links" aria-label="Section links">
              {UTILITY_NAV.map(({ href, label }) => (
                <Link key={`${label}-${href}`} href={href} className="global-header-muted-link">
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="global-header-right">
          <nav className="global-header-nav" aria-label="Primary">
            <SignedIn>
              {NAV.map(({ href, label }) => {
                const base = href.split("?")[0];
                const active = pathname === base || pathname.startsWith(base + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    style={active ? { color: "#10b981" } : undefined}
                  >
                    {label}
                  </Link>
                );
              })}
            </SignedIn>
          </nav>

          <SignedOut>
            {showLandingButtons && (
              <div className="global-header-auth" aria-label="Authentication">
                <SignInButton mode="modal">
                  <button className="global-auth-btn" type="button">Login</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="global-auth-btn global-auth-btn--strong" type="button">Try hirely interview now</button>
                </SignUpButton>
              </div>
            )}
          </SignedOut>

          <SignedIn>
            <IdentityNudge />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}