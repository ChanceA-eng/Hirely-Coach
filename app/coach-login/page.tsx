"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import SmartBrand from "../components/SmartBrand";

export default function CoachLoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // If already authenticated, skip the sign-in screen entirely
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/growthhub");
    }
  }, [isLoaded, isSignedIn, router]);

  const copy = {
    welcome: "Welcome back to Hirely Coach",
    subtitle: "Sign in to continue optimizing your job search.",
    tip: "Save your password",
    tipBody: "When you sign in for the first time, your browser will offer to save your password. Accept it — next time you just tap 'Continue' and you're straight in.",
    deviceRemember: "We remember you on this device for 7 days. No repeated sign-ins.",
  };

  // Show nothing until Clerk resolves — prevents flash
  if (!isLoaded || isSignedIn) return null;

  return (
    <main style={{
      minHeight: "100svh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: "max(48px, env(safe-area-inset-top))",
      paddingBottom: "max(40px, env(safe-area-inset-bottom))",
      paddingLeft: 16,
      paddingRight: 16,
      gap: 24,
      background: "radial-gradient(ellipse 120% 80% at 50% 0%, rgba(0,51,102,0.12) 0%, transparent 70%), #0a0c0e",
    }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <SmartBrand />
        <h1 style={{
          fontSize: "1.35rem",
          fontWeight: 800,
          color: "#f1f5f9",
          margin: 0,
          textAlign: "center",
        }}>
          {copy.welcome}
        </h1>
        <p style={{
          color: "#94a3b8",
          fontSize: "0.88rem",
          textAlign: "center",
          margin: 0,
          maxWidth: 300,
          lineHeight: 1.55,
        }}>
          {copy.subtitle}
        </p>
      </div>

      {/* Clerk sign-in */}
      <div style={{ width: "100%", maxWidth: 420 }}>
        <SignIn
          routing="hash"
          forceRedirectUrl="/growthhub"
          fallbackRedirectUrl="/growthhub"
          appearance={{
            variables: {
              colorPrimary: "#003366",
              colorBackground: "#ffffff",
              colorText: "#111827",
              colorTextSecondary: "#4b5563",
            },
            elements: {
              card: {
                border: "1px solid #e5e7eb",
                boxShadow: "0 8px 22px rgba(15, 23, 42, 0.08)",
                background: "#ffffff",
                borderRadius: "1rem",
              },
              headerTitle: "cl-hidden",
              headerSubtitle: "cl-hidden",
              footerActionLink: { color: "#003366", fontWeight: 600 },
            },
          }}
        />
      </div>

      {/* Password-save tip */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(0,51,102,0.08)",
        border: "1px solid rgba(0,102,204,0.22)",
        borderRadius: 14,
        padding: "1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        <p style={{
          margin: 0,
          fontSize: "0.78rem",
          fontWeight: 700,
          color: "#60a5fa",
          letterSpacing: "0.03em",
        }}>
          💾 {copy.tip}
        </p>
        <p style={{
          margin: 0,
          fontSize: "0.78rem",
          color: "#94a3b8",
          lineHeight: 1.6,
        }}>
          {copy.tipBody}
        </p>
      </div>

      {/* Device memory note */}
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(129,140,248,0.06)",
        border: "1px solid rgba(129,140,248,0.18)",
        borderRadius: 14,
        padding: "0.75rem 1.1rem",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}>
        <span style={{ fontSize: "1rem", lineHeight: 1, marginTop: 1 }}>📱</span>
        <p style={{
          margin: 0,
          fontSize: "0.76rem",
          color: "#a5b4fc",
          lineHeight: 1.55,
        }}>
          {copy.deviceRemember}
        </p>
      </div>

      <style>{`
        .cl-hidden { display: none !important; }
      `}</style>
    </main>
  );
}
