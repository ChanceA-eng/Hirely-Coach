"use client";

import { FormEvent, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
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
  const { user } = useUser();
  const [settings, setSettings] = useState<FoundationSettings>(defaultSettings);
  const [status, setStatus] = useState<"idle" | "saved">("idle");

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
        </form>
      </div>
    </div>
  );
}
