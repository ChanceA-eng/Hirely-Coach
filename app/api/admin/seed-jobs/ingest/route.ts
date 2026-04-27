import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
// import pdfParse handled via dynamic import

type StandardizedRecord = {
  title: string;
  company: string;
  location: string;
  description: string;
  salaryRaw: string;
};

type ParserOutput = {
  records: StandardizedRecord[];
  normalizedText: string;
};

type ParserContext = {
  extension: string;
  buffer: Buffer;
  getText: () => Promise<string>;
};

type IngestParser = (context: ParserContext) => Promise<ParserOutput>;

const TEXT_EXTENSIONS = new Set(["csv", "tsv", "tst", "txt", "rtf", "json", "xml"]);

function normalizeText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeField(value: unknown): string {
  if (typeof value !== "string") return "";
  return normalizeText(value);
}

function toStandardizedRecord(raw: Record<string, unknown>): StandardizedRecord {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) {
        return String(raw[key]);
      }
    }
    return "";
  };

  return {
    title: normalizeField(pick("title", "job_title", "position", "role", "JobTitle", "Title")),
    company: normalizeField(pick("company", "employer", "organization", "Company", "CompanyName")),
    location: normalizeField(pick("location", "city", "place", "Location", "City")),
    description: normalizeField(pick("description", "desc", "job_description", "summary", "Description")),
    salaryRaw: normalizeField(pick("salary", "salaryMin", "compensation", "pay", "Salary")),
  };
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseDelimitedText(text: string, delimiter: string): StandardizedRecord[] {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseDelimitedLine(lines[0], delimiter).map((header) => header.toLowerCase().replace(/\s+/g, "_"));

  const rows = lines.slice(1).map((line) => {
    const columns = parseDelimitedLine(line, delimiter);
    const raw: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      raw[header] = columns[index] ?? "";
    });
    return toStandardizedRecord(raw);
  });

  return rows.filter((row) => row.title && row.company);
}

function parseJsonText(text: string): StandardizedRecord[] {
  const parsed = JSON.parse(text) as unknown;

  const records = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as Record<string, unknown>).jobs)
      ? (parsed as { jobs: unknown[] }).jobs
      : [];

  return records
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => toStandardizedRecord(item as Record<string, unknown>))
    .filter((row) => row.title && row.company);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractXmlTag(block: string, tags: string[]): string {
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const match = block.match(regex);
    if (match?.[1]) {
      return normalizeText(decodeXmlEntities(match[1].replace(/<[^>]+>/g, " ")));
    }
  }
  return "";
}

function parseXmlText(text: string): StandardizedRecord[] {
  const blocks = Array.from(text.matchAll(/<(job|position|vacancy|listing|item)\b[\s\S]*?<\/\1>/gi)).map((match) => match[0]);

  const sourceBlocks = blocks.length ? blocks : [text];

  const records = sourceBlocks.map((block) => ({
    title: extractXmlTag(block, ["title", "job_title", "position", "role", "JobTitle", "Title"]),
    company: extractXmlTag(block, ["company", "employer", "organization", "Company", "CompanyName"]),
    location: extractXmlTag(block, ["location", "city", "place", "Location", "City"]),
    description: extractXmlTag(block, ["description", "desc", "job_description", "summary", "Description"]),
    salaryRaw: extractXmlTag(block, ["salary", "salaryMin", "compensation", "pay", "Salary"]),
  }));

  return records.filter((row) => row.title && row.company);
}

function parsePlainText(text: string): StandardizedRecord[] {
  const sections = text
    .split(/\n{2,}|\-{3,}|={3,}/)
    .map((section) => section.trim())
    .filter((section) => section.length > 10);

  const records = sections.map((section) => {
    const lines = section.split("\n").map((line) => line.trim()).filter(Boolean);

    const readByLabel = (labelPattern: string) => {
      const regex = new RegExp(`^(?:${labelPattern})\\s*[:\\-]\\s*(.+)$`, "i");
      for (const line of lines) {
        const match = line.match(regex);
        if (match?.[1]) return normalizeText(match[1]);
      }
      return "";
    };

    const title = readByLabel("title|job[_ ]?title|position|role") || lines[0] || "";

    return {
      title: normalizeText(title),
      company: readByLabel("company|employer|organization|org"),
      location: readByLabel("location|city|place|office"),
      description: readByLabel("description|desc|summary|about|overview") || normalizeText(lines.slice(1).join(" ")),
      salaryRaw: readByLabel("salary|compensation|pay|range"),
    };
  });

  return records.filter((row) => row.title && row.company);
}

function parseRtfText(text: string): StandardizedRecord[] {
  const normalized = normalizeText(
    text
      .replace(/\{\*?\\[^{}]+\}/g, "")
      .replace(/\\par\b/gi, "\n\n")
      .replace(/\\[a-z]+[-]?\d* ?/gi, "")
      .replace(/[{}]/g, "")
  );

  return parsePlainText(normalized);
}

function toNormalizedText(records: StandardizedRecord[], fallback = ""): string {
  if (!records.length) return normalizeText(fallback);

  const joined = records
    .map((row) => {
      const parts = [
        `Title: ${row.title}`,
        `Company: ${row.company}`,
        row.location ? `Location: ${row.location}` : "",
        row.salaryRaw ? `Salary: ${row.salaryRaw}` : "",
        row.description ? `Description: ${row.description}` : "",
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  return normalizeText(joined);
}

function createOutput(records: StandardizedRecord[], fallbackText = ""): ParserOutput {
  return {
    records,
    normalizedText: toNormalizedText(records, fallbackText),
  };
}

async function parseSpreadsheet(context: ParserContext): Promise<ParserOutput> {
  const workbook = XLSX.read(context.buffer, { type: "buffer" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(firstSheet);
  const records = parseDelimitedText(csv, ",");
  return createOutput(records, csv);
}

async function parseWordDocument(context: ParserContext): Promise<ParserOutput> {
  const result = await mammoth.extractRawText({ buffer: context.buffer });
  const normalized = normalizeText(result.value ?? "");
  const records = parsePlainText(normalized);
  return createOutput(records, normalized);
}

async function parsePdfDocument(context: ParserContext): Promise<ParserOutput> {
  const pdfParseModule: any = await import("pdf-parse");
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const result = await pdfParse(context.buffer);
  const normalized = normalizeText(result.text ?? "");
  const records = parsePlainText(normalized);
  return createOutput(records, normalized);
}

async function parseUtfText(context: ParserContext): Promise<string> {
  return normalizeText(await context.getText());
}

function getParser(fileExtension: string): IngestParser | null {
  switch (fileExtension) {
    case "csv":
      return async (context) => {
        const text = await parseUtfText(context);
        const records = parseDelimitedText(text, ",");
        return createOutput(records, text);
      };
    case "tsv":
    case "tst":
      return async (context) => {
        const text = await parseUtfText(context);
        const records = parseDelimitedText(text, "\t");
        return createOutput(records, text);
      };
    case "txt":
      return async (context) => {
        const text = await parseUtfText(context);
        const records = parsePlainText(text);
        return createOutput(records, text);
      };
    case "rtf":
      return async (context) => {
        const text = await parseUtfText(context);
        const records = parseRtfText(text);
        return createOutput(records, text);
      };
    case "json":
      return async (context) => {
        const text = await parseUtfText(context);
        const records = parseJsonText(text);
        return createOutput(records, text);
      };
    case "xml":
      return async (context) => {
        const text = await parseUtfText(context);
        const records = parseXmlText(text);
        return createOutput(records, text);
      };
    case "xls":
    case "xlsx":
      return parseSpreadsheet;
    case "doc":
    case "docx":
      return parseWordDocument;
    case "pdf":
      return parsePdfDocument;
    default:
      return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Format not yet supported" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!extension || (!TEXT_EXTENSIONS.has(extension) && !["xls", "xlsx", "doc", "docx", "pdf"].includes(extension))) {
      return NextResponse.json({ error: "Format not yet supported" }, { status: 400 });
    }

    const parser = getParser(extension);
    if (!parser) {
      return NextResponse.json({ error: "Format not yet supported" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let textCache: string | null = null;
    const context: ParserContext = {
      extension,
      buffer,
      getText: async () => {
        if (textCache !== null) return textCache;
        textCache = buffer.toString("utf-8");
        return textCache;
      },
    };

    const parsed = await parser(context);

    return NextResponse.json({
      format: extension,
      normalizedText: parsed.normalizedText,
      normalizedJson: { jobs: parsed.records },
      records: parsed.records,
    });
  } catch {
    return NextResponse.json({ error: "Format not yet supported or file is corrupted" }, { status: 400 });
  }
}






