"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
const ACCEPTED_EXTENSIONS = ".csv,.tsv,.tst,.txt,.rtf,.json,.xml,.xls,.xlsx,.doc,.docx,.pdf";

type ParsedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  tags: string[];
  category: string;
  alignmentReason: string;
  scaryQuestions: string[];
};

type DbStats = { total: number } | null;

const TAG_MAP: Record<string, string[]> = {
  product: ["Product Management", "Roadmap", "Stakeholders"],
  engineer: ["Engineering", "System Design", "Code Review"],
  developer: ["Engineering", "Software Development"],
  data: ["Data Analysis", "SQL", "Python"],
  analyst: ["Analysis", "Reporting", "Data"],
  manager: ["Leadership", "Team Management", "Strategy"],
  director: ["Leadership", "Executive Strategy"],
  design: ["UX", "Figma", "User Research"],
  security: ["Security", "Risk Assessment", "Compliance"],
  marketing: ["Marketing", "Growth", "Analytics"],
};

function autoTag(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const [kw, t] of Object.entries(TAG_MAP)) {
    if (lower.includes(kw)) tags.push(...t);
  }
  return [...new Set(tags)].slice(0, 6);
}

function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("engineer") || t.includes("developer")) return "Engineering";
  if (t.includes("product")) return "Product";
  if (t.includes("data") || t.includes("analyst")) return "Data";
  if (t.includes("design")) return "Design";
  if (t.includes("manager") || t.includes("director")) return "Leadership";
  if (t.includes("security")) return "Security";
  return "General";
}

function makeJob(
  prefix: string, index: number,
  title: string, company: string, location: string, desc: string, salRaw = ""
): ParsedJob {
  const sal = parseInt(salRaw.replace(/[^0-9]/g, ""), 10) || 0;
  const tags = autoTag(desc + " " + title);
  return {
    id: `${prefix}-${Date.now()}-${index}`,
    title, company, location,
    salaryMin: sal, salaryMax: sal ? Math.round(sal * 1.2) : 0,
    description: desc, tags, category: inferCategory(title),
    alignmentReason: `Strong fit for candidates with ${tags.slice(0, 2).join(" and ")} experience.`,
    scaryQuestions: [
      `Tell me about a time you led a high-stakes project at ${company || "a fast-paced company"}.`,
      `How do you handle ambiguity in a ${title || "senior"} role?`,
    ],
  };
}

// ── CSV / TSV ─────────────────────────────────────────────────────────────────

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === delimiter && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function parseDelimited(text: string, delimiter: string, prefix: string): ParsedJob[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const get = (cols: string[], ...keys: string[]) => {
    const idx = keys.map((k) => headers.indexOf(k)).find((i) => i >= 0) ?? -1;
    return idx >= 0 ? (cols[idx] ?? "") : "";
  };
  return lines.slice(1).map((line, i) => {
    const c = splitLine(line, delimiter);
    const title    = get(c, "title", "job_title", "position", "role");
    const company  = get(c, "company", "employer", "organization");
    const location = get(c, "location", "city", "place");
    const desc     = get(c, "description", "desc", "job_description", "summary");
    const salRaw   = get(c, "salary", "compensation", "pay");
    if (!title && !company) return null;
    return makeJob(prefix, i, title, company, location, desc, salRaw);
  }).filter((j): j is ParsedJob => j !== null && Boolean(j.title) && Boolean(j.company));
}

const parseCSV = (text: string) => parseDelimited(text, ",", "csv");
const parseTSV = (text: string) => parseDelimited(text, "\t", "tsv");

// ── JSON ──────────────────────────────────────────────────────────────────────

function parseJSON(text: string): ParsedJob[] {
  try {
    const data = JSON.parse(text) as unknown;
    const arr: Record<string, unknown>[] = Array.isArray(data)
      ? (data as Record<string, unknown>[])
      : Array.isArray((data as Record<string, unknown>).jobs)
      ? ((data as Record<string, unknown[]>).jobs as Record<string, unknown>[])
      : [];
    return arr.map((item, i) => {
      const str = (keys: string[]) =>
        String(keys.map((k) => item[k]).find((v) => v !== undefined && v !== null) ?? "");
      const title    = str(["title", "job_title", "position", "role"]);
      const company  = str(["company", "employer", "organization"]);
      const location = str(["location", "city", "place"]);
      const desc     = str(["description", "desc", "job_description", "summary"]);
      const salRaw   = str(["salary", "salaryMin", "compensation", "pay"]);
      if (!title && !company) return null;
      return makeJob("json", i, title, company, location, desc, salRaw);
    }).filter((j): j is ParsedJob => j !== null && Boolean(j.title) && Boolean(j.company));
  } catch { return []; }
}

// ── XML ───────────────────────────────────────────────────────────────────────

function parseXML(text: string): ParsedJob[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
    const getEl = (parent: Element | Document, ...tags: string[]) => {
      for (const tag of tags) {
        const el = parent.querySelector(tag);
        if (el?.textContent) return el.textContent.trim();
      }
      return "";
    };
    const jobEls = Array.from(doc.querySelectorAll("job,position,vacancy,listing,item,Job,Position"));
    return jobEls.map((el, i) => {
      const title    = getEl(el, "title","job_title","position","role","JobTitle","Title");
      const company  = getEl(el, "company","employer","organization","Company","CompanyName");
      const location = getEl(el, "location","city","Location","City");
      const desc     = getEl(el, "description","desc","job_description","summary","Description");
      const salRaw   = getEl(el, "salary","compensation","Salary");
      if (!title && !company) return null;
      return makeJob("xml", i, title, company, location, desc, salRaw);
    }).filter((j): j is ParsedJob => j !== null && Boolean(j.title) && Boolean(j.company));
  } catch { return []; }
}

// ── Plain Text ────────────────────────────────────────────────────────────────

function parsePlainText(text: string): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  const sections = text.split(/\n{2,}|\-{3,}|={3,}/).filter((s) => s.trim().length > 10);
  for (let i = 0; i < sections.length; i++) {
    const lines = sections[i].split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const labelGet = (label: string) => {
      const rx = new RegExp(`^(?:${label})\\s*[:\\-]\\s*(.+)`, "i");
      for (const l of lines) { const m = l.match(rx); if (m) return m[1].trim(); }
      return "";
    };
    const title    = labelGet("title|job[_ ]?title|position|role") || lines[0];
    const company  = labelGet("company|employer|organization|org");
    const location = labelGet("location|city|place|office");
    const desc     = labelGet("description|desc|summary|about|overview") || lines.slice(1).join(" ").slice(0, 500);
    const salRaw   = labelGet("salary|compensation|pay|range");
    if (title && company) jobs.push(makeJob("txt", i, title, company, location, desc, salRaw));
  }
  return jobs;
}

// ── RTF ───────────────────────────────────────────────────────────────────────

function parseRTF(text: string): ParsedJob[] {
  const plain = text
    .replace(/\{\*?\\[^{}]+\}/g, "")
    .replace(/\\par\b/gi, "\n\n")
    .replace(/\\[a-z]+[-]?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .trim();
  return parsePlainText(plain);
}

// ── File readers ──────────────────────────────────────────────────────────────

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target?.result as string);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsText(file);
  });
}

function readBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsArrayBuffer(file);
  });
}

// ── Excel ─────────────────────────────────────────────────────────────────────

async function parseExcel(buffer: ArrayBuffer): Promise<ParsedJob[]> {
  const XLSX = (await import("xlsx")).default;
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return parseCSV(XLSX.utils.sheet_to_csv(ws));
}

// ── Word (DOCX) ───────────────────────────────────────────────────────────────

async function parseWord(buffer: ArrayBuffer): Promise<ParsedJob[]> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  return parsePlainText(value);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

async function parsePDF(buffer: ArrayBuffer): Promise<ParsedJob[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join(" ") + "\n";
  }
  return parsePlainText(text);
}

// ─────────────────────────────────────────────────────────────────────────────

function useAdminGuard() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (!userId || (ADMIN_USER_ID && userId !== ADMIN_USER_ID)) {
      router.replace("/");
      return;
    }
    setAllowed(true);
  }, [isLoaded, userId, router]);
  return allowed;
}

export default function AdminJobsPage() {
  const allowed = useAdminGuard();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [pageStatus, setPageStatus] = useState<"idle"|"preview"|"saving"|"done"|"error"|"clearing"|"parsing">("idle");
  const [result, setResult] = useState<{added:number;total:number}|null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [dbStats, setDbStats] = useState<DbStats>(null);

  useEffect(() => {
    if (!allowed) return;
    fetchStats();
  }, [allowed]);

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/seed-jobs/stats");
      if (res.ok) { const d = await res.json(); setDbStats({ total: d.total }); }
    } catch { /* ignore */ }
  }

  async function processFile(file: File) {
    setPageStatus("parsing");
    setErrMsg("");

    type StandardizedRecord = {
      title: string;
      company: string;
      location: string;
      description: string;
      salaryRaw: string;
    };

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "ingest";

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/seed-jobs/ingest", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json()) as {
        error?: string;
        records?: StandardizedRecord[];
      };

      if (!res.ok) {
        throw new Error(payload.error || "Format not yet supported");
      }

      const standardizedRecords = Array.isArray(payload.records) ? payload.records : [];

      const parsed = standardizedRecords
        .map((record, index) =>
          makeJob(
            ext,
            index,
            record.title,
            record.company,
            record.location,
            record.description,
            record.salaryRaw
          )
        )
        .filter((job) => Boolean(job.title) && Boolean(job.company));

      if (parsed.length) {
        setJobs(parsed);
        setPageStatus("preview");
      } else {
        setErrMsg("Format not yet supported or file is corrupted");
        setPageStatus("error");
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Format not yet supported or file is corrupted";
      setErrMsg(message);
      setPageStatus("error");
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSeed() {
    setPageStatus("saving");
    try {
      const res = await fetch("/api/admin/seed-jobs", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({jobs}) });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json() as {added:number;total:number};
      setResult(data);
      setDbStats({ total: data.total });
      setPageStatus("done");
    } catch {
      setErrMsg("Failed to seed database. Check server logs.");
      setPageStatus("error");
    }
  }

  async function handleClearAll() {
    if (!confirm("Permanently delete ALL jobs from the database?")) return;
    setPageStatus("clearing");
    try {
      const res = await fetch("/api/admin/seed-jobs/clear", { method:"POST" });
      if (!res.ok) throw new Error();
      setDbStats({ total: 0 });
      setPageStatus("idle");
      setJobs([]);
    } catch {
      setErrMsg("Failed to clear database.");
      setPageStatus("error");
    }
  }

  function reset() {
    setPageStatus("idle"); setJobs([]); setResult(null); setErrMsg("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!allowed) return null;

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.topRow}>
          <div>
            <span style={S.badge}>ADMIN · JOB REFINERY</span>
            <h1 style={S.title}>Job Seeder</h1>
            <p style={S.sub}>Upload any file format to populate the Targeting Array database.</p>
          </div>
          {dbStats !== null && (
            <div style={S.statsBox}>
              <p style={S.statsNum}>{dbStats.total}</p>
              <p style={S.statsLabel}>Jobs in DB</p>
              <button onClick={handleClearAll} disabled={dbStats.total===0||pageStatus==="clearing"}
                style={{...S.dangerBtn, opacity:dbStats.total===0?0.4:1, cursor:dbStats.total===0?"not-allowed":"pointer"}}>
                {pageStatus==="clearing"?"Clearing…":"Clear All Jobs"}
              </button>
            </div>
          )}
        </div>

        {(pageStatus==="idle"||pageStatus==="error") && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
            onDragOver={(e)=>{e.preventDefault();setDragging(true);}}
            onDragLeave={()=>setDragging(false)}
            onDrop={handleDrop}
            onClick={()=>fileRef.current?.click()}
            style={{...S.dropZone, borderColor:dragging?"#15803d":"#d1d5db", background:dragging?"#f0fdf4":"#fafafa"}}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.4} strokeLinecap="round" style={{margin:"0 auto 12px",display:"block"}}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/>
            </svg>
            <p style={{margin:"0 0 4px",fontWeight:700,color:"#374151",fontSize:"0.95rem"}}>{dragging?"Drop file here":"Drag & Drop any file"}</p>
            <p style={{margin:"0 0 16px",color:"#9ca3af",fontSize:"0.82rem"}}>or click to browse</p>
            <span style={S.uploadChip}>Select File →</span>
            <input ref={fileRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleFile} style={{display:"none"}}/>
          </motion.div>
        )}

        {pageStatus==="idle" && (
          <div style={S.hintBox}>
            <span style={{color:"#6b7280",fontSize:"0.8rem",marginRight:4}}>Supported:</span>
            {["CSV","TSV","TXT","RTF","JSON","XML","XLS/XLSX","DOC/DOCX","PDF"].map((f)=>(
              <code key={f} style={S.codeChip}>{f}</code>
            ))}
          </div>
        )}

        {pageStatus==="parsing" && (
          <div style={{textAlign:"center",padding:"48px"}}>
            <div style={S.spinner}/>
            <p style={{color:"#6b7280",margin:"16px 0 0",fontSize:"0.88rem"}}>Parsing file…</p>
          </div>
        )}

        {pageStatus==="error" && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} style={S.errorBox}>
            {errMsg}<button onClick={reset} style={S.linkBtn}>Try again</button>
          </motion.div>
        )}

        {pageStatus==="preview" && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,gap:16,flexWrap:"wrap"}}>
              <div>
                <p style={S.cardEyebrow}>Preview</p>
                <h2 style={S.cardTitle}>{jobs.length} Jobs Ready to Seed</h2>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={reset} style={S.secondaryBtn}>Cancel</button>
                <button onClick={handleSeed} style={S.primaryBtn}>Seed Database →</button>
              </div>
            </div>
            <div style={{maxHeight:380,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
              {jobs.map((job,i)=>(
                <motion.div key={job.id} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:Math.min(i*0.025,0.4)}} style={S.jobRow}>
                  <div style={{minWidth:0}}>
                    <p style={{margin:"0 0 2px",fontWeight:600,fontSize:"0.88rem",color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.title}</p>
                    <p style={{margin:0,color:"#6b7280",fontSize:"0.76rem"}}>{job.company} · {job.location}</p>
                  </div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"flex-end",flexShrink:0}}>
                    {job.tags.slice(0,2).map(t=>(<span key={t} style={S.tag}>{t}</span>))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {pageStatus==="saving" && (
          <div style={{textAlign:"center",padding:"48px"}}>
            <div style={S.spinner}/>
            <p style={{color:"#6b7280",margin:"16px 0 0",fontSize:"0.88rem"}}>Seeding database…</p>
          </div>
        )}

        {pageStatus==="done" && result && (
          <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} style={{...S.card,textAlign:"center"}}>
            <div style={S.successIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{margin:"0 0 8px",fontWeight:700,color:"#111827"}}>Database Updated</h2>
            <p style={{color:"#6b7280",margin:"0 0 24px",fontSize:"0.9rem"}}>
              <strong style={{color:"#15803d"}}>{result.added}</strong> jobs added · <strong>{result.total}</strong> total
            </p>
            <button onClick={reset} style={S.secondaryBtn}>Upload Another</button>
          </motion.div>
        )}
      </div>
      <style>{`@keyframes adm-spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page:{minHeight:"100vh",background:"#ffffff",padding:"40px 24px 80px",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"#111827"},
  inner:{maxWidth:860,margin:"0 auto"},
  topRow:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:24,marginBottom:28,flexWrap:"wrap"},
  badge:{display:"inline-block",background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0",borderRadius:20,padding:"3px 12px",fontSize:"0.7rem",fontWeight:700,letterSpacing:"0.12em",marginBottom:10},
  title:{fontSize:"1.75rem",fontWeight:800,margin:"0 0 6px",color:"#111827"},
  sub:{color:"#6b7280",fontSize:"0.88rem",margin:0},
  statsBox:{background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:12,padding:"20px 28px",textAlign:"center",minWidth:160},
  statsNum:{margin:"0 0 2px",fontSize:"2rem",fontWeight:800,color:"#111827"},
  statsLabel:{margin:"0 0 12px",color:"#6b7280",fontSize:"0.8rem"},
  dangerBtn:{background:"transparent",border:"1px solid #fecaca",color:"#dc2626",borderRadius:8,padding:"8px 14px",fontSize:"0.8rem",fontWeight:600,fontFamily:"inherit"},
  dropZone:{border:"2px dashed #d1d5db",borderRadius:16,padding:"52px 24px",textAlign:"center",cursor:"pointer",transition:"all 0.2s",marginBottom:12},
  uploadChip:{background:"#111827",color:"#fff",borderRadius:8,padding:"8px 18px",fontSize:"0.83rem",fontWeight:600},
  hintBox:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:20},
  codeChip:{background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:4,padding:"1px 7px",fontSize:"0.78rem",fontFamily:"monospace"},
  errorBox:{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:"16px 20px",color:"#dc2626",fontSize:"0.88rem",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},
  linkBtn:{background:"transparent",border:"none",color:"#374151",textDecoration:"underline",cursor:"pointer",fontSize:"0.85rem",fontFamily:"inherit",flexShrink:0},
  card:{background:"#ffffff",border:"1px solid #e5e7eb",borderRadius:16,padding:"32px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"},
  cardEyebrow:{color:"#15803d",fontSize:"0.72rem",letterSpacing:"0.12em",textTransform:"uppercase",margin:"0 0 4px"},
  cardTitle:{margin:0,fontWeight:700,fontSize:"1.25rem",color:"#111827"},
  primaryBtn:{background:"#111827",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"inherit"},
  secondaryBtn:{background:"transparent",border:"1px solid #d1d5db",color:"#374151",borderRadius:8,padding:"10px 18px",fontWeight:600,fontSize:"0.85rem",cursor:"pointer",fontFamily:"inherit"},
  jobRow:{background:"#f9fafb",border:"1px solid #f3f4f6",borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12},
  tag:{background:"#f0fdf4",border:"1px solid #bbf7d0",color:"#15803d",borderRadius:6,padding:"2px 8px",fontSize:"0.72rem",fontWeight:500,whiteSpace:"nowrap"},
  successIcon:{width:48,height:48,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"},
  spinner:{width:36,height:36,border:"3px solid #e5e7eb",borderTopColor:"#15803d",borderRadius:"50%",animation:"adm-spin 0.75s linear infinite",margin:"0 auto"},
};
