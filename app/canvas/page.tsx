"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { jsPDF } from "jspdf";
import { loadImpactEntries, type ImpactEntry } from "@/app/lib/impactLog";

const CANVAS_DRAFT_KEY = "hirely.canvas.draft.v1";
const CANVAS_PALETTE_KEY = "hirely.canvas.palette.v1";
const GRID_SIZE = 12;
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const LETTER_WIDTH = 816;
const LETTER_HEIGHT = 1056;
const SAFE_MARGIN = 48;
const TEMPLATE_ID = "hirely-canvas-v4";
const WORKSPACE_BG = "#e5e5e5";
const CENTER_GUIDE_TOLERANCE = 6;
const OFF_PAGE_OPACITY = 0.4;

type PanelKey = "templates" | "elements" | "uploads" | "text" | null;
type PageSize = "A4" | "Letter" | "Custom";
type ZoomPreset = "fit" | "50" | "100" | "200";
type TemplateLoadMode = "replace" | "preserve";
type TemplateFilter = "All" | TemplateDefinition["category"];

type LayerRow = {
  id: string;
  name: string;
  type: string;
  locked: boolean;
  hidden: boolean;
};

type Suggestion = {
  id: string;
  message: string;
};

type AuditReport = {
  layout: number;
  readability: number;
  ats: "High" | "Medium" | "Low";
  impactDensity: string;
  note: string;
};

type TemplateDefinition = {
  id: string;
  name: string;
  category: string;
  atsRating: number;
  fontPairing: string;
  palette: [string, string, string];
  layoutType: string;
  useCase: string;
  blueprint: string[];
};

type ExportSettings = {
  includeImages: boolean;
  pageSize: PageSize;
  metadata: {
    credentialId: string;
    userId: string;
    templateId: string;
    timestamp: string;
  };
};

const TEMPLATE_CATALOG: TemplateDefinition[] = [
  {
    id: "T-001",
    name: "Modern Executive",
    category: "Modern Professional",
    atsRating: 4,
    fontPairing: "Inter + Merriweather",
    palette: ["#1A1A1A", "#4A90E2", "#E0E0E0"],
    layoutType: "Two-column",
    useCase: "Senior leadership",
    blueprint: ["Header group", "Left skills rail", "Right experience rail"],
  },
  {
    id: "T-002",
    name: "Minimalist Pro",
    category: "Modern Professional",
    atsRating: 5,
    fontPairing: "Inter + Inter",
    palette: ["#111827", "#64748B", "#E5E7EB"],
    layoutType: "Single-column",
    useCase: "Consulting and tech",
    blueprint: ["Clean header", "Compact sections", "Light dividers"],
  },
  {
    id: "T-003",
    name: "Corporate Classic",
    category: "Modern Professional",
    atsRating: 5,
    fontPairing: "Georgia + Inter",
    palette: ["#0F172A", "#334155", "#CBD5E1"],
    layoutType: "Single-column",
    useCase: "Corporate operations",
    blueprint: ["Traditional header", "Serif title", "Balanced sections"],
  },
  {
    id: "T-004",
    name: "Strategic Leader",
    category: "Modern Professional",
    atsRating: 4,
    fontPairing: "Inter + Playfair Display",
    palette: ["#111827", "#0EA5E9", "#E2E8F0"],
    layoutType: "Two-column",
    useCase: "Directors and VPs",
    blueprint: ["Wide header", "Achievement callouts", "Dual column body"],
  },
  {
    id: "T-005",
    name: "Creative Portfolio",
    category: "Creative and Visual",
    atsRating: 3,
    fontPairing: "Poppins + Inter",
    palette: ["#0F172A", "#F97316", "#E5E7EB"],
    layoutType: "Grid",
    useCase: "Design and marketing",
    blueprint: ["Hero block", "Image placeholders", "Project cards"],
  },
  {
    id: "T-006",
    name: "Bold Innovator",
    category: "Creative and Visual",
    atsRating: 3,
    fontPairing: "Poppins + Inter",
    palette: ["#111827", "#14B8A6", "#D1FAE5"],
    layoutType: "Two-column",
    useCase: "Product and startup",
    blueprint: ["Color accent bars", "Metrics blocks", "Strong headings"],
  },
  {
    id: "T-007",
    name: "Personal Brand Sheet",
    category: "Creative and Visual",
    atsRating: 3,
    fontPairing: "Manrope + Inter",
    palette: ["#111827", "#8B5CF6", "#EDE9FE"],
    layoutType: "Two-column",
    useCase: "Personal branding",
    blueprint: ["Headshot frame", "Brand bar", "Social icon row"],
  },
  {
    id: "T-008",
    name: "Case Study Layout",
    category: "Creative and Visual",
    atsRating: 4,
    fontPairing: "Inter + Inter",
    palette: ["#0F172A", "#2563EB", "#DBEAFE"],
    layoutType: "Card stack",
    useCase: "PM and strategy",
    blueprint: ["Summary card", "Metric cards", "Case bullets"],
  },
  {
    id: "T-009",
    name: "ATS Clean",
    category: "ATS Optimized",
    atsRating: 5,
    fontPairing: "Arial + Arial",
    palette: ["#111827", "#374151", "#E5E7EB"],
    layoutType: "Single-column",
    useCase: "Maximum ATS compatibility",
    blueprint: ["Text-only sections", "Zero icon usage", "Simple hierarchy"],
  },
  {
    id: "T-010",
    name: "ATS Hybrid",
    category: "ATS Optimized",
    atsRating: 5,
    fontPairing: "Inter + Inter",
    palette: ["#0F172A", "#0369A1", "#E2E8F0"],
    layoutType: "Single-column",
    useCase: "ATS with light visuals",
    blueprint: ["Minimal shapes", "Clear labels", "Structured bullets"],
  },
  {
    id: "T-011",
    name: "ATS Dense",
    category: "ATS Optimized",
    atsRating: 5,
    fontPairing: "Inter + Inter",
    palette: ["#111827", "#475569", "#E2E8F0"],
    layoutType: "Single-column",
    useCase: "Early career one-page",
    blueprint: ["High density text", "Compact spacing", "Metric bullets"],
  },
  {
    id: "T-012",
    name: "Tech Resume",
    category: "Specialty",
    atsRating: 4,
    fontPairing: "JetBrains Mono + Inter",
    palette: ["#0F172A", "#22C55E", "#DCFCE7"],
    layoutType: "Two-column",
    useCase: "Engineering",
    blueprint: ["Skill matrix", "Project cards", "Repo links"],
  },
  {
    id: "T-013",
    name: "Sales Resume",
    category: "Specialty",
    atsRating: 4,
    fontPairing: "Inter + Inter",
    palette: ["#111827", "#F43F5E", "#FFE4E6"],
    layoutType: "Two-column",
    useCase: "Revenue roles",
    blueprint: ["KPI callouts", "Pipeline highlights", "Quota metrics"],
  },
  {
    id: "T-014",
    name: "Operations Resume",
    category: "Specialty",
    atsRating: 4,
    fontPairing: "Inter + Inter",
    palette: ["#111827", "#0EA5E9", "#E0F2FE"],
    layoutType: "Two-column",
    useCase: "Operations",
    blueprint: ["Process map strip", "Efficiency metrics", "Execution bullets"],
  },
  {
    id: "T-015",
    name: "Finance Resume",
    category: "Specialty",
    atsRating: 5,
    fontPairing: "Georgia + Inter",
    palette: ["#111827", "#334155", "#E2E8F0"],
    layoutType: "Single-column",
    useCase: "Finance and accounting",
    blueprint: ["Conservative header", "Metric-heavy bullets", "Audit-ready sections"],
  },
  {
    id: "T-016",
    name: "Modern Cover Letter",
    category: "Cover Letters and One-Pagers",
    atsRating: 5,
    fontPairing: "Inter + Inter",
    palette: ["#0F172A", "#0284C7", "#E0F2FE"],
    layoutType: "Single-column letter",
    useCase: "General cover letter",
    blueprint: ["Header bar", "Body text block", "Signature line"],
  },
  {
    id: "T-017",
    name: "Executive Cover Letter",
    category: "Cover Letters and One-Pagers",
    atsRating: 5,
    fontPairing: "Playfair Display + Inter",
    palette: ["#111827", "#0369A1", "#E2E8F0"],
    layoutType: "Single-column letter",
    useCase: "Executive outreach",
    blueprint: ["Wide header", "Narrative block", "Signature placeholder"],
  },
  {
    id: "T-018",
    name: "One-Page Snapshot",
    category: "Cover Letters and One-Pagers",
    atsRating: 4,
    fontPairing: "Inter + Inter",
    palette: ["#111827", "#2563EB", "#DBEAFE"],
    layoutType: "Grid",
    useCase: "Profile snapshot",
    blueprint: ["Summary card", "Skills card", "Metrics strip"],
  },
  {
    id: "T-019",
    name: "Career Story Sheet",
    category: "Cover Letters and One-Pagers",
    atsRating: 4,
    fontPairing: "Inter + Inter",
    palette: ["#0F172A", "#9333EA", "#F3E8FF"],
    layoutType: "Timeline",
    useCase: "Career transitions",
    blueprint: ["Timeline spine", "Milestone cards", "Outcome notes"],
  },
  {
    id: "T-020",
    name: "Leadership Bio",
    category: "Cover Letters and One-Pagers",
    atsRating: 4,
    fontPairing: "Merriweather + Inter",
    palette: ["#111827", "#0EA5E9", "#E0F2FE"],
    layoutType: "Two-column",
    useCase: "Speaker or executive bio",
    blueprint: ["Headshot frame", "Bio narrative", "Authority metrics"],
  },
];

function toStarBullet(value: string) {
  const action = value.match(/Action:\s*([^\n]+)/i)?.[1]?.trim() || "improving a workflow";
  const proof = value.match(/Proof:\s*([^\n]+)/i)?.[1]?.trim() || "a constrained environment";
  const result = value.match(/Result:\s*([^\n]+)/i)?.[1]?.trim() || "strong measurable outcomes";
  return `Achieved ${result} by ${action} within ${proof}.`;
}

function normalizeWin(entry: ImpactEntry) {
  return `${entry.action} ${entry.proof} ${entry.result}`.toLowerCase();
}

function safeObjectName(obj: any, index: number): string {
  return String(obj.__layerName || `${obj.type || "object"} ${index + 1}`);
}

function getObjectByLayerId(canvas: any, id: string) {
  return canvas.getObjects().find((obj: any) => String(obj.__layerId || "") === id);
}

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isTextObject(obj: any) {
  return obj?.type === "textbox" || obj?.type === "text" || obj?.type === "i-text";
}

function isProtectedObject(obj: any) {
  return Boolean(obj?.__uiGuide || obj?.__auditNote || (obj?.lockMovementX && obj?.lockMovementY));
}

function getObjectSnapshotForGhostMode(obj: any) {
  return {
    left: Number(obj.left || 0),
    top: Number(obj.top || 0),
    width: Number(obj.width || 0),
    opacity: Number(obj.opacity ?? 1),
    visible: obj.visible !== false,
    selectable: obj.selectable !== false,
    evented: obj.evented !== false,
    scaleX: Number(obj.scaleX || 1),
    scaleY: Number(obj.scaleY || 1),
    shadow: obj.shadow,
  };
}

function inferLayerIcon(type: string) {
  if (type.includes("text")) return "T";
  if (type.includes("image")) return "I";
  if (type.includes("line")) return "-";
  if (type.includes("circle") || type.includes("rect") || type.includes("triangle") || type.includes("polygon")) return "S";
  return "O";
}

function inferSelectionKind(target: any): "text" | "image" | "shape" | "group" | "none" {
  if (!target) return "none";
  const type = String(target.type || "");
  if (type === "activeSelection" || type === "group") return "group";
  if (type === "textbox" || type === "text" || type === "i-text") return "text";
  if (type === "image") return "image";
  if (type === "rect" || type === "circle" || type === "triangle" || type === "polygon" || type === "line") return "shape";
  return "none";
}

function buildTemplatePreviewStyle(template: TemplateDefinition): React.CSSProperties {
  return {
    minHeight: 228,
    borderRadius: 14,
    background: `linear-gradient(180deg, ${template.palette[2]}, #ffffff 30%)`,
    border: `1px solid ${template.palette[1]}22`,
    position: "relative",
    overflow: "hidden",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
  };
}

export default function CanvasPage() {
  const { userId } = useAuth();
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const stageWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<any>(null);
  const fabricRef = useRef<any>(null);
  const safeZoneRef = useRef<any>(null);
  const verticalGuideRef = useRef<any>(null);
  const horizontalGuideRef = useRef<any>(null);
  const ghostModeRef = useRef(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const historyRef = useRef<string[]>([]);
  const futureRef = useRef<string[]>([]);
  const restoringRef = useRef(false);
  const historyBatchRef = useRef(false);
  const workspaceHintRef = useRef("");

  const [ready, setReady] = useState(false);
  const [leftPanel, setLeftPanel] = useState<PanelKey>("templates");
  const [showRightRail, setShowRightRail] = useState(true);
  const [showBleedLines, setShowBleedLines] = useState(true);
  const [snapLines, setSnapLines] = useState(true);
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [customWidth, setCustomWidth] = useState(A4_WIDTH);
  const [customHeight, setCustomHeight] = useState(A4_HEIGHT);
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>("fit");
  const [zoomPercent, setZoomPercent] = useState(100);
  const [selectedTemplateId, setSelectedTemplateId] = useState("T-001");
  const [hoveredTemplateId, setHoveredTemplateId] = useState("");
  const [templatePreviewId, setTemplatePreviewId] = useState("");
  const [templateLoadMode, setTemplateLoadMode] = useState<TemplateLoadMode>("replace");
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("All");

  const [credentialId, setCredentialId] = useState("");
  const [atsVision, setAtsVision] = useState(false);
  const [workspaceHint, setWorkspaceHint] = useState("");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(1.35);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [hexColor, setHexColor] = useState("#111827");
  const [borderColor, setBorderColor] = useState("#111827");
  const [borderWidth, setBorderWidth] = useState(1);
  const [shapeRadius, setShapeRadius] = useState(8);
  const [imageRadius, setImageRadius] = useState(0);
  const [gradientFrom, setGradientFrom] = useState("#0ea5e9");
  const [gradientTo, setGradientTo] = useState("#22d3ee");
  const [savedPalette, setSavedPalette] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(CANVAS_PALETTE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 12) : [];
    } catch {
      return [];
    }
  });

  const [wins, setWins] = useState<ImpactEntry[]>([]);
  const [searchWins, setSearchWins] = useState("");
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const [selectionKind, setSelectionKind] = useState<"text" | "image" | "shape" | "group" | "none">("none");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [audit, setAudit] = useState<AuditReport | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    includeImages: false,
    pageSize: "A4",
    metadata: {
      credentialId: "",
      userId: "guest",
      templateId: TEMPLATE_ID,
      timestamp: new Date().toISOString(),
    },
  });

  const filteredWins = useMemo(() => {
    const needle = searchWins.trim().toLowerCase();
    if (!needle) return wins;
    return wins.filter((entry) => normalizeWin(entry).includes(needle));
  }, [searchWins, wins]);

  const groupedTemplates = useMemo(() => {
    const map = new Map<string, TemplateDefinition[]>();
    TEMPLATE_CATALOG.forEach((template) => {
      const list = map.get(template.category) || [];
      list.push(template);
      map.set(template.category, list);
    });
    return Array.from(map.entries());
  }, []);

  const templateFilters = useMemo<TemplateFilter[]>(() => {
    return ["All", ...groupedTemplates.map(([category]) => category as TemplateDefinition["category"])];
  }, [groupedTemplates]);

  const visibleTemplates = useMemo(() => {
    return templateFilter === "All"
      ? groupedTemplates
      : groupedTemplates.filter(([category]) => category === templateFilter);
  }, [groupedTemplates, templateFilter]);

  const selectedTemplate = useMemo(() => {
    return TEMPLATE_CATALOG.find((template) => template.id === selectedTemplateId) || TEMPLATE_CATALOG[0];
  }, [selectedTemplateId]);

  const previewTemplate = useMemo(() => {
    return TEMPLATE_CATALOG.find((template) => template.id === templatePreviewId) || null;
  }, [templatePreviewId]);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showSuggestion = useCallback((id: string, message: string) => {
    setSuggestions((prev) => {
      if (prev.some((item) => item.id === id)) return prev;
      return [...prev, { id, message }].slice(-8);
    });
  }, []);

  const clearSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const setWorkspaceHintMessage = useCallback((message: string) => {
    if (workspaceHintRef.current === message) return;
    workspaceHintRef.current = message;
    setWorkspaceHint(message);
  }, []);

  const pushHistory = useCallback(() => {
    if (restoringRef.current || historyBatchRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snapshot = JSON.stringify(
      canvas.toJSON([
        "__layerId",
        "__layerName",
        "__uiGuide",
        "__auditNote",
        "__auditNoteMessage",
        "__templateColumn",
        "__templateOrder",
        "__templateBaseTop",
        "__templateSpacing",
        "__ghostOriginal",
      ])
    );
    const current = historyRef.current[historyRef.current.length - 1];
    if (current === snapshot) return;
    historyRef.current = [...historyRef.current.slice(-39), snapshot];
    futureRef.current = [];
  }, []);

  const restoreFromSnapshot = useCallback((snapshot: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    restoringRef.current = true;
    canvas.loadFromJSON(snapshot, () => {
      const guideObjects = canvas.getObjects().filter((obj: any) => obj.__uiGuide);
      safeZoneRef.current = guideObjects.find((obj: any) => obj.type === "rect") || null;
      verticalGuideRef.current = guideObjects.find((obj: any) => obj.type === "line" && Number(obj.x1 || 0) === Number(obj.x2 || 0)) || null;
      horizontalGuideRef.current = guideObjects.find((obj: any) => obj.type === "line" && Number(obj.y1 || 0) === Number(obj.y2 || 0)) || null;
      canvas.renderAll();
      restoringRef.current = false;
      setTimeout(() => {
        canvas.fire("object:modified");
      }, 0);
    });
  }, []);

  const handleUndo = useCallback(() => {
    const history = historyRef.current;
    if (history.length <= 1) return;
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    futureRef.current = [current, ...futureRef.current].slice(0, 40);
    historyRef.current = history.slice(0, -1);
    restoreFromSnapshot(previous);
  }, [restoreFromSnapshot]);

  const handleRedo = useCallback(() => {
    if (!futureRef.current.length) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current.slice(-39), next];
    restoreFromSnapshot(next);
  }, [restoreFromSnapshot]);

  const refreshLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rows: LayerRow[] = canvas
      .getObjects()
      .filter((obj: any) => !obj.__uiGuide)
      .map((obj: any, index: number) => ({
        id: String(obj.__layerId || `${obj.type}-${index}`),
        name: safeObjectName(obj, index),
        type: String(obj.type || "object"),
        locked: Boolean(obj.lockMovementX && obj.lockMovementY),
        hidden: obj.visible === false,
      }))
      .reverse();
    setLayers(rows);
  }, []);

  const evaluateBleedRisk = useCallback(() => {
    const canvas = canvasRef.current;
    const safeZone = safeZoneRef.current;
    if (!canvas || !safeZone) return;
    
    // We are hiding the full rectangle perimeter here
    safeZone.set({ visible: false }); 

    let hasBleedRisk = false;
    canvas.getObjects().forEach((obj: any) => {
      if (obj.__uiGuide || obj.__auditNote) return;
      const bounds = obj.getBoundingRect();
      // Only flags if it's literally falling off the white page
      if (
        bounds.left < 0 ||
        bounds.top < 0 ||
        bounds.left + bounds.width > Number(canvas.getWidth()) ||
        bounds.top + bounds.height > Number(canvas.getHeight())
      ) {
        hasBleedRisk = true;
      }
    });

    if (hasBleedRisk) {
      setWorkspaceHintMessage("Careful! Some elements are moving off the page.");
    } else {
      if (!ghostModeRef.current) setWorkspaceHintMessage("");
    }
    canvas.requestRenderAll();
  }, [setWorkspaceHintMessage]);

  const animateGuideOpacity = useCallback((guide: any, targetOpacity: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !guide) return;
    if (guide.__fadeFrame) cancelAnimationFrame(guide.__fadeFrame);
    const startOpacity = Number(guide.opacity ?? 0);
    const startTime = performance.now();
    const duration = 120;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      guide.set("opacity", startOpacity + (targetOpacity - startOpacity) * progress);
      canvas.requestRenderAll();
      if (progress < 1) {
        guide.__fadeFrame = requestAnimationFrame(tick);
      }
    };

    guide.__fadeFrame = requestAnimationFrame(tick);
  }, []);

  const syncSmartGuides = useCallback((target?: any) => {
    const canvas = canvasRef.current;
    const verticalGuide = verticalGuideRef.current;
    const horizontalGuide = horizontalGuideRef.current;
    if (!canvas || !verticalGuide || !horizontalGuide || !target || target.__uiGuide || target.__auditNote) return;

    const bounds = target.getBoundingRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const canvasCenterX = Number(canvas.getWidth()) / 2;
    const canvasCenterY = Number(canvas.getHeight()) / 2;
    const alignX = Math.abs(centerX - canvasCenterX) <= CENTER_GUIDE_TOLERANCE;
    const alignY = Math.abs(centerY - canvasCenterY) <= CENTER_GUIDE_TOLERANCE;

    if (alignX && snapLines) {
      target.set("left", Number(target.left || 0) + (canvasCenterX - centerX));
      target.setCoords();
    }
    if (alignY && snapLines) {
      target.set("top", Number(target.top || 0) + (canvasCenterY - centerY));
      target.setCoords();
    }

    animateGuideOpacity(verticalGuide, alignX ? 1 : 0);
    animateGuideOpacity(horizontalGuide, alignY ? 1 : 0);
  }, [animateGuideOpacity, snapLines]);

  const updateSafetyState = useCallback((target: any, finalize = false) => {
    const canvas = canvasRef.current;
    const safeZone = safeZoneRef.current;
    if (!canvas || !safeZone || !target || target.__uiGuide || target.__auditNote) return;

    const cWidth = Number(canvas.getWidth());
    const cHeight = Number(canvas.getHeight());
    const bounds = target.getBoundingRect();
    const crossesSafeZone =
      bounds.left < SAFE_MARGIN ||
      bounds.top < SAFE_MARGIN ||
      bounds.left + bounds.width > cWidth - SAFE_MARGIN ||
      bounds.top + bounds.height > cHeight - SAFE_MARGIN;
    const fullyOffPage =
      bounds.left + bounds.width < 0 ||
      bounds.top + bounds.height < 0 ||
      bounds.left > cWidth ||
      bounds.top > cHeight;

    safeZone.set({
      visible: showBleedLines || crossesSafeZone,
      stroke: crossesSafeZone ? "#ef4444" : "rgba(239,68,68,0.72)",
      strokeWidth: crossesSafeZone ? 2 : 1,
      strokeDashArray: crossesSafeZone ? undefined : [6, 6],
      shadow: crossesSafeZone ? "0 0 18px rgba(239,68,68,0.4)" : undefined,
    });

    if (crossesSafeZone) {
      target.set("shadow", "0 0 12px rgba(239,68,68,0.32)");
      setWorkspaceHintMessage("Safety perimeter breached. Move this layer back inside the printable area.");
      showSuggestion("safety-zone", "Objects crossing the safety perimeter are at print risk.");
    } else {
      target.set("shadow", undefined);
      clearSuggestion("safety-zone");
      if (!fullyOffPage && !ghostModeRef.current) setWorkspaceHintMessage("");
    }

    if (fullyOffPage) {
      target.set("opacity", OFF_PAGE_OPACITY);
      setWorkspaceHintMessage("Object is off-page. Release to snap it back inside the artboard.");
      showSuggestion("off-page", "Off-page content is dimmed and snaps back on release.");
      if (finalize) {
        const dx = clampValue(bounds.left, SAFE_MARGIN, cWidth - SAFE_MARGIN - bounds.width) - bounds.left;
        const dy = clampValue(bounds.top, SAFE_MARGIN, cHeight - SAFE_MARGIN - bounds.height) - bounds.top;
        target.set({
          left: Number(target.left || 0) + dx,
          top: Number(target.top || 0) + dy,
          opacity: 1,
        });
        target.setCoords();
        showSuggestion("off-page-snapped", "Layer returned to the nearest safe position.");
      }
    } else {
      target.set("opacity", 1);
      clearSuggestion("off-page");
    }

    canvas.requestRenderAll();
  }, [clearSuggestion, setWorkspaceHintMessage, showBleedLines, showSuggestion]);

  const reflowTemplateTextLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || ghostModeRef.current) return;

    const templateObjects = canvas
      .getObjects()
      .filter((obj: any) => !obj.__uiGuide && !obj.__auditNote && obj.__templateColumn && isTextObject(obj));
    if (!templateObjects.length) return;

    const columns = new Map<string, any[]>();
    templateObjects.forEach((obj: any) => {
      const list = columns.get(String(obj.__templateColumn)) || [];
      list.push(obj);
      columns.set(String(obj.__templateColumn), list);
    });

    columns.forEach((objects) => {
      const sorted = objects.sort((a, b) => Number(a.__templateOrder || 0) - Number(b.__templateOrder || 0));
      let cursor = Number(sorted[0]?.__templateBaseTop || sorted[0]?.top || SAFE_MARGIN);
      sorted.forEach((obj) => {
        obj.set("top", cursor);
        obj.setCoords();
        cursor += Number(obj.getScaledHeight?.() || (Number(obj.height || 0) * Number(obj.scaleY || 1))) + Number(obj.__templateSpacing || 18);
      });
    });

    canvas.requestRenderAll();
  }, []);

  const refreshAtsVision = useCallback((enabled = atsVision) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const textObjects = canvas
      .getObjects()
      .filter((obj: any) => !obj.__uiGuide && !obj.__auditNote && isTextObject(obj))
      .sort((a: any, b: any) => Number(a.top || 0) - Number(b.top || 0));
    const nonTextObjects = canvas
      .getObjects()
      .filter((obj: any) => !obj.__uiGuide && !obj.__auditNote && !isTextObject(obj));

    if (enabled) {
      let lowFont = false;
      let cursor = SAFE_MARGIN;
      const ghostColumnWidth = Number(canvas.getWidth()) - SAFE_MARGIN * 2;

      [...textObjects, ...nonTextObjects].forEach((obj: any) => {
        if (!obj.__ghostOriginal) {
          obj.__ghostOriginal = getObjectSnapshotForGhostMode(obj);
        }
      });

      textObjects.forEach((obj: any) => {
        const tooSmall = Number(obj.fontSize || 14) < 13.3;
        lowFont = lowFont || tooSmall;
        obj.set({
          left: SAFE_MARGIN,
          top: cursor,
          width: ghostColumnWidth,
          opacity: 1,
          visible: true,
          selectable: true,
          evented: true,
          fill: "#111111",
          stroke: tooSmall ? "#ef4444" : undefined,
          strokeWidth: tooSmall ? 0.8 : 0,
          shadow: undefined,
        });
        obj.setCoords();
        cursor += Number(obj.getScaledHeight?.() || (Number(obj.height || 0) * Number(obj.scaleY || 1))) + 18;
      });

      nonTextObjects.forEach((obj: any) => {
        obj.set({ opacity: 0.08, selectable: false, evented: false, shadow: undefined });
      });

      ghostModeRef.current = true;
      showSuggestion("ats-ghost", "ATS Ghost Mode isolates text in a single readable column. Toggle it off to restore layout.");
      setWorkspaceHintMessage("ATS Ghost Mode is active. Layout is preserved and can be restored instantly.");
      if (lowFont) {
        showSuggestion("font-min", "Font size below 10pt equivalent may fail ATS readability.");
      } else {
        clearSuggestion("font-min");
      }
    } else {
      canvas.getObjects().forEach((obj: any) => {
        if (obj.__uiGuide || obj.__auditNote || !obj.__ghostOriginal) return;
        const original = obj.__ghostOriginal;
        obj.set({
          left: original.left,
          top: original.top,
          width: original.width,
          opacity: original.opacity,
          visible: original.visible,
          selectable: original.selectable,
          evented: original.evented,
          scaleX: original.scaleX,
          scaleY: original.scaleY,
          shadow: original.shadow,
          stroke: undefined,
          strokeWidth: 0,
        });
        obj.__ghostOriginal = undefined;
        obj.setCoords();
      });
      ghostModeRef.current = false;
      clearSuggestion("ats-ghost");
      clearSuggestion("font-min");
      setWorkspaceHintMessage("");
      reflowTemplateTextLayout();
    }

    canvas.requestRenderAll();
  }, [atsVision, clearSuggestion, reflowTemplateTextLayout, setWorkspaceHintMessage, showSuggestion]);

  const evaluateContrastHints = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let lowContrastCount = 0;

    canvas.getObjects().forEach((obj: any) => {
      if (obj.__uiGuide || obj.__auditNote) return;
      if (obj.type === "textbox" || obj.type === "text" || obj.type === "i-text") {
        const fill = String(obj.fill || "#111111").toLowerCase();
        if (["#d1d5db", "#cbd5e1", "#e5e7eb", "#f3f4f6", "#ffffff"].includes(fill)) {
          lowContrastCount += 1;
        }
      }
    });

    if (lowContrastCount > 0) {
      showSuggestion("contrast", "Some text colors are too light for recruiter readability.");
    } else {
      clearSuggestion("contrast");
    }
  }, [clearSuggestion, showSuggestion]);

  const applyViewportZoom = useCallback((nextZoom: number, preset: ZoomPreset) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const clampedZoom = clampValue(nextZoom, 0.35, 2.2);
    canvas.setZoom(clampedZoom);
    canvas.setDimensions({ width: `${Math.round(Number(canvas.getWidth()) * clampedZoom)}px`, height: `${Math.round(Number(canvas.getHeight()) * clampedZoom)}px` }, { cssOnly: true });
    canvas.requestRenderAll();
    setZoomPreset(preset);
    setZoomPercent(Math.round(clampedZoom * 100));
  }, []);

  const fitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = stageWrapRef.current;
    if (!canvas || !wrap) return;
    const targetWidth = wrap.clientWidth - 140;
    const targetHeight = wrap.clientHeight - 120;
    const ratio = clampValue(Math.min(targetWidth / Number(canvas.getWidth()), targetHeight / Number(canvas.getHeight())), 0.42, 1.45);
    applyViewportZoom(ratio, "fit");
  }, [applyViewportZoom]);

  const setZoom = useCallback((preset: ZoomPreset) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (preset === "fit") {
      fitToScreen();
      return;
    }
    const value = preset === "50" ? 0.5 : preset === "200" ? 2 : 1;
    applyViewportZoom(value, preset);
  }, [applyViewportZoom, fitToScreen]);

  const rebuildGuides = useCallback((width: number, height: number) => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    const Rect = fabric.Rect || fabric.fabric?.Rect;
    const Line = fabric.Line || fabric.fabric?.Line;

    canvas
      .getObjects()
      .filter((obj: any) => obj.__uiGuide)
      .forEach((guide: any) => canvas.remove(guide));

    const safeZone = new Rect({
      left: SAFE_MARGIN,
      top: SAFE_MARGIN,
      width: width - SAFE_MARGIN * 2,
      height: height - SAFE_MARGIN * 2,
      fill: "transparent",
      stroke: "rgba(239,68,68,0.75)",
      strokeWidth: 1,
      strokeDashArray: [6, 6],
      selectable: false,
      evented: false,
      visible: showBleedLines,
      excludeFromExport: true,
    });
    safeZone.__uiGuide = true;
    safeZoneRef.current = safeZone;
    canvas.add(safeZone);

    const verticalGuide = new Line([width / 2, 0, width / 2, height], {
      stroke: "rgba(14,165,233,0.95)",
      strokeWidth: 1,
      selectable: false,
      evented: false,
      opacity: 0,
      excludeFromExport: true,
    });
    verticalGuide.__uiGuide = true;
    verticalGuideRef.current = verticalGuide;
    canvas.add(verticalGuide);

    const horizontalGuide = new Line([0, height / 2, width, height / 2], {
      stroke: "rgba(14,165,233,0.95)",
      strokeWidth: 1,
      selectable: false,
      evented: false,
      opacity: 0,
      excludeFromExport: true,
    });
    horizontalGuide.__uiGuide = true;
    horizontalGuideRef.current = horizontalGuide;
    canvas.add(horizontalGuide);
    canvas.requestRenderAll();
  }, [showBleedLines]);

  const applyPageSize = useCallback((nextSize: PageSize) => {
    setPageSize(nextSize);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size =
      nextSize === "Letter"
        ? { width: LETTER_WIDTH, height: LETTER_HEIGHT }
        : nextSize === "Custom"
          ? { width: Math.max(500, Math.min(1400, customWidth)), height: Math.max(700, Math.min(1800, customHeight)) }
          : { width: A4_WIDTH, height: A4_HEIGHT };

    canvas.setDimensions({ width: size.width, height: size.height });
    rebuildGuides(size.width, size.height);
    fitToScreen();
    evaluateBleedRisk();
    pushHistory();
  }, [customHeight, customWidth, evaluateBleedRisk, fitToScreen, pushHistory, rebuildGuides]);

  const applyTypography = useCallback((patch: Record<string, unknown>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;

    if (active.type === "activeSelection") {
      const objects = (active as any).getObjects?.() || [];
      objects.forEach((obj: any) => {
        if (obj.type === "textbox" || obj.type === "text" || obj.type === "i-text") {
          obj.set(patch);
        }
      });
      canvas.requestRenderAll();
      pushHistory();
      return;
    }

    if (active.type === "textbox" || active.type === "text" || active.type === "i-text") {
      active.set(patch);
      canvas.requestRenderAll();
      pushHistory();
    }
  }, [pushHistory]);

  const applyShapeStyle = useCallback((patch: Record<string, unknown>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    const type = String(active.type || "");
    if (!["rect", "circle", "triangle", "polygon", "line"].includes(type)) return;
    active.set(patch);
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const applyImageRadius = useCallback((radius: number) => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !fabric || !active || active.type !== "image") return;
    const Rect = fabric.Rect || fabric.fabric?.Rect;
    const clip = new Rect({
      left: -Number(active.width || 0) / 2,
      top: -Number(active.height || 0) / 2,
      width: Number(active.width || 0),
      height: Number(active.height || 0),
      rx: radius,
      ry: radius,
      absolutePositioned: false,
    });
    active.set("clipPath", clip);
    active.setCoords();
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const saveColorToPalette = useCallback(() => {
    const normalized = hexColor.trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
      showSuggestion("palette-invalid", "Use a full hex value like #1f2937.");
      return;
    }
    const next = [normalized, ...savedPalette.filter((item) => item !== normalized)].slice(0, 12);
    setSavedPalette(next);
    localStorage.setItem(CANVAS_PALETTE_KEY, JSON.stringify(next));
    clearSuggestion("palette-invalid");
  }, [clearSuggestion, hexColor, savedPalette, showSuggestion]);

  const addTextBlock = useCallback((label: string, content: string, overrides?: Record<string, unknown>) => {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    const Textbox = fabric.Textbox || fabric.fabric?.Textbox;
    const textbox = new Textbox(content, {
      left: 96,
      top: 180 + canvas.getObjects().filter((obj: any) => !obj.__uiGuide).length * 12,
      width: 620,
      fontSize,
      fontFamily,
      fill: hexColor,
      lineHeight,
      charSpacing: Math.round(letterSpacing * 10),
      textAlign: "left",
      ...(overrides || {}),
    });
    textbox.__layerName = label;
    textbox.__layerId = crypto.randomUUID();
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
    pushHistory();
  }, [fontFamily, fontSize, hexColor, letterSpacing, lineHeight, pushHistory]);

  const addShape = useCallback((shape: "rect" | "circle" | "line" | "triangle" | "polygon" | "frame" | "decorative") => {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    const Rect = fabric.Rect || fabric.fabric?.Rect;
    const Circle = fabric.Circle || fabric.fabric?.Circle;
    const Line = fabric.Line || fabric.fabric?.Line;
    const Triangle = fabric.Triangle || fabric.fabric?.Triangle;
    const Polygon = fabric.Polygon || fabric.fabric?.Polygon;

    let obj: any = null;
    if (shape === "rect") obj = new Rect({ left: 110, top: 220, width: 130, height: 52, fill: "transparent", stroke: hexColor, strokeWidth: 2 });
    if (shape === "circle") obj = new Circle({ left: 140, top: 260, radius: 34, fill: "transparent", stroke: hexColor, strokeWidth: 2 });
    if (shape === "line") obj = new Line([140, 320, 320, 320], { stroke: hexColor, strokeWidth: 2 });
    if (shape === "triangle") obj = new Triangle({ left: 180, top: 250, width: 90, height: 80, fill: "transparent", stroke: hexColor, strokeWidth: 2 });
    if (shape === "polygon" && Polygon) {
      obj = new Polygon([
        { x: 0, y: 0 },
        { x: 70, y: 0 },
        { x: 95, y: 45 },
        { x: 35, y: 86 },
        { x: -10, y: 40 },
      ], { left: 220, top: 260, fill: "transparent", stroke: hexColor, strokeWidth: 2 });
    }
    if (shape === "frame") obj = new Rect({ left: 120, top: 240, width: 200, height: 120, fill: "transparent", stroke: hexColor, strokeWidth: 2, strokeDashArray: [8, 4] });
    if (shape === "decorative") obj = new Triangle({ left: 280, top: 200, width: 50, height: 50, fill: "#fef3c7", stroke: hexColor, strokeWidth: 1 });

    if (!obj) return;
    obj.__layerName = `Element: ${shape}`;
    obj.__layerId = crypto.randomUUID();
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
    pushHistory();
  }, [hexColor, pushHistory]);

  const addIcon = useCallback((kind: "linkedin" | "phone" | "email" | "location") => {
    const text = kind === "linkedin" ? "in" : kind === "phone" ? "( )" : kind === "email" ? "@" : "[]";
    addTextBlock(`${kind.toUpperCase()} Icon`, text, { width: 56, fontSize: 14, fontWeight: "bold" });
  }, [addTextBlock]);

  const applyGradientToSelection = useCallback(() => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !fabric || !active) return;

    const Gradient = fabric.Gradient || fabric.fabric?.Gradient;
    if (!Gradient) return;

    const gradient = new Gradient({
      type: "linear",
      gradientUnits: "pixels",
      coords: { x1: 0, y1: 0, x2: 160, y2: 0 },
      colorStops: [
        { offset: 0, color: gradientFrom },
        { offset: 1, color: gradientTo },
      ],
    });

    if (active.type === "activeSelection") {
      const objects = (active as any).getObjects?.() || [];
      objects.forEach((obj: any) => obj.set("fill", gradient));
    } else {
      active.set("fill", gradient);
    }
    canvas.requestRenderAll();
    pushHistory();
  }, [gradientFrom, gradientTo, pushHistory]);

  const addBulletsToActiveText = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !(active.type === "textbox" || active.type === "text" || active.type === "i-text")) return;
    const lines = String(active.text || "").split(/\r?\n/).map((line) => (line.trim().startsWith("-") ? line : `- ${line}`));
    active.set("text", lines.join("\n"));
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const addNumberedListToActiveText = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !(active.type === "textbox" || active.type === "text" || active.type === "i-text")) return;
    const lines = String(active.text || "").split(/\r?\n/).map((line, idx) => {
      const normalized = line.replace(/^\s*\d+[\.)]\s*/, "").trim();
      return `${idx + 1}. ${normalized}`;
    });
    active.set("text", lines.join("\n"));
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const collectTemplateTextContent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return [] as string[];
    return canvas
      .getObjects()
      .filter((obj: any) => !obj.__uiGuide && !obj.__auditNote && isTextObject(obj))
      .sort((a: any, b: any) => Number(a.top || 0) - Number(b.top || 0))
      .map((obj: any) => String(obj.text || "").trim())
      .filter(Boolean);
  }, []);

  const clearCanvasScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas
      .getObjects()
      .filter((obj: any) => !obj.__uiGuide)
      .forEach((obj: any) => canvas.remove(obj));
    setAudit(null);
    setSuggestions([]);
  }, []);

  const applyTemplate = useCallback((template: TemplateDefinition, mode: TemplateLoadMode = templateLoadMode) => {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    const preservedText = mode === "preserve" ? collectTemplateTextContent() : [];
    historyBatchRef.current = true;

    clearCanvasScene();

    const Rect = fabric.Rect || fabric.fabric?.Rect;
    const Textbox = fabric.Textbox || fabric.fabric?.Textbox;
    const Circle = fabric.Circle || fabric.fabric?.Circle;
    const [primary, accent, divider] = template.palette;
    const width = Number(canvas.getWidth());

    const addObj = (obj: any, name: string, options?: { column?: string; order?: number; spacing?: number; locked?: boolean }) => {
      obj.__layerName = name;
      obj.__layerId = crypto.randomUUID();
      if (options?.column) obj.__templateColumn = options.column;
      if (typeof options?.order === "number") obj.__templateOrder = options.order;
      if (typeof options?.spacing === "number") obj.__templateSpacing = options.spacing;
      if (typeof obj.top === "number") obj.__templateBaseTop = Number(obj.top);
      if (options?.locked) {
        obj.set({
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          lockScalingX: true,
          lockScalingY: true,
          selectable: false,
          evented: false,
        });
      }
      canvas.add(obj);
      return obj;
    };

    const headerHeight = template.name.includes("Cover Letter") ? 110 : 130;
    addObj(new Rect({ left: 40, top: 40, width: width - 80, height: headerHeight, fill: "#ffffff", stroke: divider, strokeWidth: 1 }), "Header Frame", { locked: true });
    addObj(new Textbox("YOUR NAME", { left: 56, top: 58, width: width - 200, fontSize: 30, fontWeight: "bold", fill: primary, fontFamily: "Inter" }), "Header Name", { column: "header", order: 1, spacing: 10 });
    addObj(new Textbox("Title | email@example.com | +1 555 000 0000", { left: 56, top: 100, width: width - 200, fontSize: 12, fill: accent, fontFamily: "Inter" }), "Header Meta", { column: "header", order: 2, spacing: 22 });

    if (template.name.includes("Portfolio") || template.name.includes("Brand") || template.name.includes("Bio")) {
      addObj(new Circle({ left: width - 170, top: 58, radius: 46, fill: "#f8fafc", stroke: accent, strokeWidth: 2 }), "Headshot Placeholder");
    }

    const isSingle = template.layoutType.includes("Single");
    const leftWidth = isSingle ? width - 120 : (width - 130) * 0.38;
    const rightWidth = isSingle ? width - 120 : (width - 130) * 0.58;
    const leftX = 56;
    const rightX = isSingle ? 56 : leftX + leftWidth + 24;
    const baseY = headerHeight + 64;

    addObj(new Textbox("Professional Summary", { left: leftX, top: baseY, width: leftWidth, fontSize: 14, fontWeight: "bold", fill: primary, fontFamily: "Inter" }), "Summary Title", { column: isSingle ? "main" : "left", order: 1, spacing: 8 });
    addObj(new Textbox("Strategic operator with proven outcomes across growth, operations, and delivery.", { left: leftX, top: baseY + 22, width: leftWidth, fontSize: 11.5, lineHeight: 1.3, fill: "#334155", fontFamily: "Inter" }), "Summary Body", { column: isSingle ? "main" : "left", order: 2, spacing: 26 });

    if (!isSingle) {
      addObj(new Rect({ left: leftX + leftWidth + 10, top: baseY, width: 1, height: 650, fill: divider, strokeWidth: 0 }), "Column Divider", { locked: true });
    }

    addObj(new Textbox("Experience", { left: rightX, top: baseY, width: rightWidth, fontSize: 14, fontWeight: "bold", fill: primary, fontFamily: "Inter" }), "Experience Title", { column: isSingle ? "main" : "right", order: 1, spacing: 8 });
    addObj(new Textbox("Senior Role | Company | 2022-2026\n- Increased KPI by 38% by rebuilding process architecture.\n- Reduced cycle time by 26% through automation.", { left: rightX, top: baseY + 24, width: rightWidth, fontSize: 11.5, lineHeight: 1.32, fill: "#1e293b", fontFamily: "Inter" }), "Experience Block 1", { column: isSingle ? "main" : "right", order: 2, spacing: 26 });

    addObj(new Textbox("Education", { left: rightX, top: baseY + 190, width: rightWidth, fontSize: 14, fontWeight: "bold", fill: primary, fontFamily: "Inter" }), "Education Title", { column: isSingle ? "main" : "right", order: 3, spacing: 8 });
    addObj(new Textbox("University Name | Degree | Year", { left: rightX, top: baseY + 214, width: rightWidth, fontSize: 11.5, fill: "#334155", fontFamily: "Inter" }), "Education Block", { column: isSingle ? "main" : "right", order: 4, spacing: 24 });

    if (template.name.includes("Tech") || template.name.includes("Sales") || template.name.includes("Operations") || template.name.includes("Finance")) {
      addObj(new Rect({ left: leftX, top: baseY + 120, width: leftWidth, height: 110, fill: "#f8fafc", stroke: divider, strokeWidth: 1 }), "Metrics Card");
      addObj(new Textbox("Metrics\n- Revenue: +$1.2M\n- Efficiency: +22%\n- SLA: 99.2%", { left: leftX + 10, top: baseY + 130, width: leftWidth - 20, fontSize: 11, fill: accent, fontFamily: "Inter" }), "Metrics Text", { column: isSingle ? "main" : "left", order: 3, spacing: 20 });
    }

    if (template.name.includes("ATS")) {
      canvas
        .getObjects()
        .filter((obj: any) => obj.type === "circle" || String(obj.__layerName || "").includes("Metrics"))
        .forEach((obj: any) => canvas.remove(obj));
    }

    if (template.name.includes("Case Study") || template.name.includes("Snapshot") || template.name.includes("Story")) {
      addObj(new Rect({ left: rightX, top: baseY + 270, width: rightWidth, height: 130, fill: "#f8fafc", stroke: divider, strokeWidth: 1 }), "Case Card");
      addObj(new Textbox("Case Highlight\nChallenge -> Action -> Result\nOutcome: +31% throughput in 8 weeks", { left: rightX + 10, top: baseY + 282, width: rightWidth - 20, fontSize: 11.3, fill: "#1e293b", fontFamily: "Inter" }), "Case Card Text", { column: isSingle ? "main" : "right", order: 5, spacing: 20 });
    }

    const slottedText = canvas
      .getObjects()
      .filter((obj: any) => !obj.__uiGuide && !obj.__auditNote && obj.__templateColumn && isTextObject(obj))
      .sort((a: any, b: any) => Number(a.__templateOrder || 0) - Number(b.__templateOrder || 0));

    if (preservedText.length > 0) {
      slottedText.forEach((obj: any, index: number) => {
        const preserved = preservedText[index];
        if (!preserved) return;
        obj.set("text", preserved);
      });
    }

    reflowTemplateTextLayout();
    canvas.requestRenderAll();
    refreshLayers();
    evaluateBleedRisk();
    evaluateContrastHints();
    if (atsVision) refreshAtsVision(true);
    historyBatchRef.current = false;
    setSelectedTemplateId(template.id);
    pushHistory();
    showSuggestion("template-loaded", mode === "preserve" ? `${template.name} applied while preserving current text content.` : `${template.name} loaded with editable object groups.`);
  }, [atsVision, clearCanvasScene, collectTemplateTextContent, evaluateBleedRisk, evaluateContrastHints, pushHistory, refreshAtsVision, refreshLayers, reflowTemplateTextLayout, showSuggestion, templateLoadMode]);

  const addImageFromFile = useCallback(async (file: File, left = 120, top = 220) => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    if (!/^image\/(png|jpeg|jpg|svg\+xml)$/.test(file.type)) {
      showSuggestion("upload-type", "Only JPG, PNG, and SVG are supported for uploads.");
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const FabricImage = fabric.FabricImage || fabric.Image || fabric.fabric?.Image;
      let imageObj: any = null;
      if (FabricImage?.fromURL) {
        imageObj = await FabricImage.fromURL(url);
      }
      if (!imageObj) return;
      imageObj.set({ left, top });
      imageObj.scaleToWidth(Math.min(260, Number(imageObj.width || 260)));
      imageObj.__layerName = "Image Upload";
      imageObj.__layerId = crypto.randomUUID();
      canvas.add(imageObj);
      canvas.setActiveObject(imageObj);
      canvas.requestRenderAll();
      pushHistory();
      clearSuggestion("upload-type");
    } finally {
      URL.revokeObjectURL(url);
    }
  }, [clearSuggestion, pushHistory, showSuggestion]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    const rect = canvas.upperCanvasEl.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;

    const winPayload = event.dataTransfer.getData("application/x-hirely-win");
    if (winPayload) {
      const bullet = toStarBullet(winPayload);
      const Textbox = fabric.Textbox || fabric.fabric?.Textbox;
      const active = canvas.getActiveObject();

      const inherited =
        active && (active.type === "textbox" || active.type === "text" || active.type === "i-text")
          ? {
              fontFamily: String(active.fontFamily || fontFamily),
              fontSize: Number(active.fontSize || fontSize),
              fill: active.fill || hexColor,
              lineHeight: Number(active.lineHeight || lineHeight),
              charSpacing: Number(active.charSpacing || Math.round(letterSpacing * 10)),
              fontWeight: active.fontWeight || "normal",
              fontStyle: active.fontStyle || "normal",
              underline: Boolean(active.underline),
              textAlign: active.textAlign || "left",
            }
          : {
              fontFamily,
              fontSize,
              fill: hexColor,
              lineHeight,
              charSpacing: Math.round(letterSpacing * 10),
              fontWeight: "normal",
              fontStyle: "normal",
              underline: false,
              textAlign: "left",
            };

      const textObj = new Textbox(bullet, {
        left: Math.max(80, Math.round(dropX / GRID_SIZE) * GRID_SIZE),
        top: Math.max(80, Math.round(dropY / GRID_SIZE) * GRID_SIZE),
        width: 520,
        ...inherited,
      });
      textObj.__layerName = "Win Injection";
      textObj.__layerId = crypto.randomUUID();
      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.requestRenderAll();
      pushHistory();
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await addImageFromFile(file, Math.max(80, dropX), Math.max(80, dropY));
  }, [addImageFromFile, fontFamily, fontSize, hexColor, letterSpacing, lineHeight, pushHistory]);

  const focusLayer = useCallback((id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const found = getObjectByLayerId(canvas, id);
    if (!found) return;
    canvas.setActiveObject(found);
    setSelectedLayerId(id);
    setSelectionKind(inferSelectionKind(found));
    canvas.requestRenderAll();
  }, []);

  const renameLayer = useCallback((id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const found = getObjectByLayerId(canvas, id);
    if (!found) return;
    const current = String(found.__layerName || "Layer");
    const next = window.prompt("Rename layer", current);
    if (!next?.trim()) return;
    found.__layerName = next.trim();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const toggleLayerVisibility = useCallback((id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const found = getObjectByLayerId(canvas, id);
    if (!found) return;
    const nextVisible = found.visible === false;
    found.set("visible", nextVisible);
    found.set("evented", nextVisible);
    found.set("selectable", nextVisible && !(found.lockMovementX && found.lockMovementY));
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const lockUnlockLayer = useCallback((id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const found = getObjectByLayerId(canvas, id);
    if (!found) return;

    const nextLocked = !(found.lockMovementX && found.lockMovementY);
    found.set({
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockRotation: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
      selectable: !nextLocked && found.visible !== false,
      evented: !nextLocked && found.visible !== false,
    });
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const bringForward = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.bringObjectForward(active);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const sendBackward = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    canvas.sendObjectBackwards(active);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const bringLayerToFront = useCallback((id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const found = getObjectByLayerId(canvas, id);
    if (!found) return;
    canvas.bringObjectToFront(found);
    const safeZone = safeZoneRef.current;
    if (safeZone) canvas.bringObjectToFront(safeZone);
    canvas.setActiveObject(found);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const sendLayerToBack = useCallback((id: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const found = getObjectByLayerId(canvas, id);
    if (!found) return;
    canvas.sendObjectToBack(found);
    canvas.requestRenderAll();
    const safeZone = safeZoneRef.current;
    if (safeZone) canvas.bringObjectToFront(safeZone);
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const flipActiveHorizontal = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set("flipX", !active.flipX);
    active.setCoords();
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const flipActiveVertical = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active) return;
    active.set("flipY", !active.flipY);
    active.setCoords();
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const groupSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== "activeSelection") return;
    const grouped = (active as any).toGroup?.();
    if (!grouped) return;
    grouped.__layerName = "Grouped Layer";
    grouped.__layerId = crypto.randomUUID();
    canvas.setActiveObject(grouped);
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const ungroupSelection = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "group") return;
    (active as any).toActiveSelection?.();
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  }, [pushHistory, refreshLayers]);

  const cropActiveImage = useCallback(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "image") return;

    const originalWidth = Number(active.width || 0);
    const originalHeight = Number(active.height || 0);
    if (!originalWidth || !originalHeight) return;

    active.set({
      cropX: Math.floor(originalWidth * 0.08),
      cropY: Math.floor(originalHeight * 0.08),
      width: Math.floor(originalWidth * 0.84),
      height: Math.floor(originalHeight * 0.84),
    });
    active.setCoords();
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const replaceActiveImage = useCallback((file: File) => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "image") return;
    const left = Number(active.left || 120);
    const top = Number(active.top || 220);
    canvas.remove(active);
    void addImageFromFile(file, left, top);
  }, [addImageFromFile]);

  const applyImageFilter = useCallback((preset: "none" | "soft" | "faded") => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active.type !== "image") return;
    if (preset === "none") active.set({ opacity: 1 });
    if (preset === "soft") active.set({ opacity: 0.86 });
    if (preset === "faded") active.set({ opacity: 0.72 });
    canvas.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const clearAuditNotes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas
      .getObjects()
      .filter((obj: any) => obj.__auditNote)
      .forEach((note: any) => canvas.remove(note));
  }, []);

  const placeAuditNote = useCallback((x: number, y: number, message: string) => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    const Rect = fabric.Rect || fabric.fabric?.Rect;
    const Textbox = fabric.Textbox || fabric.fabric?.Textbox;
    const Group = fabric.Group || fabric.fabric?.Group;

    const bg = new Rect({
      left: 0,
      top: 0,
      width: 176,
      height: 68,
      rx: 10,
      ry: 10,
      fill: "#fef08a",
      stroke: "#ca8a04",
      strokeWidth: 1,
    });

    const text = new Textbox(message, {
      left: 10,
      top: 9,
      width: 156,
      fontSize: 10,
      fontFamily: "Inter",
      fill: "#713f12",
      editable: false,
      selectable: false,
      evented: false,
      lineHeight: 1.2,
    });

    const cWidth = Number(canvas.getWidth());
    const cHeight = Number(canvas.getHeight());

    const note = new Group([bg, text], {
      left: Math.max(6, Math.min(cWidth - 188, x + 8)),
      top: Math.max(6, Math.min(cHeight - 78, y + 8)),
      selectable: true,
      hasControls: false,
      lockMovementX: false,
      lockMovementY: false,
      hoverCursor: "pointer",
    });

    note.__auditNote = true;
    note.__auditNoteMessage = message;
    note.__layerName = "Audit Note";
    note.__layerId = crypto.randomUUID();
    canvas.add(note);
    canvas.bringObjectToFront(note);
  }, []);

  const runFinalReview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    clearAuditNotes();

    const cWidth = Number(canvas.getWidth());
    const cHeight = Number(canvas.getHeight());

    const objects = canvas.getObjects().filter((obj: any) => !obj.__uiGuide && !obj.__auditNote);
    const textObjects = objects.filter((obj: any) => obj.type === "textbox" || obj.type === "text" || obj.type === "i-text");

    const notes: Array<{ x: number; y: number; message: string }> = [];

    const outsideObjects = objects.filter((obj: any) => {
      const b = obj.getBoundingRect();
      const outside =
        b.left < SAFE_MARGIN ||
        b.top < SAFE_MARGIN ||
        b.left + b.width > cWidth - SAFE_MARGIN ||
        b.top + b.height > cHeight - SAFE_MARGIN;
      if (outside) notes.push({ x: b.left, y: b.top, message: "Margins are uneven in this area." });
      return outside;
    });

    let overlaps = 0;
    for (let i = 0; i < objects.length; i += 1) {
      const a = objects[i].getBoundingRect();
      for (let j = i + 1; j < objects.length; j += 1) {
        const b = objects[j].getBoundingRect();
        const intersects = !(a.left + a.width < b.left || b.left + b.width < a.left || a.top + a.height < b.top || b.top + b.height < a.top);
        if (intersects) overlaps += 1;
      }
    }

    let lowFontCount = 0;
    let lowContrastCount = 0;
    let weakBulletCount = 0;
    let quantified = 0;

    textObjects.forEach((obj: any) => {
      const b = obj.getBoundingRect();
      const text = String(obj.text || "");
      if (Number(obj.fontSize || 14) < 13.3) {
        lowFontCount += 1;
        notes.push({ x: b.left, y: b.top, message: "Font size is too small. Use 10pt+ equivalent." });
      }
      const fill = String(obj.fill || "#111111").toLowerCase();
      if (["#d1d5db", "#cbd5e1", "#e5e7eb", "#f3f4f6", "#ffffff"].includes(fill)) {
        lowContrastCount += 1;
        notes.push({ x: b.left + 6, y: b.top + 14, message: "Text is too light for recruiter readability." });
      }
      if (/\b\d+(?:\.\d+)?%?\b/.test(text)) quantified += 1;
      const bulletLines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("-") || /^\d+[.)]/.test(line));
      bulletLines.forEach((line) => {
        if (!/\b\d+(?:\.\d+)?%?\b/.test(line)) {
          weakBulletCount += 1;
          notes.push({ x: b.left + 10, y: b.top + 24, message: "This bullet lacks a measurable outcome." });
        }
      });
    });

    notes.slice(0, 20).forEach((note) => placeAuditNote(note.x, note.y, note.message));

    const layout = Math.max(1, 10 - outsideObjects.length - Math.min(4, overlaps));
    const readability = Math.max(1, 10 - lowFontCount - Math.min(2, lowContrastCount));
    const ats: AuditReport["ats"] = readability >= 8 && outsideObjects.length === 0 ? "High" : readability >= 6 ? "Medium" : "Low";
    const impactDensity = quantified >= 3 ? "High" : quantified >= 1 ? "Medium" : "Low";
    const note =
      weakBulletCount > 0
        ? `Design: ${layout}/10. Impact Density: ${impactDensity}. Add metrics to weak bullets flagged on canvas.`
        : `Design: ${layout}/10. Impact Density: ${impactDensity}. Strong measurable impact signal.`;

    setAudit({ layout, readability, ats, impactDensity, note });
    canvas.requestRenderAll();
  }, [clearAuditNotes, placeAuditNote]);

  const exportSearchablePdf = useCallback((settings: ExportSettings) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const format = settings.pageSize === "Letter" ? "letter" : "a4";
    const doc = new jsPDF({ unit: "pt", format });

    doc.setProperties({
      title: "Hirely Canvas Export",
      author: "Hirely Canvas",
      creator: "Hirely Canvas",
      subject: `Credential ${settings.metadata.credentialId || "unassigned"}`,
      keywords: `credential:${settings.metadata.credentialId},user:${settings.metadata.userId},template:${settings.metadata.templateId},timestamp:${settings.metadata.timestamp}`,
    });

    const objects = canvas.getObjects().filter((obj: any) => !obj.__uiGuide && !obj.__auditNote && obj.visible !== false);

    objects.forEach((obj: any) => {
      const type = String(obj.type || "");

      if (type === "textbox" || type === "text" || type === "i-text") {
        const x = 40 + Number(obj.left || 0) * 0.55;
        const y = 50 + Number(obj.top || 0) * 0.55;
        const size = Math.max(8, Math.min(32, Number(obj.fontSize || 12)));
        const text = String(obj.text || "");
        const width = Math.max(80, Number(obj.width || 360) * 0.55);
        const split = doc.splitTextToSize(text, width);
        const hex = String(obj.fill || "#111111");
        doc.setFontSize(size);
        try {
          doc.setTextColor(hex);
        } catch {
          doc.setTextColor("#111111");
        }
        doc.text(split, x, y);
        return;
      }

      if (type === "line") {
        const x1 = 40 + Number(obj.x1 || 0) * 0.55;
        const y1 = 50 + Number(obj.y1 || 0) * 0.55;
        const x2 = 40 + Number(obj.x2 || 0) * 0.55;
        const y2 = 50 + Number(obj.y2 || 0) * 0.55;
        doc.line(x1, y1, x2, y2);
        return;
      }

      if (type === "rect") {
        const x = 40 + Number(obj.left || 0) * 0.55;
        const y = 50 + Number(obj.top || 0) * 0.55;
        const w = Number(obj.width || 0) * Number(obj.scaleX || 1) * 0.55;
        const h = Number(obj.height || 0) * Number(obj.scaleY || 1) * 0.55;
        doc.rect(x, y, w, h);
        return;
      }

      if (type === "circle") {
        const x = 40 + Number(obj.left || 0) * 0.55;
        const y = 50 + Number(obj.top || 0) * 0.55;
        const r = Number(obj.radius || 12) * Number(obj.scaleX || 1) * 0.55;
        doc.circle(x + r, y + r, Math.max(2, r));
        return;
      }

      if (type === "triangle") {
        const x = 40 + Number(obj.left || 0) * 0.55;
        const y = 50 + Number(obj.top || 0) * 0.55;
        const w = Number(obj.width || 48) * Number(obj.scaleX || 1) * 0.55;
        const h = Number(obj.height || 48) * Number(obj.scaleY || 1) * 0.55;
        doc.lines([[w / 2, -h], [w / 2, h], [-w, 0]], x + w / 2, y + h, [1, 1], "S", true);
        return;
      }

      if (type === "image" && settings.includeImages) {
        try {
          const dataUrl = obj.toDataURL?.();
          if (!dataUrl) return;
          const x = 40 + Number(obj.left || 0) * 0.55;
          const y = 50 + Number(obj.top || 0) * 0.55;
          const w = Number(obj.getScaledWidth?.() || obj.width || 0) * 0.55;
          const h = Number(obj.getScaledHeight?.() || obj.height || 0) * 0.55;
          doc.addImage(dataUrl, "PNG", x, y, Math.max(8, w), Math.max(8, h));
        } catch {
          // Ignore individual image export failures.
        }
      }
    });

    if (!settings.includeImages) {
      clearSuggestion("export-image-on");
      showSuggestion("export-image-off", "Image layers are omitted for pure vector-first export.");
    } else {
      clearSuggestion("export-image-off");
      showSuggestion("export-image-on", "Image raster content included in export by request.");
    }

    setExportMessage(`Export ready with metadata: ${settings.metadata.credentialId} | ${settings.metadata.templateId} | ${settings.metadata.timestamp}`);
    doc.save("hirely-canvas-export.pdf");
  }, [clearSuggestion, showSuggestion]);

  useEffect(() => {
    let disposed = false;
    let detachWheel: (() => void) | undefined;

    const init = async () => {
      if (!canvasElRef.current) return;

      const fabricMod = await import("fabric");
      if (disposed) return;
      fabricRef.current = fabricMod;

      const FabricCanvas = (fabricMod as any).Canvas || (fabricMod as any).fabric?.Canvas;
      const Textbox = (fabricMod as any).Textbox || (fabricMod as any).fabric?.Textbox;

      const canvas = new FabricCanvas(canvasElRef.current, {
        width: A4_WIDTH,
        height: A4_HEIGHT,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
        selection: true,
      });
      canvasRef.current = canvas;

      rebuildGuides(A4_WIDTH, A4_HEIGHT);
      historyBatchRef.current = true;

      const title = new Textbox("Your Name", {
        left: 80,
        top: 80,
        width: 300,
        fontSize: 28,
        fontWeight: "bold",
        fontFamily: "Inter",
        fill: "#111827",
      });
      title.__layerName = "Authority Header";
      title.__layerId = crypto.randomUUID();
      canvas.add(title);

      const summary = new Textbox("Professional Summary: Replace with your top value proposition.", {
        left: 80,
        top: 140,
        width: 620,
        fontSize: 13,
        fontFamily: "Inter",
        fill: "#111827",
      });
      summary.__layerName = "Summary Block";
      summary.__layerId = crypto.randomUUID();
      canvas.add(summary);

      try {
        const rawDraft = localStorage.getItem(CANVAS_DRAFT_KEY);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft) as { resumeText?: string };
          if (parsed.resumeText?.trim()) {
            const draftText = new Textbox(parsed.resumeText.trim(), {
              left: 80,
              top: 220,
              width: 620,
              fontSize: 12,
              fontFamily: "Inter",
              fill: "#111827",
            });
            draftText.__layerName = "Optimizer Draft";
            draftText.__layerId = crypto.randomUUID();
            canvas.add(draftText);
          }
        }
      } catch {
        // Ignore malformed cache.
      }

      canvas.on("object:moving", (event: any) => {
        const target = event.target;
        if (!target || target.__uiGuide || target.__auditNote) return;
        if (snapLines) {
          target.set({
            left: Math.round((target.left || 0) / 2) * 2,
            top: Math.round((target.top || 0) / 2) * 2,
          });
        }
        syncSmartGuides(target);
        updateSafetyState(target, false);
      });

      canvas.on("selection:created", (event: any) => {
        const target = event.selected?.[0];
        if (!target || target.__uiGuide) return;
        setSelectedLayerId(String(target.__layerId || ""));
        setSelectionKind(inferSelectionKind(target));
      });

      canvas.on("selection:updated", (event: any) => {
        const target = event.selected?.[0];
        if (!target || target.__uiGuide) return;
        setSelectedLayerId(String(target.__layerId || ""));
        setSelectionKind(inferSelectionKind(target));
      });

      canvas.on("selection:cleared", () => {
        setSelectedLayerId("");
        setSelectionKind("none");
        animateGuideOpacity(verticalGuideRef.current, 0);
        animateGuideOpacity(horizontalGuideRef.current, 0);
      });

      canvas.on("object:added", () => {
        refreshLayers();
        evaluateBleedRisk();
        evaluateContrastHints();
        if (ghostModeRef.current) refreshAtsVision(true);
        pushHistory();
      });
      canvas.on("object:removed", () => {
        refreshLayers();
        evaluateBleedRisk();
        evaluateContrastHints();
        if (ghostModeRef.current) refreshAtsVision(true);
        pushHistory();
      });
      canvas.on("object:modified", (event: any) => {
        syncSmartGuides(undefined);
        animateGuideOpacity(verticalGuideRef.current, 0);
        animateGuideOpacity(horizontalGuideRef.current, 0);
        if (event?.target) updateSafetyState(event.target, true);
        refreshLayers();
        evaluateBleedRisk();
        evaluateContrastHints();
        reflowTemplateTextLayout();
        if (ghostModeRef.current) refreshAtsVision(true);
        pushHistory();
      });

      canvas.on("text:changed", () => {
        reflowTemplateTextLayout();
        if (ghostModeRef.current) refreshAtsVision(true);
      });

      canvas.on("mouse:dblclick", (event: any) => {
        if (event.target) return;
        const pointer = canvas.getPointer(event.e);
        const box = new Textbox("New text", {
          left: Math.round(pointer.x / GRID_SIZE) * GRID_SIZE,
          top: Math.round(pointer.y / GRID_SIZE) * GRID_SIZE,
          width: 320,
          fontSize,
          fontFamily,
          fill: hexColor,
          lineHeight,
          charSpacing: Math.round(letterSpacing * 10),
        });
        box.__layerName = "Free Text";
        box.__layerId = crypto.randomUUID();
        canvas.add(box);
        canvas.setActiveObject(box);
        canvas.requestRenderAll();
      });

      canvas.on("mouse:down", (event: any) => {
        const target = event.target;
        if (target?.__auditNoteMessage) {
          showSuggestion(`audit-click-${target.__layerId}`, `Audit note: ${target.__auditNoteMessage}`);
        }
      });

      const wheelHandler = (event: WheelEvent) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        const nextZoom = Number(canvas.getZoom()) * (event.deltaY > 0 ? 0.94 : 1.06);
        applyViewportZoom(nextZoom, "fit");
      };
      canvas.upperCanvasEl.addEventListener("wheel", wheelHandler, { passive: false });
      detachWheel = () => canvas.upperCanvasEl.removeEventListener("wheel", wheelHandler);

      refreshLayers();
      evaluateBleedRisk();
      evaluateContrastHints();
      historyBatchRef.current = false;
      fitToScreen();
      setReady(true);
      pushHistory();
    };

    void init();

    return () => {
      disposed = true;
      if (detachWheel) detachWheel();
      const canvas = canvasRef.current;
      if (canvas) canvas.dispose();
      canvasRef.current = null;
      safeZoneRef.current = null;
      verticalGuideRef.current = null;
      horizontalGuideRef.current = null;
    };
  }, [
    animateGuideOpacity,
    applyViewportZoom,
    evaluateBleedRisk,
    evaluateContrastHints,
    fitToScreen,
    fontFamily,
    fontSize,
    hexColor,
    letterSpacing,
    lineHeight,
    pushHistory,
    refreshAtsVision,
    rebuildGuides,
    refreshLayers,
    reflowTemplateTextLayout,
    showSuggestion,
    snapLines,
    syncSmartGuides,
    updateSafetyState,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    rebuildGuides(Number(canvas.getWidth()), Number(canvas.getHeight()));
    evaluateBleedRisk();
  }, [evaluateBleedRisk, rebuildGuides, showBleedLines, snapLines]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const activeElement = document.activeElement;
      const isTypingTarget = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement || activeElement?.getAttribute("contenteditable") === "true";
      if (isTypingTarget) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        handleRedo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        applyViewportZoom(Number(canvas.getZoom()) * 1.08, "fit");
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        applyViewportZoom(Number(canvas.getZoom()) * 0.92, "fit");
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const active = canvas.getActiveObject();
      if (!active) return;
      event.preventDefault();

      if (active.type === "activeSelection") {
        const objects = (active as any).getObjects?.() || [];
        const removable = objects.filter((obj: any) => !isProtectedObject(obj));
        if (!removable.length) {
          showSuggestion("locked-delete", "Locked or structural layers cannot be deleted.");
          return;
        }
        historyBatchRef.current = true;
        removable.forEach((obj: any) => canvas.remove(obj));
        historyBatchRef.current = false;
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        refreshLayers();
        evaluateBleedRisk();
        pushHistory();
        return;
      }

      if (isProtectedObject(active)) {
        showSuggestion("locked-delete", "Locked or structural layers cannot be deleted.");
        return;
      }

      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      refreshLayers();
      evaluateBleedRisk();
      pushHistory();
    };

    const handleResize = () => {
      if (zoomPreset === "fit") fitToScreen();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [applyViewportZoom, evaluateBleedRisk, fitToScreen, handleRedo, handleUndo, pushHistory, refreshLayers, showSuggestion, zoomPreset]);

  useEffect(() => {
    let cancelled = false;

    const loadWins = async () => {
      const local = loadImpactEntries(userId);
      if (!userId) {
        if (!cancelled) setWins(local);
        return;
      }

      try {
        const response = await fetch("/api/user/impact-ledger", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setWins(local);
          return;
        }
        const data = (await response.json()) as { entries?: ImpactEntry[] };
        const server = Array.isArray(data.entries) ? data.entries : [];
        const merged = [...server, ...local]
          .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 80);
        if (!cancelled) setWins(merged);
      } catch {
        if (!cancelled) setWins(local);
      }
    };

    const loadCredential = async () => {
      if (!userId) return;
      try {
        const response = await fetch("/api/user/verification-profile", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { profile?: { credentialId?: string } };
        if (!cancelled) setCredentialId(String(data.profile?.credentialId || ""));
      } catch {
        // Ignore profile lookup failures.
      }
    };

    void loadWins();
    void loadCredential();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toolbarIconStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#111827",
    fontSize: 13,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  const railScrollStyle: React.CSSProperties = {
    overflowY: "auto",
    maxHeight: "calc(100vh - 160px)",
  };

  const objectControlsVisible = selectionKind !== "none";

  return (
    <div style={{ minHeight: "100vh", background: WORKSPACE_BG, color: "#111827", padding: 12 }}>
      <main style={{ maxWidth: 1680, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Link href="/upload" className="gh-back-link">Resume Optimizer</Link>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/voice" className="lp-btn-ghost">STARR Lab</Link>
            <button type="button" className="lp-btn-primary" onClick={() => setExportOpen(true)}>Export</button>
          </div>
        </div>

        <section
          style={{
            height: 52,
            background: "rgba(255,255,255,0.94)",
            border: "1px solid rgba(148,163,184,0.25)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            gap: 12,
            marginBottom: 10,
            position: "sticky",
            top: 8,
            zIndex: 30,
            backdropFilter: "blur(10px)",
            boxShadow: "0 14px 28px rgba(15,23,42,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" style={toolbarIconStyle} title="Templates" onClick={() => setLeftPanel("templates")}>Tp</button>
            <button type="button" style={toolbarIconStyle} title="Elements" onClick={() => setLeftPanel("elements")}>El</button>
            <button type="button" style={toolbarIconStyle} title="Uploads" onClick={() => setLeftPanel("uploads")}>Up</button>
            <button type="button" style={toolbarIconStyle} title="Text" onClick={() => setLeftPanel("text")}>T</button>

            <select
              value="shape"
              onChange={(event) => {
                const next = event.target.value as "rect" | "circle" | "line" | "triangle" | "polygon" | "frame" | "decorative";
                if (next) addShape(next);
                event.currentTarget.value = "shape";
              }}
              style={{ height: 30, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }}
              title="Shapes"
            >
              <option value="shape">Shapes</option>
              <option value="rect">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="line">Line</option>
              <option value="triangle">Triangle</option>
              <option value="polygon">Polygon</option>
              <option value="frame">Frame</option>
              <option value="decorative">Decorative</option>
            </select>

            <select
              value="icon"
              onChange={(event) => {
                const next = event.target.value as "linkedin" | "phone" | "email" | "location";
                if (next) addIcon(next);
                event.currentTarget.value = "icon";
              }}
              style={{ height: 30, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }}
              title="Icons"
            >
              <option value="icon">Icons</option>
              <option value="linkedin">LinkedIn</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="location">Location</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" style={toolbarIconStyle} title="Undo" onClick={handleUndo}>U</button>
            <button type="button" style={toolbarIconStyle} title="Redo" onClick={handleRedo}>R</button>

            <select value={zoomPreset} onChange={(event) => setZoom(event.target.value as ZoomPreset)} style={{ height: 30, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }}>
              <option value="fit">Fit</option>
              <option value="50">50%</option>
              <option value="100">100%</option>
              <option value="200">200%</option>
            </select>
            <span style={{ minWidth: 62, height: 30, borderRadius: 999, border: "1px solid #d1d5db", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{zoomPercent}%</span>

            <select value={pageSize} onChange={(event) => applyPageSize(event.target.value as PageSize)} style={{ height: 30, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Custom">Custom</option>
            </select>

            <button type="button" style={toolbarIconStyle} title="Fit to Screen" onClick={fitToScreen}>Ft</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 420, justifyContent: "flex-end" }}>
            {objectControlsVisible ? (
              <>
                {selectionKind === "text" && (
                  <>
                    <select value={fontFamily} onChange={(event) => { setFontFamily(event.target.value); applyTypography({ fontFamily: event.target.value }); }} style={{ height: 30, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }}>
                      <option value="Inter">Inter</option>
                      <option value="Playfair Display">Playfair</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Georgia">Georgia</option>
                    </select>
                    <input type="number" min={8} max={64} value={fontSize} onChange={(event) => { const v = Math.max(8, Math.min(64, Number(event.target.value || 12))); setFontSize(v); applyTypography({ fontSize: v }); }} style={{ width: 60, height: 30, borderRadius: 8, border: "1px solid #d1d5db", fontSize: 12, padding: "0 8px" }} />
                    <input type="color" value={hexColor} onChange={(event) => { setHexColor(event.target.value); applyTypography({ fill: event.target.value }); }} style={{ width: 30, height: 30, border: "1px solid #d1d5db", borderRadius: 8, background: "#fff" }} />
                    <button type="button" style={toolbarIconStyle} title="Align Left" onClick={() => applyTypography({ textAlign: "left" })}>L</button>
                    <button type="button" style={toolbarIconStyle} title="Align Center" onClick={() => applyTypography({ textAlign: "center" })}>C</button>
                    <button type="button" style={toolbarIconStyle} title="Align Right" onClick={() => applyTypography({ textAlign: "right" })}>R</button>
                    <button type="button" style={toolbarIconStyle} title="Bold" onClick={() => applyTypography({ fontWeight: "bold" })}>B</button>
                    <button type="button" style={toolbarIconStyle} title="Italic" onClick={() => applyTypography({ fontStyle: "italic" })}>I</button>
                    <button type="button" style={toolbarIconStyle} title="Underline" onClick={() => applyTypography({ underline: true })}>U</button>
                  </>
                )}
                {selectionKind === "image" && (
                  <>
                    <button type="button" style={toolbarIconStyle} title="Replace Image" onClick={() => uploadInputRef.current?.click()}>Rp</button>
                    <button type="button" style={toolbarIconStyle} title="Crop" onClick={cropActiveImage}>Cr</button>
                    <button type="button" style={toolbarIconStyle} title="Soft" onClick={() => applyImageFilter("soft")}>Sf</button>
                    <button type="button" style={toolbarIconStyle} title="Faded" onClick={() => applyImageFilter("faded")}>Fd</button>
                    <button type="button" style={toolbarIconStyle} title="Flip Horizontal" onClick={flipActiveHorizontal}>FH</button>
                    <button type="button" style={toolbarIconStyle} title="Flip Vertical" onClick={flipActiveVertical}>FV</button>
                  </>
                )}
                {selectionKind === "shape" && (
                  <>
                    <input type="color" value={hexColor} onChange={(event) => { setHexColor(event.target.value); applyShapeStyle({ fill: event.target.value }); }} style={{ width: 30, height: 30, border: "1px solid #d1d5db", borderRadius: 8, background: "#fff" }} />
                    <input type="color" value={borderColor} onChange={(event) => { setBorderColor(event.target.value); applyShapeStyle({ stroke: event.target.value }); }} style={{ width: 30, height: 30, border: "1px solid #d1d5db", borderRadius: 8, background: "#fff" }} />
                    <input type="range" min={0} max={12} value={borderWidth} onChange={(event) => { const v = Number(event.target.value || 1); setBorderWidth(v); applyShapeStyle({ strokeWidth: v }); }} style={{ width: 72 }} />
                    <input type="range" min={0} max={48} value={shapeRadius} onChange={(event) => { const v = Number(event.target.value || 0); setShapeRadius(v); applyShapeStyle({ rx: v, ry: v }); }} style={{ width: 72 }} />
                  </>
                )}
                <button type="button" style={toolbarIconStyle} title="Bring Forward" onClick={bringForward}>F+</button>
                <button type="button" style={toolbarIconStyle} title="Send Backward" onClick={sendBackward}>B-</button>
                <button type="button" style={toolbarIconStyle} title="Group" onClick={groupSelection}>G</button>
                <button type="button" style={toolbarIconStyle} title="Ungroup" onClick={ungroupSelection}>UG</button>
              </>
            ) : (
              <span style={{ fontSize: 12, color: "#6b7280" }}>Select an object to see contextual controls</span>
            )}
          </div>
        </section>

        {pageSize === "Custom" && (
          <section style={{ marginBottom: 10, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", padding: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Custom size</span>
            <input type="number" value={customWidth} onChange={(event) => setCustomWidth(Math.max(500, Math.min(1400, Number(event.target.value || A4_WIDTH))))} style={{ width: 96, height: 30, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
            <input type="number" value={customHeight} onChange={(event) => setCustomHeight(Math.max(700, Math.min(1800, Number(event.target.value || A4_HEIGHT))))} style={{ width: 96, height: 30, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
            <button type="button" className="lp-btn-ghost" onClick={() => applyPageSize("Custom")}>Apply Custom</button>
          </section>
        )}

        <section style={{ display: "grid", gridTemplateColumns: `${leftPanel ? "320px" : "0px"} minmax(0,1fr) ${showRightRail ? "320px" : "0px"}`, gap: 10, alignItems: "start" }}>
          {leftPanel ? (
            <aside style={{ width: 320, border: "1px solid #cbd5e1", background: "rgba(255,255,255,0.96)", borderRadius: 16, padding: 12, boxShadow: "0 18px 36px rgba(15,23,42,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <strong style={{ fontSize: 14, color: "#111827", textTransform: "capitalize" }}>{leftPanel}</strong>
                <button type="button" style={toolbarIconStyle} onClick={() => setLeftPanel(null)} title="Collapse">X</button>
              </div>

              <div style={railScrollStyle}>
                {leftPanel === "templates" && (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div style={{ borderRadius: 14, background: "linear-gradient(180deg, #ffffff, #f8fafc)", border: "1px solid #e5e7eb", padding: 12 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 11, color: "#64748b" }}>Active template: <strong style={{ color: "#111827" }}>{selectedTemplate.name}</strong></p>
                      <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#111827" }}>Template mode</p>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                        <button type="button" className="lp-btn-ghost" style={{ flex: 1, borderColor: templateLoadMode === "replace" ? "#0f172a" : undefined, color: templateLoadMode === "replace" ? "#0f172a" : undefined }} onClick={() => setTemplateLoadMode("replace")}>Full Reset</button>
                        <button type="button" className="lp-btn-ghost" style={{ flex: 1, borderColor: templateLoadMode === "preserve" ? "#0f172a" : undefined, color: templateLoadMode === "preserve" ? "#0f172a" : undefined }} onClick={() => setTemplateLoadMode("preserve")}>Layout Only</button>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {templateFilters.map((filter) => (
                          <button key={filter} type="button" onClick={() => setTemplateFilter(filter)} style={{ borderRadius: 999, border: templateFilter === filter ? "1px solid #0f172a" : "1px solid #d1d5db", background: templateFilter === filter ? "#0f172a" : "#fff", color: templateFilter === filter ? "#fff" : "#475569", padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{filter}</button>
                        ))}
                      </div>
                    </div>

                    {visibleTemplates.map(([category, templates]) => (
                      <div key={category}>
                        <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{category}</p>
                        <div style={{ display: "grid", gap: 10 }}>
                          {templates.map((template) => (
                            <div
                              key={template.id}
                              onMouseEnter={() => setHoveredTemplateId(template.id)}
                              onMouseLeave={() => setHoveredTemplateId("")}
                              style={{
                                textAlign: "left",
                                border: selectedTemplateId === template.id ? "1px solid #0f172a" : hoveredTemplateId === template.id ? "1px solid #94a3b8" : "1px solid #e5e7eb",
                                borderRadius: 16,
                                background: "#ffffff",
                                padding: 10,
                                cursor: "pointer",
                                boxShadow: hoveredTemplateId === template.id ? "0 20px 35px rgba(15,23,42,0.08)" : "0 8px 18px rgba(15,23,42,0.04)",
                                transition: "border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
                              }}
                            >
                              <div style={buildTemplatePreviewStyle(template)}>
                                <div style={{ position: "absolute", inset: 14, borderRadius: 10, background: "#fff", boxShadow: "0 12px 22px rgba(15,23,42,0.08)", padding: 12 }}>
                                  <div style={{ height: 26, width: "54%", borderRadius: 8, background: template.palette[0], marginBottom: 8, opacity: 0.9 }} />
                                  <div style={{ display: "grid", gridTemplateColumns: template.layoutType.includes("Single") ? "1fr" : "0.38fr 0.62fr", gap: 10, height: 148 }}>
                                    <div style={{ display: "grid", gap: 6 }}>
                                      <div style={{ height: 10, width: "70%", borderRadius: 999, background: template.palette[1], opacity: 0.8 }} />
                                      <div style={{ height: 54, borderRadius: 10, background: "#eef2ff" }} />
                                      <div style={{ height: 40, borderRadius: 10, background: "#f8fafc" }} />
                                    </div>
                                    <div style={{ display: "grid", gap: 6 }}>
                                      <div style={{ height: 10, width: "44%", borderRadius: 999, background: template.palette[0], opacity: 0.7 }} />
                                      <div style={{ height: 58, borderRadius: 10, background: "#f8fafc" }} />
                                      <div style={{ height: 48, borderRadius: 10, background: template.palette[2] }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0 6px" }}>
                                <strong style={{ fontSize: 12, color: "#111827" }}>{template.name}</strong>
                                <span style={{ fontSize: 11, color: "#6b7280" }}>ATS {template.atsRating}/5</span>
                              </div>
                              <p style={{ margin: "0 0 6px", fontSize: 11, color: "#374151" }}>{template.layoutType} | {template.useCase}</p>
                              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                                {template.palette.map((color) => (
                                  <span key={`${template.id}-${color}`} style={{ width: 12, height: 12, borderRadius: 999, background: color, border: "1px solid #d1d5db" }} />
                                ))}
                              </div>
                              <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6b7280" }}>{template.blueprint.join(" | ")}</p>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button type="button" className="lp-btn-ghost" style={{ flex: 1, opacity: hoveredTemplateId === template.id || selectedTemplateId === template.id ? 1 : 0.82 }} onClick={() => setTemplatePreviewId(template.id)}>Preview</button>
                                <button type="button" className="lp-btn-primary" style={{ flex: 1 }} onClick={() => applyTemplate(template, templateLoadMode)}>Use Template</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {leftPanel === "elements" && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
                      <button type="button" onClick={() => addShape("rect")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Rect</button>
                      <button type="button" onClick={() => addShape("circle")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Circle</button>
                      <button type="button" onClick={() => addShape("line")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Line</button>
                      <button type="button" onClick={() => addShape("triangle")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Tri</button>
                      <button type="button" onClick={() => addShape("polygon")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Poly</button>
                      <button type="button" onClick={() => addShape("frame")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Frame</button>
                      <button type="button" onClick={() => addShape("decorative")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Decor</button>
                      <button type="button" onClick={() => addIcon("linkedin")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Icon In</button>
                      <button type="button" onClick={() => addIcon("email")} style={{ height: 74, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Icon @</button>
                    </div>
                        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Drag wins from Uploads and drop onto the artboard.</p>
                  </div>
                )}

                {leftPanel === "uploads" && (
                  <div>
                    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 12, padding: 12, marginBottom: 10, background: "#f8fafc" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#475569" }}>Drop files here or browse</p>
                      <button type="button" className="lp-btn-ghost" onClick={() => uploadInputRef.current?.click()}>Upload Image</button>
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        style={{ display: "none" }}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const canvas = canvasRef.current;
                          const active = canvas?.getActiveObject();
                          if (active?.type === "image") {
                            replaceActiveImage(file);
                          } else {
                            void addImageFromFile(file);
                          }
                          event.currentTarget.value = "";
                        }}
                      />
                    </div>

                    <input
                      value={searchWins}
                      onChange={(event) => setSearchWins(event.target.value)}
                      placeholder="Search wins"
                      style={{ width: "100%", borderRadius: 8, border: "1px solid #d1d5db", padding: "7px 10px", fontSize: 12, marginBottom: 8 }}
                    />

                    {filteredWins.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>No wins found.</p>}
                    <div style={{ display: "grid", gap: 8 }}>
                      {filteredWins.map((entry) => (
                        <div
                          key={entry.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              "application/x-hirely-win",
                              `Action: ${entry.action}\nProof: ${entry.proof}\nResult: ${entry.result}`
                            );
                          }}
                          style={{ border: "1px solid #d1fae5", borderRadius: 10, padding: 10, background: "#f0fdf4", cursor: "grab" }}
                        >
                          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#065f46" }}>Reusable Win</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#334155" }}>{entry.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {leftPanel === "text" && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <button type="button" className="lp-btn-ghost" onClick={() => addTextBlock("Heading", "Heading", { fontSize: 28, fontWeight: "bold", width: 520 })}>Heading</button>
                    <button type="button" className="lp-btn-ghost" onClick={() => addTextBlock("Subheading", "Subheading", { fontSize: 20, fontWeight: "bold", width: 520 })}>Subheading</button>
                    <button type="button" className="lp-btn-ghost" onClick={() => addTextBlock("Body", "Body text block", { fontSize: 12, width: 540 })}>Body</button>
                    <button type="button" className="lp-btn-ghost" onClick={() => addTextBlock("Experience Block", "Experience\nRole | Company | Date\n- Impact bullet\n- Impact bullet", { width: 580 })}>Experience Block</button>
                    <button type="button" className="lp-btn-ghost" onClick={addBulletsToActiveText}>Bullets</button>
                    <button type="button" className="lp-btn-ghost" onClick={addNumberedListToActiveText}>Numbered</button>
                  </div>
                )}
              </div>
            </aside>
          ) : (
            <div />
          )}

<section
            ref={stageWrapRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            style={{
              flex: 1, // Changed from minHeight to flex: 1 to fill space properly
              overflow: "auto", // Ensure scrollbars appear if resume is larger than screen
              background: "#e2e8f0", // A slightly cleaner "desk" grey
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              padding: "40px 20px", // More padding for that "breathing room"
            }}
          >
            {/* Header / Info bar stays centered above the paper */}
            <div style={{ width: "fit-content", minWidth: 600, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Centered Artboard</span>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <label style={{ fontSize: 12, color: "#4b5563", display: "inline-flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={showBleedLines} onChange={(event) => setShowBleedLines(event.target.checked)} /> Bleed
                </label>
                <label style={{ fontSize: 12, color: "#4b5563", display: "inline-flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={snapLines} onChange={(event) => setSnapLines(event.target.checked)} /> Snap
                </label>
                <label style={{ fontSize: 12, color: "#4b5563", display: "inline-flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" checked={atsVision} onChange={(event) => { const enabled = event.target.checked; setAtsVision(enabled); setTimeout(() => refreshAtsVision(enabled), 0); }} /> ATS Ghost
                </label>
              </div>
            </div>

            {/* The Floating Paper Container */}
            <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
              {workspaceHint && (
                <div style={{ position: "absolute", top: -45, borderRadius: 8, background: "#1e293b", color: "#fff", padding: "6px 12px", fontSize: 11, boxShadow: "0 10px 15px rgba(0,0,0,0.1)", zIndex: 10 }}>
                  {workspaceHint}
                </div>
              )}
              
              <div style={{ 
                background: "#ffffff", 
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", // Deep shadow for "floating" effect
                border: "1px solid rgba(0,0,0,0.05)", 
                lineHeight: 0 // Removes ghost padding at bottom of canvas
              }}>
                <canvas ref={canvasElRef} />
              </div>
            </div>

            {!ready && <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 20 }}>Initializing vector engine...</p>}
          </section>

          {showRightRail ? (
            <aside style={{ width: 320, border: "1px solid #e5e7eb", borderRadius: 12, background: "#ffffff", padding: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 14, color: "#111827" }}>Context Panel</strong>
                <button type="button" style={toolbarIconStyle} onClick={() => setShowRightRail(false)} title="Collapse">X</button>
              </div>

              <div style={{ ...railScrollStyle, display: "grid", gap: 12 }}>
                {selectionKind === "text" && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Typography</p>
                    <div style={{ display: "grid", gap: 8 }}>
                      <select value={fontFamily} onChange={(event) => { setFontFamily(event.target.value); applyTypography({ fontFamily: event.target.value }); }} style={{ height: 32, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }}>
                        <option value="Inter">Inter</option>
                        <option value="Playfair Display">Playfair</option>
                        <option value="Roboto">Roboto</option>
                        <option value="Georgia">Georgia</option>
                      </select>
                      <input type="number" value={fontSize} min={8} max={64} onChange={(event) => { const v = Math.max(8, Math.min(64, Number(event.target.value || 12))); setFontSize(v); applyTypography({ fontSize: v }); }} style={{ height: 32, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={{ fontSize: 12, color: "#374151" }}>Line height</label>
                        <input type="range" min={0.9} max={2.4} step={0.05} value={lineHeight} onChange={(event) => { const v = Number(event.target.value || 1.35); setLineHeight(v); applyTypography({ lineHeight: v }); }} />
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={{ fontSize: 12, color: "#374151" }}>Letter spacing</label>
                        <input type="range" min={-30} max={200} value={letterSpacing} onChange={(event) => { const v = Number(event.target.value || 0); setLetterSpacing(v); applyTypography({ charSpacing: Math.round(v * 10) }); }} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="lp-btn-ghost" onClick={() => applyTypography({ textAlign: "left" })}>Left</button>
                        <button type="button" className="lp-btn-ghost" onClick={() => applyTypography({ textAlign: "center" })}>Center</button>
                        <button type="button" className="lp-btn-ghost" onClick={() => applyTypography({ textAlign: "right" })}>Right</button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="lp-btn-ghost" onClick={addBulletsToActiveText}>Bullets</button>
                        <button type="button" className="lp-btn-ghost" onClick={addNumberedListToActiveText}>Numbers</button>
                      </div>
                    </div>
                  </div>
                )}

                {selectionKind === "image" && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Image Controls</p>
                    <div style={{ display: "grid", gap: 8 }}>
                      <button type="button" className="lp-btn-ghost" onClick={() => uploadInputRef.current?.click()}>Replace</button>
                      <button type="button" className="lp-btn-ghost" onClick={cropActiveImage}>Crop</button>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="lp-btn-ghost" onClick={() => applyImageFilter("none")}>None</button>
                        <button type="button" className="lp-btn-ghost" onClick={() => applyImageFilter("soft")}>Soft</button>
                        <button type="button" className="lp-btn-ghost" onClick={() => applyImageFilter("faded")}>Faded</button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="button" className="lp-btn-ghost" onClick={flipActiveHorizontal}>Flip H</button>
                        <button type="button" className="lp-btn-ghost" onClick={flipActiveVertical}>Flip V</button>
                      </div>
                      <label style={{ fontSize: 12, color: "#374151" }}>Border radius</label>
                      <input type="range" min={0} max={60} value={imageRadius} onChange={(event) => { const v = Number(event.target.value || 0); setImageRadius(v); applyImageRadius(v); }} />
                    </div>
                  </div>
                )}

                {selectionKind === "shape" && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Shape Controls</p>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={{ fontSize: 12, color: "#374151" }}>Fill color</label>
                      <input type="color" value={hexColor} onChange={(event) => { setHexColor(event.target.value); applyShapeStyle({ fill: event.target.value }); }} style={{ width: 34, height: 30, border: "1px solid #d1d5db", borderRadius: 8 }} />
                      <label style={{ fontSize: 12, color: "#374151" }}>Border width</label>
                      <input type="range" min={0} max={12} value={borderWidth} onChange={(event) => { const v = Number(event.target.value || 1); setBorderWidth(v); applyShapeStyle({ strokeWidth: v }); }} />
                      <label style={{ fontSize: 12, color: "#374151" }}>Border color</label>
                      <input type="color" value={borderColor} onChange={(event) => { setBorderColor(event.target.value); applyShapeStyle({ stroke: event.target.value }); }} style={{ width: 34, height: 30, border: "1px solid #d1d5db", borderRadius: 8 }} />
                    </div>
                  </div>
                )}

                {selectionKind === "none" && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Select a text, image, or shape object to show contextual settings.</p>
                  </div>
                )}

                <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Color and Gradient</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <input type="color" value={hexColor} onChange={(event) => setHexColor(event.target.value)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #d1d5db" }} />
                    <input value={hexColor} onChange={(event) => setHexColor(event.target.value)} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
                    <button type="button" className="lp-btn-ghost" onClick={saveColorToPalette}>Save</button>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                    <input type="color" value={gradientFrom} onChange={(event) => setGradientFrom(event.target.value)} style={{ width: 26, height: 26 }} />
                    <input type="color" value={gradientTo} onChange={(event) => setGradientTo(event.target.value)} style={{ width: 26, height: 26 }} />
                    <button type="button" className="lp-btn-ghost" onClick={applyGradientToSelection}>Apply Gradient</button>
                  </div>
                  {savedPalette.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {savedPalette.map((color) => (
                        <button key={color} type="button" onClick={() => { setHexColor(color); applyTypography({ fill: color }); applyShapeStyle({ fill: color }); }} style={{ width: 18, height: 18, borderRadius: 999, border: "1px solid #d1d5db", background: color }} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Layers</p>
                  <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                    {layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => focusLayer(layer.id)}
                        style={{
                          border: selectedLayerId === layer.id ? "1px solid #4A90E2" : "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: 8,
                          background: "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#111827" }}>
                            <span style={{ width: 18, height: 18, borderRadius: 5, border: "1px solid #d1d5db", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{inferLayerIcon(layer.type)}</span>
                            {layer.name}
                          </span>
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>::</span>
                        </div>
                        <p style={{ margin: "0 0 6px", fontSize: 11, color: "#6b7280" }}>{layer.type} | {layer.locked ? "Locked" : "Editable"} | {layer.hidden ? "Hidden" : "Visible"}</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button type="button" className="lp-btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={(event) => { event.stopPropagation(); renameLayer(layer.id); }}>Rename</button>
                          <button type="button" className="lp-btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={(event) => { event.stopPropagation(); lockUnlockLayer(layer.id); }}>{layer.locked ? "Unlock" : "Lock"}</button>
                          <button type="button" className="lp-btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={(event) => { event.stopPropagation(); toggleLayerVisibility(layer.id); }}>{layer.hidden ? "Show" : "Hide"}</button>
                          <button type="button" className="lp-btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={(event) => { event.stopPropagation(); bringLayerToFront(layer.id); }}>Front</button>
                          <button type="button" className="lp-btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={(event) => { event.stopPropagation(); sendLayerToBack(layer.id); }}>Back</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" className="lp-btn-ghost" onClick={groupSelection}>Group</button>
                    <button type="button" className="lp-btn-ghost" onClick={ungroupSelection}>Ungroup</button>
                  </div>
                </div>

                {suggestions.length > 0 && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Smart Suggestions</p>
                    <div style={{ display: "grid", gap: 8 }}>
                      {suggestions.map((item) => (
                        <div key={item.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#f8fafc" }}>
                          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#334155" }}>{item.message}</p>
                          <button type="button" className="lp-btn-ghost" style={{ padding: "2px 6px", fontSize: 11 }} onClick={() => dismissSuggestion(item.id)}>Dismiss</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {audit && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>Audit</p>
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#334155" }}>Layout: {audit.layout}/10</p>
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#334155" }}>Readability: {audit.readability}/10</p>
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#334155" }}>ATS: {audit.ats}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#334155" }}>Impact density: {audit.impactDensity}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#065f46" }}>{audit.note}</p>
                  </div>
                )}

                <button type="button" className="lp-btn-primary" onClick={runFinalReview}>Run Final Review</button>
              </div>
            </aside>
          ) : (
            <div style={{ width: 0 }}>
              <button type="button" className="lp-btn-ghost" onClick={() => setShowRightRail(true)}>Open Right Rail</button>
            </div>
          )}
        </section>

        {previewTemplate && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 39, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: 920, maxWidth: "100%", background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", padding: 18, boxShadow: "0 34px 60px rgba(15,23,42,0.24)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#111827" }}>{previewTemplate.name}</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{previewTemplate.layoutType} | {previewTemplate.useCase} | ATS {previewTemplate.atsRating}/5</p>
                </div>
                <button type="button" style={toolbarIconStyle} onClick={() => setTemplatePreviewId("")}>X</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 280px", gap: 18, alignItems: "start" }}>
                <div style={{ borderRadius: 22, background: "linear-gradient(180deg, #d4d4d4, #e5e5e5)", padding: 24, minHeight: 620, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 380, minHeight: 540, borderRadius: 8, background: "#fff", boxShadow: "0 28px 44px rgba(15,23,42,0.18)", padding: 24 }}>
                    <div style={{ height: 34, width: "58%", borderRadius: 10, background: previewTemplate.palette[0], marginBottom: 10 }} />
                    <div style={{ height: 12, width: "78%", borderRadius: 999, background: previewTemplate.palette[1], marginBottom: 18, opacity: 0.75 }} />
                    <div style={{ display: "grid", gridTemplateColumns: previewTemplate.layoutType.includes("Single") ? "1fr" : "0.38fr 0.62fr", gap: 14 }}>
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ height: 12, width: "54%", borderRadius: 999, background: previewTemplate.palette[0], opacity: 0.8 }} />
                        <div style={{ height: 86, borderRadius: 14, background: "#f8fafc", border: `1px solid ${previewTemplate.palette[2]}` }} />
                        <div style={{ height: 140, borderRadius: 14, background: "#f8fafc" }} />
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ height: 12, width: "40%", borderRadius: 999, background: previewTemplate.palette[1], opacity: 0.8 }} />
                        <div style={{ height: 170, borderRadius: 14, background: "#f8fafc" }} />
                        <div style={{ height: 150, borderRadius: 14, background: previewTemplate.palette[2] }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#111827" }}>Blueprint</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{previewTemplate.blueprint.join(" · ")}</p>
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#111827" }}>Palette</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {previewTemplate.palette.map((color) => (
                        <div key={`${previewTemplate.id}-preview-${color}`} style={{ flex: 1, height: 42, borderRadius: 10, background: color, border: "1px solid rgba(15,23,42,0.08)" }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#111827" }}>Apply mode</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>{templateLoadMode === "preserve" ? "Layout Only keeps your current copy and reflows it into the new structure." : "Full Reset loads the template's full editorial starter content."}</p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" className="lp-btn-ghost" style={{ flex: 1 }} onClick={() => setTemplatePreviewId("")}>Back</button>
                    <button type="button" className="lp-btn-primary" style={{ flex: 1 }} onClick={() => { applyTemplate(previewTemplate, templateLoadMode); setTemplatePreviewId(""); }}>Use Template</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {exportOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ width: 520, maxWidth: "100%", background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontSize: 16, color: "#111827" }}>Export PDF</h2>
                <button type="button" style={toolbarIconStyle} onClick={() => setExportOpen(false)}>X</button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 12, color: "#374151" }}>Page size</label>
                <select value={exportSettings.pageSize} onChange={(event) => setExportSettings((prev) => ({ ...prev, pageSize: event.target.value as PageSize }))} style={{ height: 34, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }}>
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Custom">Custom (uses current artboard)</option>
                </select>

                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
                  <input type="checkbox" checked={exportSettings.includeImages} onChange={(event) => setExportSettings((prev) => ({ ...prev, includeImages: event.target.checked }))} />
                  Include images
                </label>

                <p style={{ margin: "4px 0", fontSize: 12, color: "#6b7280" }}>Metadata fields</p>
                <input value={exportSettings.metadata.credentialId} onChange={(event) => setExportSettings((prev) => ({ ...prev, metadata: { ...prev.metadata, credentialId: event.target.value } }))} placeholder="Credential ID" style={{ height: 34, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
                <input value={exportSettings.metadata.userId} onChange={(event) => setExportSettings((prev) => ({ ...prev, metadata: { ...prev.metadata, userId: event.target.value } }))} placeholder="User ID" style={{ height: 34, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
                <input value={exportSettings.metadata.templateId} onChange={(event) => setExportSettings((prev) => ({ ...prev, metadata: { ...prev.metadata, templateId: event.target.value } }))} placeholder="Template ID" style={{ height: 34, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
                <input value={exportSettings.metadata.timestamp} onChange={(event) => setExportSettings((prev) => ({ ...prev, metadata: { ...prev.metadata, timestamp: event.target.value } }))} placeholder="Timestamp" style={{ height: 34, borderRadius: 8, border: "1px solid #d1d5db", padding: "0 8px", fontSize: 12 }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button type="button" className="lp-btn-ghost" onClick={() => setExportOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => {
                    const merged: ExportSettings = {
                      ...exportSettings,
                      metadata: {
                        ...exportSettings.metadata,
                        credentialId: exportSettings.metadata.credentialId || credentialId,
                        userId: exportSettings.metadata.userId || userId || "guest",
                        timestamp: new Date().toISOString(),
                      },
                    };
                    exportSearchablePdf(merged);
                    setExportOpen(false);
                  }}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        )}

        {exportMessage && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#065f46", border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 8, padding: "8px 10px" }}>
            {exportMessage}
          </p>
        )}
      </main>
    </div>
  );
}
