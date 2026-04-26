"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn, useAuth, useUser } from "@clerk/nextjs";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";

export default function AdminLoginPage() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setChecking(false);
      return;
    }
    if (ADMIN_USER_ID && userId === ADMIN_USER_ID) {
      router.replace("/admin/vault");
      return;
    }
    // Signed in but not the admin user → redirect to landing
    if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
      router.replace("/");
      return;
    }
    setChecking(false);
  }, [isLoaded, isSignedIn, userId, router]);

  if (checking || !isLoaded) {
    return (
      <div style={styles.page}>
        <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>Verifying identity…</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.badge}>ADMIN ONLY</div>
          <h1 style={styles.title}>Hirely Coach</h1>
          <p style={styles.sub}>Administration Portal</p>
          <p style={styles.body}>
            Sign in with your authorized administrator account to access the control panel.
          </p>
          <p style={{ color: "#9ca3af", fontSize: "0.78rem", marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
            This portal is restricted. Unauthorized access attempts are logged.
          </p>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }}>
            <SignIn
              path="/admin/login"
              forceRedirectUrl="/admin/vault"
              fallbackRedirectUrl="/admin/vault"
              appearance={{
                variables: {
                  colorPrimary: "#10b981",
                  colorBackground: "#ffffff",
                  colorText: "#111827",
                  colorTextSecondary: "#4b5563",
                },
                elements: {
                  card: {
                    boxShadow: "none",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    background: "#ffffff",
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ ...styles.badge, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>ACCESS DENIED</div>
        <h2 style={{ ...styles.title, fontSize: "1.4rem" }}>Unauthorized</h2>
        <p style={styles.body}>
          Your account <strong>{user?.emailAddresses[0]?.emailAddress}</strong> does not have admin privileges.
        </p>
        <button
          onClick={() => router.push("/")}
          style={styles.btn}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    padding: "24px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "48px 40px",
    maxWidth: "400px",
    width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    background: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    borderRadius: "20px",
    padding: "4px 14px",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    marginBottom: "20px",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#111827",
    margin: "0 0 8px",
    letterSpacing: "-0.02em",
  },
  sub: {
    color: "#6b7280",
    fontSize: "0.88rem",
    margin: "0 0 20px",
  },
  body: {
    color: "#374151",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: "0",
  },
  btn: {
    marginTop: "24px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 24px",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
};
