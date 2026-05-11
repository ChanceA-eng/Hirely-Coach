"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SignUp } from "@clerk/nextjs";
import SmartBrand from "../../components/SmartBrand";
import "../../growthhub/page.css";

type RecognitionResult = {
  ok?: boolean;
  exists?: boolean;
};

export default function SignUpPage() {
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [exists, setExists] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const canSubmit = useMemo(() => agreed && hasChecked && !exists, [agreed, hasChecked, exists]);

  async function runRecognitionCheck() {
    setLookupError("");
    setHasChecked(false);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLookupError("Enter a valid email so we can check if you already have an account.");
      return;
    }

    setChecking(true);
    try {
      const response = await fetch("/api/auth/account-recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await response.json().catch(() => ({}))) as RecognitionResult;

      if (!response.ok || !data.ok) {
        setLookupError("Could not verify your account status right now. Please try again.");
        return;
      }

      const found = Boolean(data.exists);
      setExists(found);
      setHasChecked(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="auth-page lp-accelerator-theme gh-main">
      <div className="auth-shell gh-sidebar-card">
        <SmartBrand className="auth-brand" />
        <p className="gh-eyebrow">Account Access</p>
        <h1 className="gh-h1">Create your Hirely Coach account</h1>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <label style={{ color: "#cbd5e1", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.03em" }}>
            Email check
          </label>
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setHasChecked(false);
              setExists(false);
            }}
            placeholder="name@email.com"
            autoComplete="email"
            style={{
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "rgba(15, 23, 42, 0.4)",
              color: "#f8fafc",
              padding: "10px 12px",
              fontSize: "0.9rem",
            }}
          />
          <button
            type="button"
            onClick={runRecognitionCheck}
            disabled={checking}
            style={{
              borderRadius: 10,
              border: "1px solid rgba(16, 185, 129, 0.45)",
              background: "#064e3b",
              color: "white",
              padding: "10px 12px",
              fontWeight: 700,
              cursor: checking ? "wait" : "pointer",
            }}
          >
            {checking ? "Checking..." : "Check existing account"}
          </button>
          {lookupError ? <p style={{ margin: 0, color: "#fca5a5", fontSize: "0.82rem" }}>{lookupError}</p> : null}
          {hasChecked && !exists ? (
            <p style={{ margin: 0, color: "#86efac", fontSize: "0.82rem" }}>No account found for this email. You can continue sign-up.</p>
          ) : null}
          {hasChecked && exists ? (
            <p style={{ margin: 0, color: "#fde68a", fontSize: "0.82rem" }}>
              We found an existing account with this email. Please <Link href="/sign-in" style={{ color: "#93c5fd" }}>sign in</Link> instead.
            </p>
          ) : null}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginTop: 18,
            color: "#cbd5e1",
            fontSize: "0.88rem",
            lineHeight: 1.6,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            style={{ marginTop: 4 }}
          />
          <span>
            I agree to the <Link href="/terms" style={{ color: "#86efac" }}>Terms of Use</Link> and <Link href="/privacy" style={{ color: "#93c5fd" }}>Privacy Policy</Link>.
          </span>
        </label>
      </div>
      {exists ? (
        <div className="auth-shell gh-sidebar-card" style={{ display: "grid", placeItems: "center", minHeight: 420 }}>
          <p style={{ color: "#e2e8f0", textAlign: "center", maxWidth: 360 }}>
            Existing account detected. Use sign-in so your history and progress remain linked.
          </p>
          <Link href="/sign-in" style={{ color: "#86efac", fontWeight: 700 }}>Continue to sign-in</Link>
        </div>
      ) : (
        <SignUp
          path="/sign-up"
          forceRedirectUrl="/onboarding"
          fallbackRedirectUrl="/onboarding"
          appearance={{
            variables: {
              colorPrimary: "#10b981",
              colorBackground: "#ffffff",
              colorText: "#111827",
              colorTextSecondary: "#4b5563",
            },
            elements: {
              card: {
                border: "1px solid #e5e7eb",
                boxShadow: "0 8px 22px rgba(15, 23, 42, 0.08)",
                background: "#ffffff",
              },
              formButtonPrimary: canSubmit
                ? {
                    opacity: "1",
                    pointerEvents: "auto",
                  }
                : {
                    opacity: "0.45",
                    pointerEvents: "none",
                    boxShadow: "none",
                    filter: "saturate(0.5)",
                  },
              headerTitle: "auth-hidden",
              headerSubtitle: "auth-hidden",
              footerActionLink: "auth-link",
            },
          }}
        />
      )}
    </main>
  );
}
