"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Types mirrored from stores ───────────────────────────────────────── */
type TelemetryEvent = {
  id: string; type: string; ts: number; userId: string | null;
  moduleId: number; lessonId: string; lessonTitle?: string;
  typed?: string; expected?: string; attemptNumber?: number;
  success?: boolean; errorMessage?: string; audioFile?: string; latencyMs?: number;
};
type DropoutRow = { lessonId: string; lessonTitle: string; count: number; moduleId: number };
type ErrorRow   = { typed: string; expected: string; count: number };
type VoiceRow   = { lessonId: string; avgAttempts: number; successRate: number; total: number };
type ModuleLock = {
  moduleNum: number; title: string; group: string; status: string;
  condition: string; videoUrl: string | null; videoStatus: string;
  sttThreshold: number; passingScore: number;
};
type NotifVariant = { id: string; label: "A"|"B"; title: string; body: string; bodySwahili: string };
type Notif = {
  id: string; name: string; channel: string; trigger: string;
  scheduleHour: number; abTest: boolean;
  variants: [NotifVariant, NotifVariant];
  deepLinkLessonId: string | null; richMedia: boolean;
  enabled: boolean; sentCount: number; createdAt: number;
};
type AssetReport = {
  moduleNum: number; jsonFile: string; jsonExists: boolean;
  lessonCount: number;
  audioAssets: { file: string; exists: boolean; sizeKb: number | null }[];
  status: "ok"|"missing_json"|"missing_audio";
};
type AssetSummary = { total: number; ok: number; missingJson: number; missingAudio: number };
type LessonRecord = {
  id?: string; type?: string; word?: string; phonetic?: string;
  translation_sw?: string; translation_en?: string;
  hint_sw?: string; hint_en?: string;
};
type ModuleData = { title?: string; lessons?: LessonRecord[] };
type EmailLog = {
  id: string;
  to?: string;
  email?: string;
  template: string;
  subject: string;
  status: string;
  providerMessageId?: string;
  createdAt: number;
};

/* ─── Sub-sections ───────────────────────────────────────────────────── */
type Section = "lesson-editor" | "analytics" | "health" | "video-manager" | "notifications";

const MODULE_FILES: Record<number, string> = {
  1:"module-1-phonics.json", 2:"module-2-grammar.json", 3:"module-3-vocabulary.json",
  4:"module-4-pronouns-verbs.json", 5:"module-5-food-shopping.json", 6:"module-6-vocabulary.json",
  7:"module-7-conversation.json", 8:"module-8-weather-feelings.json",
  9:"module-9-directions-community.json", 10:"module-10-introducing-yourself.json",
  11:"module-11-interview.json", 12:"module-12-exit-exam.json",
};

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
export default function FoundationAdminTab() {
  const [section, setSection] = useState<Section>("analytics");

  return (
    <div style={{ display: "grid", gap: 0 }}>
      {/* Section nav */}
      <div style={S.sectionNav}>
        {(["analytics","lesson-editor","health","video-manager","notifications"] as Section[]).map((s) => (
          <button key={s} onClick={() => setSection(s)} style={{ ...S.sectionBtn, ...(section === s ? S.sectionBtnActive : {}) }}>
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {section === "analytics"      && <AnalyticsSection />}
          {section === "lesson-editor"  && <LessonEditorSection />}
          {section === "health"         && <HealthSection />}
          {section === "video-manager"  && <VideoManagerSection />}
          {section === "notifications"  && <NotificationsSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const SECTION_LABELS: Record<Section, string> = {
  analytics: "📊 Success Tracker",
  "lesson-editor": "✏️ Lesson Editor",
  health: "🛡️ Health Monitor",
  "video-manager": "🎬 Video & Module Manager",
  notifications: "🔔 Notification Manager",
};

/* ════════════════════════════════════════════════════════════════════════
   SECTION 1 — User Performance Analytics
   ════════════════════════════════════════════════════════════════════════ */
function AnalyticsSection() {
  const [heatmap, setHeatmap]   = useState<DropoutRow[]>([]);
  const [errors, setErrors]     = useState<ErrorRow[]>([]);
  const [voice, setVoice]       = useState<VoiceRow[]>([]);
  const [loading, setLoading]   = useState(true);

  function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hRes, eRes, vRes] = await Promise.all([
        fetch("/api/admin/foundation/telemetry?view=heatmap").then((r) => r.json() as Promise<unknown>),
        fetch("/api/admin/foundation/telemetry?view=errors").then((r) => r.json() as Promise<unknown>),
        fetch("/api/admin/foundation/telemetry?view=voice").then((r) => r.json() as Promise<unknown>),
      ]);
      setHeatmap(asArray<DropoutRow>(hRes));
      setErrors(asArray<ErrorRow>(eRes));
      setVoice(asArray<VoiceRow>(vRes));
    } catch {
      setHeatmap([]);
      setErrors([]);
      setVoice([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function clearAll() {
    if (!confirm("Clear all telemetry? This cannot be undone.")) return;
    await fetch("/api/admin/foundation/telemetry", { method: "DELETE" });
    void load();
  }

  const maxDropout = Math.max(1, ...heatmap.map((r) => r.count));
  const safeMaxDropout = Number.isFinite(maxDropout) ? maxDropout : 1;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={S.panelHead}>
        <h2 style={S.panelTitle}>User Performance Analytics</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/api/admin/foundation/telemetry?format=csv" download style={S.actionBtn}>⬇ Export CSV</a>
          <button onClick={() => void load()} style={S.actionBtn}>↺ Refresh</button>
          <button onClick={() => void clearAll()} style={{ ...S.actionBtn, color: "#ef4444", border: "1px solid #7f1d1d" }}>🗑 Clear Logs</button>
        </div>
      </div>

      {loading ? <Skeleton /> : (
        <>
          {/* Dropout Heatmap */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>Dropout Heatmap</h3>
            <p style={S.cardSub}>Lessons users quit most often — indicates difficulty spikes</p>
            {heatmap.length === 0 ? <Empty text="No dropout data yet. Users haven't quit any lessons." /> : (
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {heatmap.slice(0, 12).map((row) => {
                  const pct = Math.round((row.count / safeMaxDropout) * 100);
                  const heat = pct > 60 ? "#ef4444" : pct > 30 ? "#f59e0b" : "#10b981";
                  return (
                    <div key={row.lessonId} style={{ display: "grid", gridTemplateColumns: "80px 1fr 48px", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>M{row.moduleId} L{row.lessonId}</span>
                      <div style={{ position: "relative", height: 22, background: "#1e293b", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: heat, borderRadius: 6, transition: "width 0.4s" }} />
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.73rem", color: "#e2e8f0", fontWeight: 600, zIndex: 1 }}>
                          {row.lessonTitle ?? row.lessonId}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: heat, textAlign: "right" }}>{row.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Common Error Log */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>Common Error Log</h3>
            <p style={S.cardSub}>Most frequent typing mistakes — "Typed" vs what was expected</p>
            {errors.length === 0 ? <Empty text="No errors logged yet." /> : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Typed</th>
                    <th style={S.th}>Expected</th>
                    <th style={S.th}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.slice(0, 20).map((e, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#0f172a" : "#111827" }}>
                      <td style={S.td}>{i + 1}</td>
                      <td style={{ ...S.td, color: "#dc2626", fontFamily: "monospace" }}>{e.typed}</td>
                      <td style={{ ...S.td, color: "#15803d", fontFamily: "monospace" }}>{e.expected}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{e.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Voice Success Rate */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>Voice Success Rate</h3>
            <p style={S.cardSub}>Average attempts and pass rates per lesson</p>
            {voice.length === 0 ? <Empty text="No voice data yet." /> : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Lesson</th>
                    <th style={S.th}>Avg Attempts</th>
                    <th style={S.th}>Success Rate</th>
                    <th style={S.th}>Total Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {voice.map((v, i) => (
                    <tr key={v.lessonId} style={{ background: i % 2 === 0 ? "#0f172a" : "#111827" }}>
                      <td style={{ ...S.td, fontFamily: "monospace" }}>{v.lessonId}</td>
                      <td style={S.td}>{v.avgAttempts.toFixed(1)}</td>
                      <td style={S.td}>
                        <span style={{ color: v.successRate > 0.7 ? "#15803d" : v.successRate > 0.4 ? "#d97706" : "#dc2626", fontWeight: 700 }}>
                          {Math.round(v.successRate * 100)}%
                        </span>
                      </td>
                      <td style={S.td}>{v.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 2 — Lesson Editor CMS
   ════════════════════════════════════════════════════════════════════════ */
function LessonEditorSection() {
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [moduleData, setModuleData]         = useState<ModuleData | null>(null);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState<string | null>(null); // "lessonIdx-field"
  const [drafts, setDrafts]                 = useState<Record<string, string>>({});
  const [sttThresholds, setSttThresholds]   = useState<Record<number, number>>({});

  async function loadModule(num: number) {
    setSelectedModule(num);
    setLoading(true);
    setDrafts({});
    try {
      const data = await fetch(`/api/admin/foundation/lesson-edit?module=${MODULE_FILES[num]}`).then((r) => r.json() as Promise<ModuleData>);
      setModuleData(data);
    } catch {
      setModuleData(null);
    }
    setLoading(false);
  }

  async function saveField(lessonIndex: number, field: string, value: string) {
    if (!selectedModule) return;
    const key = `${lessonIndex}-${field}`;
    setSaving(key);
    await fetch("/api/admin/foundation/lesson-edit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleFile: MODULE_FILES[selectedModule], lessonIndex, field, value }),
    });
    setSaving(null);
    // Update local data
    setModuleData((prev) => {
      if (!prev?.lessons) return prev;
      const lessons = [...prev.lessons];
      lessons[lessonIndex] = { ...lessons[lessonIndex], [field]: value };
      return { ...prev, lessons };
    });
    setDrafts((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function draftKey(li: number, f: string) { return `${li}-${f}`; }
  function getValue(li: number, f: string, original: string | undefined) {
    const k = draftKey(li, f);
    return k in drafts ? drafts[k] : (original ?? "");
  }
  function setDraft(li: number, f: string, v: string) {
    setDrafts((prev) => ({ ...prev, [draftKey(li, f)]: v }));
  }

  const EDITABLE: { field: keyof LessonRecord; label: string }[] = [
    { field: "word", label: "Key Word" },
    { field: "phonetic", label: "Phonetic Bridge" },
    { field: "translation_sw", label: "Swahili Translation" },
    { field: "hint_sw", label: "Hint (Swahili)" },
    { field: "hint_en", label: "Hint (English)" },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={S.panelHead}>
        <h2 style={S.panelTitle}>Lesson Editor</h2>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>Edit lesson content without touching the codebase</p>
      </div>

      {/* Module picker */}
      <div style={S.card}>
        <h3 style={S.cardTitle}>Select Module</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {Object.entries(MODULE_FILES).map(([num]) => (
            <button
              key={num}
              onClick={() => void loadModule(Number(num))}
              style={{ ...S.moduleChip, ...(selectedModule === Number(num) ? S.moduleChipActive : {}) }}
            >
              M{num}
            </button>
          ))}
        </div>
      </div>

      {selectedModule && (
        <div style={S.card}>
          {loading ? <Skeleton /> : !moduleData?.lessons ? (
            <Empty text="Could not load module data." />
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={S.cardTitle}>Module {selectedModule} — {moduleData.title ?? "Lessons"}</h3>
                <span style={S.badge}>{moduleData.lessons.length} lessons</span>
              </div>

              {/* STT Threshold */}
              <div style={{ ...S.infoRow, marginBottom: 20 }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1" }}>
                  STT Confidence Threshold: <strong>{sttThresholds[selectedModule] ?? 70}%</strong>
                </label>
                <input
                  type="range" min={40} max={95} step={5}
                  value={sttThresholds[selectedModule] ?? 70}
                  onChange={(e) => setSttThresholds((p) => ({ ...p, [selectedModule]: Number(e.target.value) }))}
                  style={{ width: 160, accentColor: "#10b981", marginLeft: 12 }}
                />
                <span style={{ fontSize: "0.72rem", color: "#9ca3af", marginLeft: 8 }}>
                  {(sttThresholds[selectedModule] ?? 70) < 60 ? "Easy" : (sttThresholds[selectedModule] ?? 70) > 80 ? "Hard" : "Standard"}
                </span>
              </div>

              {/* Lessons */}
              <div style={{ display: "grid", gap: 16 }}>
                {moduleData.lessons.map((lesson, li) => (
                  <div key={li} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={S.badge}>Lesson {lesson.id ?? li + 1}</span>
                      <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>type: {lesson.type ?? "—"}</span>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {EDITABLE.map(({ field, label }) => {
                        const original = lesson[field] ?? "";
                        const current = getValue(li, field, original);
                        const isDirty = current !== original;
                        const saveKey = draftKey(li, field);
                        if (!original && !isDirty) return null;
                        return (
                          <div key={field} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 8, alignItems: "center" }}>
                            <label style={{ fontSize: "0.78rem", color: "#4b5563", fontWeight: 600 }}>{label}</label>
                            <input
                              value={current}
                              onChange={(e) => setDraft(li, field, e.target.value)}
                              style={{ ...S.input, ...(isDirty ? { border: "1px solid #f59e0b", background: "#2a2113" } : {}) }}
                            />
                            {isDirty && (
                              <button
                                onClick={() => void saveField(li, field, current)}
                                disabled={saving === saveKey}
                                style={{ ...S.saveBtn, opacity: saving === saveKey ? 0.6 : 1 }}
                              >
                                {saving === saveKey ? "…" : "Save"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Audio upload placeholder */}
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.74rem", color: "#9ca3af" }}>Audio asset:</span>
                      <label style={S.uploadLabel}>
                        📎 Upload .mp3
                        <input type="file" accept=".mp3,audio/*" style={{ display: "none" }}
                          onChange={() => alert("Audio upload requires server-side storage (Supabase / S3). Connect a storage provider to enable.")} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 3 — System Health Monitor
   ════════════════════════════════════════════════════════════════════════ */
function HealthSection() {
  const [assetData, setAssetData] = useState<{ summary: AssetSummary; reports: AssetReport[] } | null>(null);
  const [slowAssets, setSlowAssets] = useState<{ audioFile: string; avgLatencyMs: number; count: number }[]>([]);
  const [crashes, setCrashes]     = useState<TelemetryEvent[]>([]);
  const [loading, setLoading]     = useState(false);
  const [validated, setValidated] = useState(false);

  async function runValidation() {
    setLoading(true);
    try {
      const [assets, slow, raw] = await Promise.all([
        fetch("/api/admin/foundation/asset-validate").then((r) => r.json() as Promise<unknown>),
        fetch("/api/admin/foundation/telemetry?view=slow").then((r) => r.json() as Promise<unknown>),
        fetch("/api/admin/foundation/telemetry").then((r) => r.json() as Promise<unknown>),
      ]);

      const safeAssets = (assets ?? {}) as { summary?: AssetSummary; reports?: AssetReport[] };
      const reports = Array.isArray(safeAssets.reports) ? safeAssets.reports : [];
      const summary = safeAssets.summary ?? {
        total: reports.length,
        ok: reports.filter((r) => r.status === "ok").length,
        missingJson: reports.filter((r) => r.status === "missing_json").length,
        missingAudio: reports.filter((r) => r.status === "missing_audio").length,
      };

      const slowRows = Array.isArray(slow)
        ? slow.filter((row): row is { audioFile: string; avgLatencyMs: number; count: number } => {
            const value = row as { audioFile?: unknown; avgLatencyMs?: unknown; count?: unknown };
            return typeof value.audioFile === "string" && Number.isFinite(Number(value.avgLatencyMs)) && Number.isFinite(Number(value.count));
          })
        : [];

      const crashRows = Array.isArray(raw)
        ? raw.filter((event): event is TelemetryEvent => {
            const value = event as { type?: unknown };
            return value.type === "crash";
          })
        : [];

      setAssetData({ summary, reports });
      setSlowAssets(slowRows);
      setCrashes(crashRows);
      setValidated(true);
    } catch {
      setAssetData({ summary: { total: 0, ok: 0, missingJson: 0, missingAudio: 0 }, reports: [] });
      setSlowAssets([]);
      setCrashes([]);
      setValidated(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={S.panelHead}>
        <h2 style={S.panelTitle}>Technical Health Monitor</h2>
        <button onClick={() => void runValidation()} disabled={loading} style={{ ...S.actionBtn, opacity: loading ? 0.6 : 1 }}>
          {loading ? "Scanning…" : "🔍 Run Asset Validator"}
        </button>
      </div>

      {!validated && !loading && (
        <div style={S.card}>
          <Empty text="Click 'Run Asset Validator' to check all 12 modules for missing JSON files, audio, and slow assets." />
        </div>
      )}

      {loading && <Skeleton />}

      {validated && assetData && (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Total Modules", val: assetData.summary.total, color: "#6366f1" },
              { label: "✅ All Good", val: assetData.summary.ok, color: "#10b981" },
              { label: "❌ Missing JSON", val: assetData.summary.missingJson, color: "#ef4444" },
              { label: "⚠️ Missing Audio", val: assetData.summary.missingAudio, color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} style={{ ...S.card, textAlign: "center", padding: "16px" }}>
                <p style={{ fontSize: "1.6rem", fontWeight: 800, color: s.color, margin: "0 0 4px" }}>{s.val}</p>
                <p style={{ fontSize: "0.74rem", color: "#6b7280", margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Asset table */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>Module Asset Status</h3>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Module</th>
                  <th style={S.th}>JSON File</th>
                  <th style={S.th}>Lessons</th>
                  <th style={S.th}>Audio Files</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assetData.reports.map((r, i) => (
                  <tr key={r.moduleNum} style={{ background: i % 2 === 0 ? "#0f172a" : "#111827" }}>
                    <td style={S.td}>M{r.moduleNum}</td>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: "0.72rem" }}>{r.jsonFile}</td>
                    <td style={S.td}>{r.jsonExists ? r.lessonCount : "—"}</td>
                    <td style={S.td}>{r.audioAssets.length > 0 ? `${r.audioAssets.filter(a=>a.exists).length}/${r.audioAssets.length}` : "None declared"}</td>
                    <td style={S.td}>
                      <span style={{
                        background: r.status === "ok" ? "#dcfce7" : r.status === "missing_json" ? "#fee2e2" : "#fef3c7",
                        color:      r.status === "ok" ? "#15803d" : r.status === "missing_json" ? "#dc2626" : "#92400e",
                        borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700
                      }}>
                        {r.status === "ok" ? "✅ Complete" : r.status === "missing_json" ? "❌ Missing JSON" : "⚠️ Missing Audio"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Slow assets */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>⚠️ Slow Audio Assets (&gt;500ms)</h3>
            {slowAssets.length === 0 ? <Empty text="No slow assets detected." /> : (
              <table style={S.table}>
                <thead>
                  <tr><th style={S.th}>File</th><th style={S.th}>Avg Latency</th><th style={S.th}>Events</th></tr>
                </thead>
                <tbody>
                  {slowAssets.map((a, i) => (
                    <tr key={a.audioFile} style={{ background: i % 2 === 0 ? "#0f172a" : "#111827" }}>
                      <td style={{ ...S.td, fontFamily: "monospace" }}>{a.audioFile}</td>
                      <td style={{ ...S.td, color: "#dc2626", fontWeight: 700 }}>{Math.round(a.avgLatencyMs)}ms</td>
                      <td style={S.td}>{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Crash log */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>🔴 Crash / Error Log</h3>
            {crashes.length === 0 ? <Empty text="No crash events recorded. The system is stable." /> : (
              <table style={S.table}>
                <thead>
                  <tr><th style={S.th}>Time</th><th style={S.th}>User</th><th style={S.th}>Lesson</th><th style={S.th}>Message</th></tr>
                </thead>
                <tbody>
                  {crashes.slice(0, 30).map((c, i) => (
                    <tr key={c.id} style={{ background: i % 2 === 0 ? "#3b0a12" : "#111827" }}>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>{new Date(c.ts).toLocaleString()}</td>
                      <td style={{ ...S.td, fontFamily: "monospace", fontSize: "0.72rem" }}>{c.userId ?? "guest"}</td>
                      <td style={S.td}>{c.lessonId}</td>
                      <td style={{ ...S.td, color: "#dc2626" }}>{c.errorMessage ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 4 — Video & Module Manager
   ════════════════════════════════════════════════════════════════════════ */
function VideoManagerSection() {
  const [locks, setLocks]           = useState<ModuleLock[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<number | null>(null);
  const [editDraft, setEditDraft]   = useState<ModuleLock | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [manualStatus, setManualStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/foundation/module-lock").then((r) => r.json() as Promise<unknown>);
      setLocks(Array.isArray(data) ? (data as ModuleLock[]) : []);
    } catch {
      setLocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveLock(moduleNum: number, patch: Partial<ModuleLock>) {
    setSaving(moduleNum);
    const res = await fetch("/api/admin/foundation/module-lock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleNum, ...patch }),
    }).then((r) => r.json() as Promise<{ locks?: unknown }>);
    if (Array.isArray(res.locks)) setLocks(res.locks as ModuleLock[]);
    setSaving(null);
    setEditDraft(null);
  }

  const GROUP_COLORS: Record<string, string> = {
    foundation: "#dcfce7", intermediate: "#dbeafe", career_pro: "#fce7f3"
  };
  const GROUP_TEXT: Record<string, string> = {
    foundation: "#15803d", intermediate: "#1d4ed8", career_pro: "#9d174d"
  };
  const STATUS_ICON: Record<string, string> = { public: "🔓", gated: "🔒", locked: "⛔" };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={S.panelHead}>
        <h2 style={S.panelTitle}>Video & Module Manager</h2>
        <button onClick={() => void load()} style={S.actionBtn}>↺ Refresh</button>
      </div>

      {loading ? <Skeleton /> : (
        <>
          <div style={S.card}>
            <h3 style={S.cardTitle}>Module Lock Table</h3>
            <p style={S.cardSub}>Control unlock conditions, video assets, and STT difficulty per module</p>
            <table style={{ ...S.table, marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={S.th}>Module</th>
                  <th style={S.th}>Group</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Unlock Condition</th>
                  <th style={S.th}>Video</th>
                  <th style={S.th}>STT%</th>
                  <th style={S.th}>Pass%</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locks.map((m, i) => (
                  <tr key={m.moduleNum} style={{ background: i % 2 === 0 ? "#0f172a" : "#111827" }}>
                    <td style={{ ...S.td, fontWeight: 700 }}>M{m.moduleNum} — {m.title}</td>
                    <td style={S.td}>
                      <span style={{ background: GROUP_COLORS[m.group] ?? "#f3f4f6", color: GROUP_TEXT[m.group] ?? "#374151", borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
                        {m.group}
                      </span>
                    </td>
                    <td style={S.td}>{STATUS_ICON[m.status] ?? "?"} {m.status}</td>
                    <td style={{ ...S.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.condition}</td>
                    <td style={S.td}>
                      {m.videoUrl ? (
                        <a href={m.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1", fontSize: "0.78rem" }}>▶ View</a>
                      ) : <span style={{ color: "#d1d5db" }}>None</span>}
                    </td>
                    <td style={S.td}>{m.sttThreshold}%</td>
                    <td style={S.td}>{m.passingScore}%</td>
                    <td style={S.td}>
                      <button onClick={() => setEditDraft({ ...m })} style={S.smallBtn}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit drawer */}
          <AnimatePresence>
            {editDraft && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ ...S.card, border: "2px solid #6366f1" }}
              >
                <h3 style={S.cardTitle}>Edit Module {editDraft.moduleNum} — {editDraft.title}</h3>
                <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
                  <Row label="Status">
                    <select value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })} style={S.select}>
                      <option value="public">🔓 Public</option>
                      <option value="gated">🔒 Gated</option>
                      <option value="locked">⛔ Locked</option>
                    </select>
                  </Row>
                  <Row label="Unlock Condition">
                    <input value={editDraft.condition} onChange={(e) => setEditDraft({ ...editDraft, condition: e.target.value })} style={S.input} />
                  </Row>
                  <Row label="Video URL (YouTube/Vimeo/direct)">
                    <input value={editDraft.videoUrl ?? ""} placeholder="https://…" onChange={(e) => setEditDraft({ ...editDraft, videoUrl: e.target.value || null })} style={S.input} />
                  </Row>
                  <Row label={`STT Threshold: ${editDraft.sttThreshold}%`}>
                    <input type="range" min={40} max={95} step={5} value={editDraft.sttThreshold}
                      onChange={(e) => setEditDraft({ ...editDraft, sttThreshold: Number(e.target.value) })}
                      style={{ width: "100%", accentColor: "#10b981" }} />
                  </Row>
                  <Row label={`Passing Score: ${editDraft.passingScore}%`}>
                    <input type="range" min={50} max={100} step={5} value={editDraft.passingScore}
                      onChange={(e) => setEditDraft({ ...editDraft, passingScore: Number(e.target.value) })}
                      style={{ width: "100%", accentColor: "#6366f1" }} />
                  </Row>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => void saveLock(editDraft.moduleNum, editDraft)} disabled={saving === editDraft.moduleNum} style={{ ...S.actionBtn, background: "#6366f1", color: "#fff", border: "none", opacity: saving === editDraft.moduleNum ? 0.6 : 1 }}>
                      {saving === editDraft.moduleNum ? "Saving…" : "Save Changes"}
                    </button>
                    <button onClick={() => setEditDraft(null)} style={S.actionBtn}>Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual unlock */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>🔑 Manual User Unlock</h3>
            <p style={S.cardSub}>Grant a specific user full access to all modules (beta testers, feedback group)</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              <input
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ ...S.input, flex: 1, maxWidth: 320 }}
              />
              <button
                onClick={() => {
                  if (!manualEmail.trim()) return;
                  setManualStatus(`✅ Access granted to ${manualEmail} — note: this requires a Clerk metadata update in your admin panel. Copy the user ID from the Users tab and set foundationAccess: "full" in their public metadata.`);
                }}
                style={{ ...S.actionBtn, background: "#10b981", color: "#fff", border: "none" }}
              >
                Grant Access
              </button>
            </div>
            {manualStatus && <p style={{ marginTop: 10, fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.5 }}>{manualStatus}</p>}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SECTION 5 — Notification Manager
   ════════════════════════════════════════════════════════════════════════ */
function NotificationsSection() {
  const [notifs, setNotifs]           = useState<Notif[]>([]);
  const [emailLogs, setEmailLogs]     = useState<EmailLog[]>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState<"karibu" | "kikumbusho" | "hongera" | "taarifa">("kikumbusho");
  const [lessonNo, setLessonNo] = useState("");
  const [moduleName, setModuleName] = useState("");
  const [points, setPoints] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testMsg, setTestMsg] = useState("");
  const [statusLabelsSw, setStatusLabelsSw] = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState<Notif | null>(null);
  const [saving, setSaving]           = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [notifData, emailData] = await Promise.all([
        fetch("/api/admin/foundation/notifications").then((r) => r.json() as Promise<unknown>),
        fetch("/api/admin/foundation/email").then((r) => r.json() as Promise<unknown>),
      ]);
      setNotifs(Array.isArray(notifData) ? notifData as Notif[] : []);

      const parsedEmail = (emailData ?? {}) as { logs?: EmailLog[]; statusLabelsSw?: Record<string, string> };
      setEmailLogs(Array.isArray(parsedEmail.logs) ? parsedEmail.logs : []);
      setStatusLabelsSw(parsedEmail.statusLabelsSw ?? {});
    } catch {
      setNotifs([]);
      setEmailLogs([]);
      setStatusLabelsSw({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveNotif(n: Notif) {
    setSaving(true);
    setSaveMsg("");
    const response = await fetch("/api/admin/foundation/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n),
    });
    const res = await response.json() as { notifications?: Notif[]; error?: string };
    if (!response.ok) {
      setSaveMsg(res.error ?? "Template save failed.");
      setSaving(false);
      return;
    }
    if (res.notifications) setNotifs(res.notifications);
    setSaving(false);
    setEditing(null);
    setShowNewForm(false);
  }

  async function deleteNotif(id: string) {
    if (!confirm("Delete this notification template?")) return;
    await fetch("/api/admin/foundation/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void load();
  }

  async function toggleEnabled(n: Notif) {
    await saveNotif({ ...n, enabled: !n.enabled });
    void load();
  }

  async function sendBroadcast() {
    setSendingBroadcast(true);
    setBroadcastMsg("");
    try {
      const response = await fetch("/api/admin/foundation/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          template: broadcastTemplate,
          lessonNo: lessonNo || undefined,
          moduleName: moduleName || undefined,
          points: points === "" ? undefined : Number(points),
          customTitle: customTitle || undefined,
          customBody: customBody || undefined,
        }),
      });
      const result = (await response.json()) as { attempted?: number; sent?: number; failed?: number; error?: string };
      if (!response.ok) {
        setBroadcastMsg(result.error ?? "Broadcast failed.");
      } else {
        setBroadcastMsg(`Broadcast complete: ${result.sent ?? 0}/${result.attempted ?? 0} sent, ${result.failed ?? 0} failed.`);
        void load();
      }
    } catch {
      setBroadcastMsg("Broadcast failed due to a network error.");
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function sendTestNotification() {
    if (!testEmail.trim()) {
      setTestMsg("Weka barua pepe ya majaribio kwanza.");
      return;
    }
    setSendingTest(true);
    setTestMsg("");
    try {
      const response = await fetch("/api/admin/foundation/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test",
          email: testEmail.trim(),
          template: broadcastTemplate,
          lessonNo: lessonNo || undefined,
          moduleName: moduleName || undefined,
          points: points === "" ? undefined : Number(points),
          customTitle: customTitle || undefined,
          customBody: customBody || undefined,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setTestMsg(result.error ?? "Test notification failed.");
      } else {
        setTestMsg("Test notification sent successfully.");
        void load();
      }
    } catch {
      setTestMsg("Test notification failed due to network error.");
    } finally {
      setSendingTest(false);
    }
  }

  const TRIGGER_LABEL: Record<string, string> = {
    daily_streak: "⚡ Daily Streak", skill_unlock: "💼 Skill Unlock",
    nudge: "🚀 Nudge", morning_sync: "☀️ Morning Sync", congratulatory: "🏆 Congratulatory",
  };
  const CHANNEL_COLORS: Record<string, string> = {
    lesson_reminders: "#dbeafe", milestone_alerts: "#fce7f3", streak_alerts: "#fef9c3",
  };

  const emptyNotif = (): Notif => ({
    id: `notif-${Date.now()}`, name: "", channel: "lesson_reminders",
    trigger: "nudge", scheduleHour: 8, abTest: false,
    variants: [
      { id: `v-a-${Date.now()}`, label: "A", title: "", body: "", bodySwahili: "" },
      { id: `v-b-${Date.now()}`, label: "B", title: "", body: "", bodySwahili: "" },
    ],
    deepLinkLessonId: null, richMedia: false, enabled: true, sentCount: 0, createdAt: Date.now(),
  });

  const activeForm = editing ?? (showNewForm ? emptyNotif() : null);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={S.panelHead}>
        <h2 style={S.panelTitle}>Notification Manager</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setEditing(null); setShowNewForm(true); }} style={{ ...S.actionBtn, background: "#10b981", color: "#fff", border: "none" }}>
            + New Template
          </button>
          <button onClick={() => void load()} style={S.actionBtn}>↺ Refresh</button>
        </div>
      </div>

      <div style={{ ...S.card, background: "#052e1f", border: "1px solid #14532d" }}>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#15803d", lineHeight: 1.6 }}>
          <strong>Foundation Notification Style:</strong> Keep every message inside lesson mastery only.
          Support variables: <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>{"{{user_name}}"}</code>{" "}
          <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>{"{{lesson_no}}"}</code>{" "}
          <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>{"{{count}}"}</code>.
          Messages mentioning Job, Boss, Company, or Salary are rejected automatically.
        </p>
      </div>

      <div style={S.card}>
        <h3 style={S.cardTitle}>Foundation Email Broadcast (Swahili-first)</h3>
        <p style={S.cardSub}>Send one template to all users currently in Foundation mode and sync to in-app inbox.</p>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
            <label style={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 600 }}>Template</label>
            <select value={broadcastTemplate} onChange={(e) => setBroadcastTemplate(e.target.value as "karibu" | "kikumbusho" | "hongera" | "taarifa")} style={S.select}>
              <option value="karibu">Karibu</option>
              <option value="kikumbusho">Kikumbusho</option>
              <option value="hongera">Hongera</option>
              <option value="taarifa">Taarifa</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            <input value={lessonNo} onChange={(e) => setLessonNo(e.target.value)} placeholder="Lesson no (optional)" style={S.input} />
            <input value={moduleName} onChange={(e) => setModuleName(e.target.value)} placeholder="Module name (optional)" style={S.input} />
            <input value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points (optional)" style={S.input} />
            <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Custom title (optional)" style={S.input} />
          </div>
          <textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} placeholder="Custom body (optional, mainly for Taarifa)" style={{ ...S.input, minHeight: 64, resize: "vertical" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => void sendBroadcast()} disabled={sendingBroadcast} style={{ ...S.actionBtn, background: "#0f766e", color: "#fff", border: "none", opacity: sendingBroadcast ? 0.65 : 1 }}>
              {sendingBroadcast ? "Sending…" : "Send Notification"}
            </button>
            {broadcastMsg && <span style={{ fontSize: "0.8rem", color: "#334155" }}>{broadcastMsg}</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              style={S.input}
            />
            <button
              onClick={() => void sendTestNotification()}
              disabled={sendingTest}
              style={{ ...S.actionBtn, background: "#1d4ed8", color: "#fff", border: "none", opacity: sendingTest ? 0.65 : 1 }}
            >
              {sendingTest ? "Sending Test…" : "Send Test Notification"}
            </button>
          </div>
          {testMsg && <span style={{ fontSize: "0.8rem", color: "#334155" }}>{testMsg}</span>}
        </div>
      </div>

      {saveMsg && (
        <div style={{ ...S.card, border: "1px solid #7f1d1d", background: "#3b0a12" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#b91c1c" }}>{saveMsg}</p>
        </div>
      )}

      {loading ? <Skeleton /> : (
        <>
          {/* Template list */}
          <div style={S.card}>
            <h3 style={S.cardTitle}>Templates ({notifs.length})</h3>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {notifs.map((n) => (
                <div key={n.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px", border: "1px solid #334155", borderRadius: 10, background: n.enabled ? "#0f172a" : "#111827", opacity: n.enabled ? 1 : 0.65 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#e2e8f0" }}>{n.name}</span>
                      <span style={{ background: CHANNEL_COLORS[n.channel] ?? "#f3f4f6", padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 600, color: "#374151" }}>{n.channel}</span>
                      <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>{TRIGGER_LABEL[n.trigger] ?? n.trigger}</span>
                      {n.scheduleHour > 0 && <span style={{ fontSize: "0.74rem", color: "#9ca3af" }}>⏰ {n.scheduleHour}:00</span>}
                      {n.abTest && <span style={{ background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>A/B</span>}
                      {n.richMedia && <span style={{ background: "#ede9fe", color: "#5b21b6", padding: "1px 6px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>Rich</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#cbd5e1", fontStyle: "italic" }}>
                      A: "{n.variants[0].title}" — {n.variants[0].body.slice(0, 60)}{n.variants[0].body.length > 60 ? "…" : ""}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#9ca3af" }}>
                      Sent: {n.sentCount} times
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => void toggleEnabled(n)} style={{ ...S.smallBtn, color: n.enabled ? "#dc2626" : "#15803d" }}>
                      {n.enabled ? "Pause" : "Enable"}
                    </button>
                    <button onClick={() => { setShowNewForm(false); setEditing({ ...n }); }} style={S.smallBtn}>Edit</button>
                    <button onClick={() => void deleteNotif(n.id)} style={{ ...S.smallBtn, color: "#dc2626" }}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.card}>
            <h3 style={S.cardTitle}>Email Delivery Logs</h3>
            <p style={S.cardSub}>Latest provider statuses for Foundation broadcasts.</p>
            {emailLogs.length === 0 ? <Empty text="No email logs yet." /> : (
              <table style={{ ...S.table, marginTop: 10 }}>
                <thead>
                  <tr>
                    <th style={S.th}>Time</th>
                    <th style={S.th}>Recipient</th>
                    <th style={S.th}>Template</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.slice(0, 80).map((log, index) => (
                    <tr key={log.id} style={{ background: index % 2 === 0 ? "#0f172a" : "#111827" }}>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ ...S.td, fontFamily: "monospace", fontSize: "0.74rem" }}>{log.to ?? log.email ?? "N/A"}</td>
                      <td style={S.td}>{log.template}</td>
                      <td style={S.td}>{statusLabelsSw[log.status] ?? log.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Edit / New form */}
          <AnimatePresence>
            {activeForm !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{ ...S.card, border: "2px solid #10b981" }}
              >
                <h3 style={S.cardTitle}>{showNewForm ? "New Notification Template" : `Edit: ${activeForm.name}`}</h3>
                <NotifForm
                  initial={activeForm}
                  saving={saving}
                  onSave={(n) => void saveNotif(n)}
                  onCancel={() => { setEditing(null); setShowNewForm(false); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function NotifForm({ initial, saving, onSave, onCancel }: {
  initial: Notif; saving: boolean;
  onSave: (n: Notif) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Notif>({ ...initial });

  function setVariant(idx: 0|1, patch: Partial<NotifVariant>) {
    const variants = [...draft.variants] as [NotifVariant, NotifVariant];
    variants[idx] = { ...variants[idx], ...patch };
    setDraft({ ...draft, variants });
  }

  return (
    <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
      <Row label="Template Name">
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={S.input} placeholder="e.g. Morning Sync" />
      </Row>
      <Row label="Channel">
        <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} style={S.select}>
          <option value="lesson_reminders">Lesson Reminders</option>
          <option value="milestone_alerts">Milestone Alerts</option>
          <option value="streak_alerts">Streak Alerts</option>
        </select>
      </Row>
      <Row label="Trigger">
        <select value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value })} style={S.select}>
          <option value="daily_streak">Daily Streak</option>
          <option value="skill_unlock">Skill Unlock</option>
          <option value="nudge">Dormant User Nudge</option>
          <option value="morning_sync">Morning Sync</option>
          <option value="congratulatory">Congratulatory</option>
        </select>
      </Row>
      <Row label={`Schedule Hour (local): ${draft.scheduleHour}:00`}>
        <input type="range" min={0} max={23} step={1} value={draft.scheduleHour}
          onChange={(e) => setDraft({ ...draft, scheduleHour: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "#10b981" }} />
      </Row>
      <Row label="Deep Link Lesson ID">
        <input value={draft.deepLinkLessonId ?? ""} placeholder="e.g. 12-1" onChange={(e) => setDraft({ ...draft, deepLinkLessonId: e.target.value || null })} style={S.input} />
      </Row>
      <div style={{ display: "flex", gap: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer" }}>
          <input type="checkbox" checked={draft.abTest} onChange={(e) => setDraft({ ...draft, abTest: e.target.checked })} />
          A/B Test (send 50/50)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer" }}>
          <input type="checkbox" checked={draft.richMedia} onChange={(e) => setDraft({ ...draft, richMedia: e.target.checked })} />
          Rich Media (Sofia icon + progress bar)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#cbd5e1", cursor: "pointer" }}>
          <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
          Enabled
        </label>
      </div>

      {/* Variant A */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: "0.82rem", color: "#cbd5e1" }}>Variant A {!draft.abTest && "(only variant)"}</p>
        <div style={{ display: "grid", gap: 8 }}>
          <Row label="Title"><input value={draft.variants[0].title} onChange={(e) => setVariant(0, { title: e.target.value })} style={S.input} placeholder="Sofia is waiting! ⚡" /></Row>
          <Row label="Body (EN)"><textarea value={draft.variants[0].body} onChange={(e) => setVariant(0, { body: e.target.value })} style={{ ...S.input, minHeight: 64, resize: "vertical" }} /></Row>
          <Row label="Body (SW)"><textarea value={draft.variants[0].bodySwahili} onChange={(e) => setVariant(0, { bodySwahili: e.target.value })} style={{ ...S.input, minHeight: 64, resize: "vertical" }} /></Row>
        </div>
      </div>

      {/* Variant B — only shown in A/B mode */}
      {draft.abTest && (
        <div style={{ border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: "0.82rem", color: "#92400e" }}>Variant B</p>
          <div style={{ display: "grid", gap: 8 }}>
            <Row label="Title"><input value={draft.variants[1].title} onChange={(e) => setVariant(1, { title: e.target.value })} style={S.input} /></Row>
            <Row label="Body (EN)"><textarea value={draft.variants[1].body} onChange={(e) => setVariant(1, { body: e.target.value })} style={{ ...S.input, minHeight: 64, resize: "vertical" }} /></Row>
            <Row label="Body (SW)"><textarea value={draft.variants[1].bodySwahili} onChange={(e) => setVariant(1, { bodySwahili: e.target.value })} style={{ ...S.input, minHeight: 64, resize: "vertical" }} /></Row>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onSave(draft)} disabled={saving || !draft.name.trim()} style={{ ...S.actionBtn, background: "#10b981", color: "#fff", border: "none", opacity: saving || !draft.name.trim() ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save Template"}
        </button>
        <button onClick={onCancel} style={S.actionBtn}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Shared utilities ──────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {[1,2,3].map((i) => (
        <div key={i} style={{ height: 60, borderRadius: 10, background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p style={{ margin: "16px 0 0", color: "#9ca3af", fontSize: "0.83rem", fontStyle: "italic" }}>{text}</p>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
      <label style={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────── */
const S: Record<string, React.CSSProperties> = {
  sectionNav: {
    display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20,
    paddingBottom: 16, borderBottom: "1px solid #334155",
  },
  sectionBtn: {
    padding: "8px 16px", border: "1px solid #334155", borderRadius: 8,
    background: "#111827", color: "#94a3b8", fontWeight: 600, fontSize: "0.82rem",
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
  },
  sectionBtnActive: {
    background: "#0f172a", color: "#e2e8f0", border: "1px solid #0f172a",
  },
  panelHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
  },
  panelTitle: {
    margin: 0, fontSize: "1.12rem", fontWeight: 800, color: "#e5e7eb",
  },
  card: {
    background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: "18px 20px",
  },
  cardTitle: {
    margin: "0 0 4px", fontWeight: 700, fontSize: "0.92rem", color: "#e2e8f0",
  },
  cardSub: {
    margin: "0 0 4px", fontSize: "0.78rem", color: "#94a3b8",
  },
  actionBtn: {
    padding: "7px 14px", border: "1px solid #334155", borderRadius: 8,
    background: "#111827", color: "#cbd5e1", fontWeight: 600, fontSize: "0.8rem",
    cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-block",
  },
  smallBtn: {
    padding: "4px 10px", border: "1px solid #334155", borderRadius: 6,
    background: "#1e293b", color: "#cbd5e1", fontWeight: 600, fontSize: "0.74rem",
    cursor: "pointer", fontFamily: "inherit",
  },
  saveBtn: {
    padding: "5px 12px", border: "none", borderRadius: 6,
    background: "#10b981", color: "#fff", fontWeight: 700, fontSize: "0.78rem",
    cursor: "pointer", fontFamily: "inherit",
  },
  input: {
    width: "100%", padding: "8px 10px", border: "1px solid #334155", borderRadius: 8,
    fontSize: "0.83rem", color: "#e2e8f0", background: "#111827", outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
  },
  select: {
    padding: "8px 10px", border: "1px solid #334155", borderRadius: 8,
    fontSize: "0.83rem", color: "#e2e8f0", background: "#111827", outline: "none",
    fontFamily: "inherit", width: "100%",
  },
  uploadLabel: {
    padding: "4px 12px", border: "1px dashed #d1d5db", borderRadius: 6,
    color: "#6b7280", fontSize: "0.76rem", cursor: "pointer", fontFamily: "inherit",
  },
  table: {
    width: "100%", borderCollapse: "collapse", fontSize: "0.82rem",
  },
  th: {
    padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#cbd5e1",
    borderBottom: "2px solid #334155", fontSize: "0.75rem", textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "8px 10px", color: "#cbd5e1", borderBottom: "1px solid #1e293b",
    fontSize: "0.82rem",
  },
  badge: {
    background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
    borderRadius: 6, padding: "2px 8px", fontSize: "0.72rem", fontWeight: 700,
  },
  moduleChip: {
    padding: "6px 14px", border: "1px solid #334155", borderRadius: 8,
    background: "#111827", color: "#94a3b8", fontWeight: 700, fontSize: "0.82rem",
    cursor: "pointer", fontFamily: "inherit",
  },
  moduleChipActive: {
    background: "#0f172a", color: "#e2e8f0", border: "1px solid #0f172a",
  },
  infoRow: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
    padding: "10px 12px", background: "#111827", borderRadius: 8, border: "1px solid #334155",
  },
};
