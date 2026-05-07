"use client";

import { FormEvent, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import "./page.css";

type FoundationSettings = {
  email: string;
  phone: string;
  notifyInApp: boolean;
  notifyEmail: boolean;
  reminderDaily: boolean;
  reminderWeekly: boolean;
};

const STORAGE_KEY = "hirely.foundation.settings";

function defaultSettings(): FoundationSettings {
  return {
    email: "",
    phone: "",
    notifyInApp: true,
    notifyEmail: true,
    reminderDaily: true,
    reminderWeekly: false,
  };
}

export default function FoundationSettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [settings, setSettings] = useState<FoundationSettings>(defaultSettings);
  const [status, setStatus] = useState<"idle" | "saved">("idle");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const base = defaultSettings();
    const fromUser = {
      email: user?.primaryEmailAddress?.emailAddress ?? "",
      phone: user?.primaryPhoneNumber?.phoneNumber ?? "",
    };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSettings({ ...base, ...fromUser });
        return;
      }
      const parsed = JSON.parse(raw) as Partial<FoundationSettings>;
      setSettings({ ...base, ...fromUser, ...parsed });
    } catch {
      setSettings({ ...base, ...fromUser });
    }
  }, [user]);

  function updateField<K extends keyof FoundationSettings>(key: K, value: FoundationSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setStatus("saved");
  }

  async function handleResetProgress() {
    try {
      const modeResponse = await fetch("/api/user/mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_mode: "foundation",
          foundation_profile: { onboarding_complete: true, total_xp: 0, language_pref: "en" },
          foundation_progress: { completedLessons: [], completedModules: [], assessmentScores: {} },
        }),
      });

      if (!modeResponse.ok) {
        setDeleteError("Could not reset your progress right now. Please try again.");
        return;
      }

      const keysToClear = [
        "hirely.foundation.progress",
        "hirely.foundation.override",
        "hirely.foundation.pending-xp",
        "hirelyCoachInterviewHistory",
        "hirelyCoachGrowthHub",
        "hirelyImpactLog",
      ];
      keysToClear.forEach((key) => window.localStorage.removeItem(key));

      setConfirmDeleteOpen(false);
      router.push("/foundation/home");
    } catch {
      setDeleteError("Could not reset your progress right now. Please try again.");
    }
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/user/delete-account", { method: "POST" });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: "" }))) as { error?: string };
        setDeleteError(data.error || "Unable to delete account right now. Please try again.");
        setDeleting(false);
        return;
      }

      const data = (await response.json().catch(() => ({ redirectTo: "/" }))) as {
        redirectTo?: string;
      };

      const keysToClear = [
        "hirely.foundation.settings",
        "hirely.foundation.profile",
        "hirely.foundation.progress",
        "hirely.foundation.override",
        "hirely.foundation.pending-xp",
        "hirely.mode",
        "hirelyCoachInterviewHistory",
        "hirelyCoachGrowthHub",
        "hirelyCoachPendingGuestSession",
        "hirelyImpactLog",
      ];
      keysToClear.forEach((key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });

      window.location.href = data.redirectTo || "/";
    } catch {
      setDeleteError("Unable to delete account right now. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="fs-root">
      <div className="fs-inner">
        <header className="fs-header">
          <p className="fs-eyebrow">Foundation Settings</p>
          <h1 className="fs-title">Profile and Preferences</h1>
          <p className="fs-sub">Manage your Foundation contact info, reminders, and notification options.</p>
        </header>

        <form className="fs-panel" onSubmit={onSubmit}>
          <p className="fs-section-label">Edit Contact Info</p>

          <div className="fs-row">
            <label className="fs-field">
              <span className="fs-label">Email</span>
              <input
                className="fs-input"
                type="email"
                value={settings.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="fs-field">
              <span className="fs-label">Phone</span>
              <input
                className="fs-input"
                type="tel"
                value={settings.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+1 555 000 1234"
                autoComplete="tel"
              />
            </label>
          </div>

          <hr className="fs-divider" />

          <p className="fs-section-label">Notification and Reminder Toggles</p>

          <label className="fs-toggle-row">
            <div className="fs-toggle-info">
              <p className="fs-toggle-label">In-app notifications</p>
              <p className="fs-toggle-desc">Receive alerts while using Foundation.</p>
            </div>
            <input
              className="fs-toggle"
              type="checkbox"
              checked={settings.notifyInApp}
              onChange={(e) => updateField("notifyInApp", e.target.checked)}
            />
          </label>

          <label className="fs-toggle-row">
            <div className="fs-toggle-info">
              <p className="fs-toggle-label">Email notifications</p>
              <p className="fs-toggle-desc">Get lesson and milestone notices by email.</p>
            </div>
            <input
              className="fs-toggle"
              type="checkbox"
              checked={settings.notifyEmail}
              onChange={(e) => updateField("notifyEmail", e.target.checked)}
            />
          </label>

          <label className="fs-toggle-row">
            <div className="fs-toggle-info">
              <p className="fs-toggle-label">Daily learning reminders</p>
              <p className="fs-toggle-desc">Stay consistent with a daily check-in prompt.</p>
            </div>
            <input
              className="fs-toggle"
              type="checkbox"
              checked={settings.reminderDaily}
              onChange={(e) => updateField("reminderDaily", e.target.checked)}
            />
          </label>

          <label className="fs-toggle-row">
            <div className="fs-toggle-info">
              <p className="fs-toggle-label">Weekly progress summary</p>
              <p className="fs-toggle-desc">Receive a weekly snapshot of your Foundation progress.</p>
            </div>
            <input
              className="fs-toggle"
              type="checkbox"
              checked={settings.reminderWeekly}
              onChange={(e) => updateField("reminderWeekly", e.target.checked)}
            />
          </label>

          <div className="fs-actions">
            <button className="fs-btn-primary" type="submit">Save settings</button>
            {status === "saved" && <span className="fs-save-toast">Saved</span>}
          </div>

          <hr className="fs-divider fs-danger-divider" />

          <div className="fs-danger-zone">
            <p className="fs-danger-label">Danger Zone</p>
            <button
              type="button"
              className="fs-btn-danger"
              onClick={() => {
                setDeleteError("");
                setConfirmDeleteOpen(true);
              }}
            >
              Delete My Account
            </button>
          </div>
        </form>

        {confirmDeleteOpen ? (
          <div className="fs-modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete account confirmation">
            <div className="fs-modal-card">
              <h2 className="fs-modal-title">Delete your account?</h2>
              <p className="fs-modal-copy">
                Are you sure? This will permanently remove your learning progress and all your data.
                This cannot be undone.
              </p>
              <button
                type="button"
                className="fs-reset-link"
                onClick={() => void handleResetProgress()}
              >
                Just want to start over? Reset Progress
              </button>

              {deleteError ? <p className="fs-modal-error">{deleteError}</p> : null}

              <div className="fs-modal-actions">
                <button
                  type="button"
                  className="fs-modal-cancel"
                  onClick={() => setConfirmDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="fs-modal-delete"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
