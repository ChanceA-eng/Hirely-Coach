"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useClerk } from "@clerk/nextjs";
import mammoth from "mammoth";
import { XP_PER_LEVEL } from "../../lib/interviewStorage";
import KjNudge from "../../components/KjNudge";
import {
  clearSavedResume,
  loadSavedResume,
  saveSavedResume,
} from "../../lib/resumeStorage";
import "./page.css";

// ─── Constants ────────────────────────────────────────────────────────────
const PROFILE_KEY = "hirelyProfile";
const PROFILE_DONE_KEY = "hirelyProfileDone";
const KJ_EXTRACT_KEY = "hirelyKjExtract";
const XP_KEY = "hirelyCoachXP";
const NOTIF_KEY = "hirelyNotifPrefs";

const COMPANY_OPTIONS = [
  "Google", "Stripe", "Microsoft", "OpenAI", "Amazon", "Meta",
  "Shopify", "Atlassian", "Apple", "Netflix", "Airbnb", "Uber",
];
const RELOCATION_OPTIONS = [
  "Open to relocate", "Local only", "Remote only", "Hybrid only", "Open to travel",
];
const EXIT_REASONS = [
  "I found a better tool",
  "Too expensive",
  "Missing features I need",
  "Technical issues",
  "No longer job searching",
  "Other",
];

type ProfileData = {
  city: string;
  state: string;
  zip: string;
  currentJobTitle: string;
  preferredRole: string;
  relocationPreferences: string[];
  targetCompanies: string[];
};

type KjData = {
  knownJobTitle?: string;
  coreSkills?: string[];
  city?: string;
  state?: string;
  zip?: string;
};

type NotifPrefs = {
  emailDigest: boolean;
  sessionReminders: boolean;
  weeklyInsights: boolean;
  jobAlerts: boolean;
};

type PdfTextContent = { items: Array<{ str?: string }> };
type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
type PdfDocument = { numPages: number; getPage: (index: number) => Promise<PdfPage> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};
type PdfJsWindow = Window & typeof globalThis & { pdfjsLib?: PdfJsLib; pdfjs?: PdfJsLib };

type Tab = "identity" | "targeting" | "feedback" | "account";

const TABS: { id: Tab; label: string }[] = [
  { id: "identity", label: "Professional Identity" },
  { id: "targeting", label: "Targeting Preferences" },
  { id: "feedback", label: "Optimization" },
  { id: "account", label: "Account Settings" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
function loadXP(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(XP_KEY) || "0", 10);
}

function saveXP(xp: number) {
  localStorage.setItem(XP_KEY, String(xp));
}

function xpLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function xpTitle(level: number): string {
  if (level < 3) return "Novice";
  if (level < 6) return "Apprentice";
  if (level < 10) return "Professional";
  if (level < 15) return "Senior";
  return "Executive";
}

// ─── Toggle ────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`ph-toggle${on ? " ph-toggle--on" : ""}`}
      onClick={onToggle}
      aria-pressed={on}
    >
      <span className="ph-toggle-thumb" />
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function ProfileHubPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [activeTab, setActiveTab] = useState<Tab>("identity");
  const [hydrated, setHydrated] = useState(false);

  // Professional identity
  const [jobTitle, setJobTitle] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [idSaved, setIdSaved] = useState(false);
  const [idSaving, setIdSaving] = useState(false);
  const [resumeName, setResumeName] = useState("");
  const [resumeUploadMsg, setResumeUploadMsg] = useState("");

  // Targeting preferences
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [preferredRole, setPreferredRole] = useState("");
  const [companies, setCompanies] = useState<string[]>([]);
  const [relocation, setRelocation] = useState<string[]>(["Local only"]);
  const [prefSaved, setPrefSaved] = useState(false);

  // Feedback / Optimization
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [xp, setXp] = useState(0);

  // Account
  const [notifs, setNotifs] = useState<NotifPrefs>({
    emailDigest: true,
    sessionReminders: true,
    weeklyInsights: false,
    jobAlerts: false,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const skillInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // ── Hydrate ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const profileRaw = localStorage.getItem(PROFILE_KEY);
    const profile: Partial<ProfileData> = profileRaw ? JSON.parse(profileRaw) : {};
    const kjRaw =
      sessionStorage.getItem(KJ_EXTRACT_KEY) || localStorage.getItem("hirelyKjData");
    const kj: KjData = kjRaw ? JSON.parse(kjRaw) : {};
    const notifRaw = localStorage.getItem(NOTIF_KEY);
    const savedNotifs: Partial<NotifPrefs> = notifRaw ? JSON.parse(notifRaw) : {};

    setJobTitle(profile.currentJobTitle ?? kj.knownJobTitle ?? "");
    setSkills(kj.coreSkills ?? []);
    setCity(profile.city ?? kj.city ?? "");
    setState(profile.state ?? kj.state ?? "");
    setZip(profile.zip ?? kj.zip ?? "");
    setPreferredRole(profile.preferredRole ?? kj.knownJobTitle ?? "");
    setCompanies(profile.targetCompanies ?? []);
    setRelocation(profile.relocationPreferences ?? ["Local only"]);
    setNotifs({ ...{ emailDigest: true, sessionReminders: true, weeklyInsights: false, jobAlerts: false }, ...savedNotifs });
    setXp(loadXP());
    const savedResume = loadSavedResume();
    setResumeName(savedResume?.fileName ?? "");
    setHydrated(true);
  }, [isLoaded]);

  const readTextFile = async (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const readPDFFile = async (file: File) => {
    const pdfWindow = window as PdfJsWindow;

    if (!pdfWindow.pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
      pdfWindow.pdfjsLib = pdfWindow.pdfjsLib || pdfWindow.pdfjs;
      if (!pdfWindow.pdfjsLib) {
        throw new Error("pdfjs failed to load");
      }
      pdfWindow.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const pdfjsLib = pdfWindow.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error("pdfjs unavailable");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item) => item.str || "").join(" ") + "\n";
    }
    return text;
  };

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let text = "";
      if (file.type === "text/plain") {
        text = await readTextFile(file);
      } else if (file.type === "application/pdf") {
        text = await readPDFFile(file);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        setResumeUploadMsg("Unsupported file type. Use PDF, DOCX, or TXT.");
        return;
      }

      saveSavedResume({ text, fileName: file.name });
      setResumeName(file.name);
      setResumeUploadMsg("Resume updated.");
    } catch {
      setResumeUploadMsg("Could not read that file.");
    }
  }

  function handleResumeDelete() {
    clearSavedResume();
    setResumeName("");
    setResumeUploadMsg("Saved resume removed.");
    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  }

  // ── Save identity ────────────────────────────────────────────────────────
  function saveIdentity() {
    setIdSaving(true);
    const existing: Partial<ProfileData> = (() => {
      try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}"); } catch { return {}; }
    })();
    const updated: ProfileData = {
      ...existing,
      city: existing.city ?? city,
      state: existing.state ?? state,
      zip: existing.zip ?? zip,
      preferredRole: existing.preferredRole ?? preferredRole,
      targetCompanies: existing.targetCompanies ?? companies,
      relocationPreferences: existing.relocationPreferences ?? relocation,
      currentJobTitle: jobTitle,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    localStorage.setItem(PROFILE_DONE_KEY, "1");

    // KJ Bridge: update the KJ extract with new job title + skills
    const kjRaw = sessionStorage.getItem(KJ_EXTRACT_KEY);
    const kjData: KjData = kjRaw ? JSON.parse(kjRaw) : {};
    const updatedKj = { ...kjData, knownJobTitle: jobTitle, coreSkills: skills };
    sessionStorage.setItem(KJ_EXTRACT_KEY, JSON.stringify(updatedKj));
    localStorage.setItem("hirelyKjData", JSON.stringify(updatedKj));

    // Signal targeting array to refresh
    window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY }));

    setTimeout(() => {
      setIdSaving(false);
      setIdSaved(true);
      setTimeout(() => setIdSaved(false), 2500);
    }, 400);
  }

  // ── Save targeting prefs ─────────────────────────────────────────────────
  function savePreferences() {
    const existing: Partial<ProfileData> = (() => {
      try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}"); } catch { return {}; }
    })();
    const updated: ProfileData = {
      ...existing,
      currentJobTitle: existing.currentJobTitle ?? jobTitle,
      city,
      state,
      zip,
      preferredRole,
      targetCompanies: companies,
      relocationPreferences: relocation,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    localStorage.setItem(PROFILE_DONE_KEY, "1");
    window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY }));
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  }

  // ── Submit feedback ──────────────────────────────────────────────────────
  function submitFeedback() {
    if (!feedbackText.trim()) return;
    const earned = 25 + rating * 5;
    const newXp = xp + earned;
    saveXP(newXp);
    setXp(newXp);
    setFeedbackSent(true);
    setFeedbackText("");
    setRating(0);
    setTimeout(() => setFeedbackSent(false), 4000);
  }

  // ── Save notifications ───────────────────────────────────────────────────
  function saveNotifs(updated: NotifPrefs) {
    setNotifs(updated);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(updated));
  }

  // ── Delete account ───────────────────────────────────────────────────────
  async function deleteAccount() {
    const keysToRemove = [PROFILE_KEY, PROFILE_DONE_KEY, KJ_EXTRACT_KEY, XP_KEY, NOTIF_KEY, "hirelyKjData"];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
    await signOut({ redirectUrl: "/" });
  }

  // ── Add skill ────────────────────────────────────────────────────────────
  function addSkill() {
    const s = newSkill.trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
    }
    setNewSkill("");
    skillInputRef.current?.focus();
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  function togglePill<T extends string>(
    arr: T[],
    item: T,
    setter: (v: T[]) => void,
    multi = true,
  ) {
    if (arr.includes(item)) {
      setter(arr.filter((x) => x !== item));
    } else {
      setter(multi ? [...arr, item] : [item]);
    }
  }

  if (!hydrated) return null;

  const level = xpLevel(xp);
  const xpInLevel = xp % XP_PER_LEVEL;

  return (
    <div className="ph-root">
      <div className="ph-inner">
        {/* Back nav */}
        <Link href="/growthhub" className="ph-back">← GrowthHub</Link>

        {/* Header */}
        <motion.div
          className="ph-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="ph-eyebrow">Profile Hub</p>
          <h1 className="ph-title">
            {user?.firstName ? `${user.firstName}'s` : "Your"} Professional Identity
          </h1>
          <p className="ph-sub">
            Manage your KJ profile, targeting preferences, and account settings.
          </p>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          className="ph-tabs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.35 }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ph-tab${activeTab === tab.id ? " ph-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          {activeTab === "identity" && (
            <motion.div
              key="identity"
              className="ph-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <p className="ph-section-label">Professional Identity (KJ<KjNudge />)</p>

              <div className="ph-field">
                <label className="ph-label" htmlFor="ph-job-title">Known Job Title</label>
                <input
                  id="ph-job-title"
                  className="ph-input"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Product Manager"
                />
              </div>

              <div className="ph-field">
                <label className="ph-label">Core Skills</label>
                <div className="ph-chips" style={{ marginBottom: 10 }}>
                  {skills.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="ph-chip"
                      onClick={() => removeSkill(s)}
                      title="Click to remove"
                    >
                      {s} ×
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    ref={skillInputRef}
                    className="ph-input"
                    style={{ flex: 1 }}
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder="Add a skill and press Enter"
                  />
                  <button type="button" className="ph-chip-add" onClick={addSkill}>
                    + Add
                  </button>
                </div>
                <p style={{ color: "#4b5563", fontSize: "0.76rem", margin: "6px 0 0" }}>
                  Click a skill to remove it. These anchor your Targeting Array matches.
                </p>
              </div>

              <div className="ph-field">
                <label className="ph-label">Saved Resume</label>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleResumeUpload}
                  style={{ display: "none" }}
                />
                <div className="ph-resume-box">
                  <div>
                    <p className="ph-resume-title">{resumeName || "No saved resume"}</p>
                    <p className="ph-resume-sub">Upload once and reuse it for every mock interview.</p>
                  </div>
                  <div className="ph-resume-actions">
                    <button type="button" className="ph-btn-secondary" onClick={() => resumeInputRef.current?.click()}>
                      {resumeName ? "Replace Resume" : "Upload Resume"}
                    </button>
                    {resumeName && (
                      <button type="button" className="ph-btn-danger" onClick={handleResumeDelete}>
                        Delete Resume
                      </button>
                    )}
                  </div>
                </div>
                {resumeUploadMsg && <p className="ph-resume-msg">{resumeUploadMsg}</p>}
              </div>

              <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                <button
                  type="button"
                  className="ph-btn-primary"
                  onClick={saveIdentity}
                  disabled={idSaving}
                >
                  {idSaving ? "Saving…" : "Save Identity"}
                </button>
                <AnimatePresence>
                  {idSaved && (
                    <motion.span
                      className="ph-save-toast"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      ✓ Saved — Targeting Array updated
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === "targeting" && (
            <motion.div
              key="targeting"
              className="ph-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <p className="ph-section-label">Targeting Preferences</p>

              <div className="ph-field">
                <label className="ph-label" htmlFor="ph-preferred-role">Preferred Role</label>
                <input
                  id="ph-preferred-role"
                  className="ph-input"
                  value={preferredRole}
                  onChange={(e) => setPreferredRole(e.target.value)}
                  placeholder="e.g. Staff Engineer"
                />
              </div>

              <div className="ph-row">
                <div className="ph-field">
                  <label className="ph-label" htmlFor="ph-city">City</label>
                  <input
                    id="ph-city"
                    className="ph-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="ph-field">
                  <label className="ph-label" htmlFor="ph-state">State</label>
                  <input
                    id="ph-state"
                    className="ph-input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="ph-field">
                <label className="ph-label" htmlFor="ph-zip">ZIP Code</label>
                <input
                  id="ph-zip"
                  className="ph-input"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="94102"
                  maxLength={10}
                  style={{ maxWidth: 180 }}
                />
              </div>

              <div className="ph-field">
                <label className="ph-label">Relocation Preferences</label>
                <div className="ph-pills">
                  {RELOCATION_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`ph-pill${relocation.includes(opt) ? " ph-pill--selected" : ""}`}
                      onClick={() => togglePill(relocation, opt, setRelocation)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ph-field">
                <label className="ph-label">Target Companies</label>
                <div className="ph-pills">
                  {COMPANY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`ph-pill${companies.includes(opt) ? " ph-pill--selected" : ""}`}
                      onClick={() => togglePill(companies, opt, setCompanies)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
                <button type="button" className="ph-btn-primary" onClick={savePreferences}>
                  Save Preferences
                </button>
                <AnimatePresence>
                  {prefSaved && (
                    <motion.span
                      className="ph-save-toast"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      ✓ Preferences saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === "feedback" && (
            <motion.div
              key="feedback"
              className="ph-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <p className="ph-section-label">Optimization &amp; Feedback</p>

              {/* XP display */}
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "20px 24px",
                  marginBottom: 28,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem" }}>
                    Level {level} — {xpTitle(level)}
                  </p>
                  <p style={{ margin: 0, color: "#10b981", fontSize: "0.82rem", fontWeight: 600 }}>
                    {xp} XP total
                  </p>
                </div>
                <div className="ph-xp-bar-track">
                  <div
                    className="ph-xp-bar-fill"
                    style={{ width: `${(xpInLevel / XP_PER_LEVEL) * 100}%` }}
                  />
                </div>
                <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: "0.76rem" }}>
                  {XP_PER_LEVEL - xpInLevel} XP to Level {level + 1}
                </p>
              </div>

              <div className="ph-field">
                <label className="ph-label">Rate Your Experience</label>
                <div className="ph-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`ph-star${rating >= n ? " ph-star--active" : ""}`}
                      onClick={() => setRating(n)}
                      aria-label={`${n} star`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="ph-field">
                <label className="ph-label" htmlFor="ph-feedback">Your Feedback</label>
                <textarea
                  id="ph-feedback"
                  className="ph-textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What's working well? What would you improve? Your feedback earns XP."
                  rows={4}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  type="button"
                  className="ph-btn-primary"
                  onClick={submitFeedback}
                  disabled={!feedbackText.trim()}
                >
                  Submit Feedback (+{25 + rating * 5} XP)
                </button>
                <AnimatePresence>
                  {feedbackSent && (
                    <motion.span
                      className="ph-save-toast"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      ✓ Thanks! XP earned
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === "account" && (
            <motion.div
              key="account"
              className="ph-panel"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <p className="ph-section-label">Account Settings</p>

              <div className="ph-toggle-row">
                <div className="ph-toggle-info">
                  <p className="ph-toggle-label">Weekly Email Digest</p>
                  <p className="ph-toggle-desc">Receive a summary of your progress every Monday.</p>
                </div>
                <Toggle
                  on={notifs.emailDigest}
                  onToggle={() => saveNotifs({ ...notifs, emailDigest: !notifs.emailDigest })}
                />
              </div>

              <div className="ph-toggle-row">
                <div className="ph-toggle-info">
                  <p className="ph-toggle-label">Session Reminders</p>
                  <p className="ph-toggle-desc">Get nudged when you haven&apos;t practiced in 3+ days.</p>
                </div>
                <Toggle
                  on={notifs.sessionReminders}
                  onToggle={() => saveNotifs({ ...notifs, sessionReminders: !notifs.sessionReminders })}
                />
              </div>

              <div className="ph-toggle-row">
                <div className="ph-toggle-info">
                  <p className="ph-toggle-label">Weekly Insights</p>
                  <p className="ph-toggle-desc">AI-generated coaching tips based on your sessions.</p>
                </div>
                <Toggle
                  on={notifs.weeklyInsights}
                  onToggle={() => saveNotifs({ ...notifs, weeklyInsights: !notifs.weeklyInsights })}
                />
              </div>

              <div className="ph-toggle-row">
                <div className="ph-toggle-info">
                  <p className="ph-toggle-label">Job Alerts</p>
                  <p className="ph-toggle-desc">Receive professional role-match alerts when Hirely identifies high-fit opportunities.</p>
                </div>
                <Toggle
                  on={notifs.jobAlerts}
                  onToggle={() => saveNotifs({ ...notifs, jobAlerts: !notifs.jobAlerts })}
                />
              </div>

              {/* Danger Zone */}
              <div className="ph-danger-box">
                <p className="ph-danger-title">Account Security</p>
                <p className="ph-danger-text">
                  Deleting your account will permanently erase your interview history, KJ profile, and XP. This action cannot be undone.
                </p>
                <button
                  type="button"
                  className="ph-btn-danger"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Delete Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="ph-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              className="ph-modal"
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="ph-modal-title">Before you go…</h2>
              <p className="ph-modal-body">
                Help us improve Hirely Coach. Why are you deleting your account?
              </p>

              <div className="ph-pills" style={{ marginBottom: 20 }}>
                {EXIT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`ph-pill${exitReason === r ? " ph-pill--selected" : ""}`}
                    onClick={() => setExitReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <p className="ph-modal-body" style={{ marginBottom: 8 }}>
                Type <strong style={{ color: "#fca5a5" }}>DELETE</strong> to confirm:
              </p>
              <input
                className="ph-input"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                style={{ marginBottom: 20 }}
              />

              <div className="ph-modal-actions">
                <button
                  type="button"
                  className="ph-btn-secondary"
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm(""); setExitReason(""); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ph-btn-danger"
                  disabled={deleteConfirm !== "DELETE"}
                  onClick={deleteAccount}
                  style={deleteConfirm !== "DELETE" ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                >
                  Permanently Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
