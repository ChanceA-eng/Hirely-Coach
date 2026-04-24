"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import "./page.css";
import "../../growthhub/page.css";

const PROFILE_KEY = "hirelyProfile";
const PROFILE_DONE_KEY = "hirelyProfileDone";
const KJ_EXTRACT_KEY = "hirelyKjExtract";

const COMPANY_OPTIONS = ["Google", "Stripe", "Microsoft", "OpenAI", "Amazon", "Meta", "Shopify", "Atlassian"];
const RELOCATION_OPTIONS = ["Open to relocate", "Local only", "Remote only", "Hybrid only"];

type ProfileForm = {
  city: string;
  zip: string;
  state: string;
  currentJobTitle: string;
  preferredRole: string;
  relocationPreferences: string[];
  targetCompanies: string[];
};

const EMPTY: ProfileForm = {
  city: "",
  zip: "",
  state: "",
  currentJobTitle: "",
  preferredRole: "",
  relocationPreferences: ["Local only"],
  targetCompanies: [],
};

export default function CreateProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from sessionStorage signals written by the interview/feedback flow
  useEffect(() => {
    if (!isLoaded) return;
    const stored = sessionStorage.getItem("interview_jobTitle");
    const kjRaw = sessionStorage.getItem(KJ_EXTRACT_KEY);
    const parsedKj = kjRaw ? (JSON.parse(kjRaw) as {
      knownJobTitle?: string;
      coreSkills?: string[];
      city?: string;
      state?: string;
      zip?: string;
    }) : null;

    const existingRaw = localStorage.getItem(PROFILE_KEY);
    const existing = existingRaw ? (JSON.parse(existingRaw) as Partial<ProfileForm>) : null;

    setForm((prev) => ({
      ...prev,
      city: existing?.city ?? parsedKj?.city ?? prev.city,
      state: existing?.state ?? parsedKj?.state ?? prev.state,
      zip: existing?.zip ?? parsedKj?.zip ?? prev.zip,
      currentJobTitle: existing?.currentJobTitle ?? parsedKj?.knownJobTitle ?? prev.currentJobTitle,
      preferredRole: existing?.preferredRole ?? stored ?? parsedKj?.knownJobTitle ?? prev.preferredRole,
      targetCompanies: Array.isArray(existing?.targetCompanies) ? existing.targetCompanies : prev.targetCompanies,
      relocationPreferences: Array.isArray(existing?.relocationPreferences)
        ? existing.relocationPreferences
        : prev.relocationPreferences,
    }));
  }, [isLoaded]);

  function set(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): string {
    if (!form.city.trim()) return "City is required.";
    if (!form.zip.trim()) return "ZIP code is required.";
    if (!form.state.trim()) return "State is required.";
    if (!form.preferredRole.trim()) return "Preferred role is required.";
    return "";
  }

  function togglePill(field: "targetCompanies" | "relocationPreferences", value: string) {
    setForm((prev) => {
      const has = prev[field].includes(value);
      const next = has ? prev[field].filter((v) => v !== value) : [...prev[field], value];
      return { ...prev, [field]: next };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    try {
      const profile = {
        name: user?.fullName ?? "",
        email: user?.primaryEmailAddress?.emailAddress ?? "",
        city: form.city.trim(),
        zip: form.zip.trim(),
        state: form.state.trim(),
        currentJobTitle: form.currentJobTitle.trim(),
        preferredRole: form.preferredRole.trim(),
        relocationPreferences: form.relocationPreferences,
        targetCompanies: form.targetCompanies,
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      localStorage.setItem(PROFILE_DONE_KEY, "1");
    } finally {
      setSaving(false);
    }

    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next") ?? "/growthhub"
        : "/growthhub";
    router.push(next);
  }

  if (!isLoaded) return null;

  return (
    <div className="ob-root">
      <main className="ob-main">
        <div className="ob-card">

          {/* Header */}
          <div className="ob-header">
            <p className="ob-eyebrow">Identity Layer · Hirely Coach</p>
            <h1 className="ob-title">Confirm Your Identity</h1>
            <p className="ob-sub">
              This unlocks your personalized job targeting. Takes under 60 seconds.
            </p>
          </div>

          {/* Pre-fill notice */}
          {(user?.fullName || user?.primaryEmailAddress) && (
            <div className="ob-prefill-box">
              <p className="ob-prefill-label">Pre-filled from Sign-up</p>
              <p className="ob-prefill-value">
                {user.fullName && <strong>{user.fullName}</strong>}
                {user.fullName && user.primaryEmailAddress && " · "}
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          )}

          <div className="ob-readiness-wrap">
            <span className="gh-readiness-pill">Kj Parser Active</span>
            <span className="ob-readiness-note">Most recent title, city, and zip were auto-extracted from your resume.</span>
          </div>

          <form onSubmit={handleSubmit} className="ob-form" noValidate>

            {/* Location */}
            <fieldset className="ob-fieldset">
              <legend className="ob-legend">Location</legend>
              <div className="ob-row-3">
                <label className="ob-label">
                  City
                  <input
                    className="ob-input"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="San Francisco"
                    autoComplete="address-level2"
                  />
                </label>
                <label className="ob-label">
                  ZIP
                  <input
                    className="ob-input"
                    value={form.zip}
                    onChange={(e) => set("zip", e.target.value)}
                    placeholder="94105"
                    autoComplete="postal-code"
                    maxLength={10}
                  />
                </label>
                <label className="ob-label">
                  State
                  <input
                    className="ob-input"
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                    placeholder="CA"
                    autoComplete="address-level1"
                    maxLength={2}
                  />
                </label>
              </div>
            </fieldset>

            {/* Job Preferences */}
            <fieldset className="ob-fieldset">
              <legend className="ob-legend">Job Preferences (KJ Layer)</legend>

              <label className="ob-label">
                Current / Most Recent Job Title
                <input
                  className="ob-input"
                  value={form.currentJobTitle}
                  onChange={(e) => set("currentJobTitle", e.target.value)}
                  placeholder="Senior Software Engineer"
                />
              </label>

              <label className="ob-label">
                Preferred / Target Role
                <input
                  className="ob-input"
                  value={form.preferredRole}
                  onChange={(e) => set("preferredRole", e.target.value)}
                  placeholder="Staff Engineer · Product Manager · etc."
                />
                {form.preferredRole && (
                  <span className="ob-prefill-hint">Pre-filled from your last session</span>
                )}
              </label>
            </fieldset>

            {/* Expansion */}
            <fieldset className="ob-fieldset">
              <legend className="ob-legend">Expansion</legend>

              <div className="ob-pill-group">
                <p className="ob-radio-label">Relocation Preference</p>
                <div className="ob-pill-row">
                  {RELOCATION_OPTIONS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`ob-pill ${form.relocationPreferences.includes(label) ? "ob-pill--active" : ""}`}
                      onClick={() => togglePill("relocationPreferences", label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ob-pill-group">
                <p className="ob-radio-label">Target Companies</p>
                <div className="ob-pill-row">
                  {COMPANY_OPTIONS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`ob-pill ${form.targetCompanies.includes(name) ? "ob-pill--active" : ""}`}
                      onClick={() => togglePill("targetCompanies", name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            {error && <p className="ob-error" role="alert">{error}</p>}

            <button type="submit" className="ob-submit" disabled={saving}>
              {saving ? "Saving…" : "Confirm Identity & Enter GrowthHub →"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
