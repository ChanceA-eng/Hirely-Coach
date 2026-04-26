"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function VaultPage() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      });

      if (res.ok) {
        router.replace("/admin/dashboard");
        return;
      }

      const d = (await res.json()) as { error?: string };
      const next = attempts + 1;
      setAttempts(next);
      setKey("");

      if (d.error === "Unauthorized") {
        setError("Access denied. This account is not authorized.");
      } else if (next >= 5) {
        router.replace("/");
        return;
      } else {
        setError(
          `Invalid Master Key. ${5 - next} attempt${5 - next === 1 ? "" : "s"} remaining.`,
        );
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={S.card}
      >
        {/* Two-gate progress indicator */}
        <div style={S.gateRow}>
          <div style={S.gateStep}>
            <div style={{ ...S.gateDot, background: "#15803d" }} />
            <span style={S.gateLabel}>Clerk Auth ✓</span>
          </div>
          <div style={S.gateLine} />
          <div style={S.gateStep}>
            <div
              style={{
                ...S.gateDot,
                background: "#111827",
                boxShadow: "0 0 0 4px rgba(17,24,39,0.12)",
              }}
            />
            <span style={{ ...S.gateLabel, color: "#111827", fontWeight: 700 }}>
              Master Key
            </span>
          </div>
        </div>

        {/* Lock icon */}
        <div style={S.lockWrap}>
          <svg
            viewBox="0 0 24 24"
            width={22}
            height={22}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 style={S.title}>Security Checkpoint</h1>
        <p style={S.sub}>
          Enter your Master Key to unlock the Admin Console.
          <br />
          Gate 2 of 2.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="••••••••••••"
            autoFocus
            autoComplete="current-password"
            style={S.input}
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={S.errorMsg}
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            style={{
              ...S.btn,
              opacity: loading || !key.trim() ? 0.55 : 1,
              cursor: loading || !key.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Verifying…" : "Unlock Console →"}
          </button>
        </form>

        <p style={S.hint}>
          Unauthorized access attempts are logged and traced.
        </p>
      </motion.div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 20,
    padding: "44px 40px",
    maxWidth: 400,
    width: "100%",
    boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
    textAlign: "center",
  },
  gateRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  gateStep: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  gateDot: { width: 14, height: 14, borderRadius: "50%" },
  gateLine: { width: 36, height: 2, background: "#d1d5db" },
  gateLabel: {
    fontSize: "0.65rem",
    color: "#9ca3af",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  lockWrap: {
    width: 58,
    height: 58,
    background: "#111827",
    color: "#ffffff",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    margin: "0 0 8px",
    fontWeight: 800,
    fontSize: "1.55rem",
    color: "#111827",
  },
  sub: {
    color: "#6b7280",
    fontSize: "0.88rem",
    margin: "0 0 28px",
    lineHeight: 1.6,
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    fontSize: "1rem",
    color: "#111827",
    outline: "none",
    fontFamily: "inherit",
    textAlign: "center",
    letterSpacing: "0.1em",
    boxSizing: "border-box",
  },
  errorMsg: {
    color: "#dc2626",
    fontSize: "0.82rem",
    margin: 0,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "9px 14px",
  },
  btn: {
    background: "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "13px 24px",
    fontWeight: 700,
    fontSize: "0.92rem",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  hint: {
    color: "#d1d5db",
    fontSize: "0.7rem",
    margin: "22px 0 0",
    lineHeight: 1.4,
  },
};
