import { jsPDF } from "jspdf";
import type { CanvasBlock } from "@/app/lib/hirelySupremacy";
import { runCanvasPreflight } from "@/app/lib/hirelySupremacy";

type ExportOptions = {
  fileName?: string;
  fontName?: string;
  embeddedFontBase64?: string;
  marginsInches?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  minFontSizePt?: number;
};

export function generateVectorResumePdf(blocks: CanvasBlock[], options: ExportOptions = {}) {
  const lines = blocks
    .sort((left, right) => left.order - right.order)
    .map((block) => block.text || "")
    .filter(Boolean);

  const preflight = runCanvasPreflight({
    resumeText: lines.join("\n"),
    links: [],
    marginsInches: options.marginsInches,
    minFontSizePt: options.minFontSizePt || 10,
  });

  if (!preflight.ready) {
    throw new Error(`Pre-flight failed: ${preflight.blockers.join("; ")}`);
  }

  const doc = new jsPDF({ unit: "pt", format: "letter" });

  if (options.embeddedFontBase64 && options.fontName) {
    doc.addFileToVFS(`${options.fontName}.ttf`, options.embeddedFontBase64);
    doc.addFont(`${options.fontName}.ttf`, options.fontName, "normal");
    doc.setFont(options.fontName, "normal");
  }

  doc.setFontSize(11);

  const lineHeight = 16;
  let y = 72;
  lines.forEach((line) => {
    if (y > 740) {
      doc.addPage();
      y = 72;
    }
    doc.text(line, 72, y);
    y += lineHeight;
  });

  doc.save(options.fileName || "hirely-canvas.pdf");

  return preflight;
}
