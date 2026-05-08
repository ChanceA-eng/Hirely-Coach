"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, SignUpButton, useAuth, useClerk, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import SmartBrand from "./SmartBrand";
import {
  getMode,
  setMode,
  getFoundationProgress,
  TOTAL_FOUNDATION_LESSONS,
} from "../lib/foundationProgress";

const NAV = [
  { href: "/growthhub", label: "GrowthHub" },
  { href: "/voice?mode=new", label: "Mock Interview" },
  { href: "/training", label: "Accelerator" },
  { href: "/history", label: "History" },
];

const HELP_HREF = "/help";

const UTILITY_NAV = [
  { href: "/#capabilities", label: "Features" },
  { href: "/#features", label: "The Lab" },
  { href: "/#why", label: "Impact" },
  { href: "/#metrics", label: "Success Metrics" },
];

// ─── Identity Nudge Dropdown ──────────────────────────────────────────────
function IdentityNudge({ isFoundation }: { isFoundation: boolean }) {
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

  // Accent colour differs between modes
  const accentBg = isFoundation ? "#064e3b" : "#1e1b4b";
  const accentBorder = isFoundation ? "rgba(16,185,129,0.35)" : "rgba(99,102,241,0.35)";
  const accentText = isFoundation ? "#a7f3d0" : "#c7d2fe";

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
            background: accentBg,
            border: `1px solid ${accentBorder}`,
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: accentText,
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
            {isFoundation ? (
              /* ── LEARNER MENU (Foundation) ── */
              <>
                <div style={{ padding: "4px 12px 8px", fontSize: "0.7rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Learner Menu
                </div>
                <NudgeItem
                  icon="📊"
                  label="My Progress"
                  onClick={() => { router.push("/foundation/home"); setOpen(false); }}
                />
                <NudgeItem
                  icon="⚙️"
                  label="Settings"
                  onClick={() => { router.push("/foundation/settings"); setOpen(false); }}
                />
              </>
            ) : (
              /* ── PROFESSIONAL MENU (Hirely / Coach) ── */
              <>
                <div style={{ padding: "4px 12px 8px", fontSize: "0.7rem", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Professional Menu
                </div>
                <NudgeItem
                  icon="⌂"
                  label="GrowthHub"
                  onClick={() => { router.push("/growthhub"); setOpen(false); }}
                />
                <NudgeItem
                  icon="◎"
                  label="Profile & Settings"
                  onClick={() => { router.push("/growthhub/profile"); setOpen(false); }}
                />
              </>
            )}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "6px 0" }} />
            <NudgeItem
              icon="→"
              label="Log Out"
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

function HelpNavButton({ active }: { active: boolean }) {
  return (
    <Link
      href={HELP_HREF}
      aria-label="Help Center"
      title="Help Center"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: active ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.06)",
        border: active ? "1px solid rgba(16,185,129,0.45)" : "1px solid rgba(255,255,255,0.1)",
        color: active ? "#10b981" : "#94a3b8",
        fontSize: "0.78rem",
        fontWeight: 800,
        lineHeight: 1,
        textDecoration: "none",
        flexShrink: 0,
      }}
    >
      ?
    </Link>
  );
}

export default function Header() {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const [mode, setModeState] = useState<"foundation" | "coach" | null>(null);
  const [progress, setProgress] = useState(0);

  const isFoundation = pathname?.startsWith("/foundation") ?? false;
  const isLandingPage = pathname === "/";
  const isHelpRoute = pathname === HELP_HREF || pathname?.startsWith(`${HELP_HREF}/`);
  const showLandingContent = !isSignedIn && isLandingPage;

  // Sync mode from API on sign-in
  useEffect(() => {
    if (!isSignedIn) {
      setModeState(null);
      return;
    }
    fetch("/api/user/mode")
      .then((res) => res.json() as Promise<{ current_mode: "foundation" | "coach" | null }>)
      .then((payload) => {
        setModeState(payload.current_mode);
        if (payload.current_mode) setMode(payload.current_mode);
      })
      .catch(() => setModeState(getMode()));
  }, [isSignedIn]);

  // Update progress bar whenever we're on a foundation route
  useEffect(() => {
    if (!isFoundation) return;
    const data = getFoundationProgress();
    const pct = Math.round((data.completedLessons.length / TOTAL_FOUNDATION_LESSONS) * 100);
    setProgress(Math.max(0, Math.min(100, pct)));
  }, [isFoundation, pathname]);

  return (
    <header className="global-header">
      <div className="global-header-inner">

        {/* LEFT: Brand + optional landing nav */}
        <div className="global-header-left">
          <SmartBrand className="global-header-brand" />
          {isFoundation && (
            <>
              <Link
                href="/foundation/home"
                className="glass-nav-item"
                style={{ fontSize: "0.82rem", padding: "6px 14px" }}
              >
                My Path
              </Link>
              {mode === "coach" && (
                <Link
                  href="/growthhub"
                  className="glass-nav-item"
                  style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                >
                  Return to GrowthHub
                </Link>
              )}
            </>
          )}
          {showLandingContent && (
            <nav className="global-header-links" aria-label="Section links">
              {UTILITY_NAV.map(({ href, label }) => (
                <Link key={label} href={href} className="global-header-muted-link">
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* RIGHT: Conditional nav based on mode */}
        <div className="global-header-right">

          <SignedIn>
            {isFoundation ? (
              /* ── FOUNDATION MODE ─────────────────────────────── */
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

                {/* Progress bar + percentage */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 120,
                    height: 6,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 99,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#34d399,#22c55e)",
                      transition: "width 0.35s ease",
                    }} />
                  </div>
                  <span style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#d1fae5",
                    whiteSpace: "nowrap",
                  }}>
                    {progress}%
                  </span>
                </div>

                {/* Notification bell (opens FoundationCommandCenter drawer) */}
                <button
                  type="button"
                  aria-label="Open notifications"
                  onClick={() => window.dispatchEvent(new CustomEvent("foundation:open-inbox"))}
                  style={{
                    position: "relative",
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    border: "1px solid rgba(148,163,184,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#f59e0b",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                    <path d="M9 17a3 3 0 0 0 6 0" />
                  </svg>
                </button>
              </div>
            ) : (
              /* ── STANDARD COACH MODE ─────────────────────────── */
              <nav className="global-header-nav" aria-label="Primary">
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
              </nav>
            )}

            {/* Switch to Foundation — only shown in Coach mode outside Foundation routes */}
            {!isFoundation && mode === "coach" && (
              <Link href="/foundation/home" className="global-header-muted-link">
                Foundation
              </Link>
            )}
            {!isFoundation && mode === "coach" && <HelpNavButton active={Boolean(isHelpRoute)} />}
          </SignedIn>

          <SignedOut>
            {showLandingContent && (
              <div className="global-header-auth" aria-label="Authentication">
                <SignInButton mode="modal">
                  <button className="global-auth-btn" type="button">Login</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="global-auth-btn global-auth-btn--strong" type="button">Try Hirely Coach Now</button>
                </SignUpButton>
              </div>
            )}
          </SignedOut>

          <SignedIn>
            <IdentityNudge isFoundation={isFoundation} />
          </SignedIn>

        </div>
      </div>
    </header>
  );
}