"use client";

import Link from "next/link";
import { useState } from "react";
import { SignUp } from "@clerk/nextjs";
import SmartBrand from "../../components/SmartBrand";
import "../../growthhub/page.css";

export default function SignUpPage() {
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="auth-page lp-accelerator-theme gh-main">
      <div className="auth-shell gh-sidebar-card">
        <SmartBrand className="auth-brand" />
        <p className="gh-eyebrow">Account Access</p>
        <h1 className="gh-h1">Create your Hirely Coach account</h1>
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
            formButtonPrimary: agreed
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
    </main>
  );
}
