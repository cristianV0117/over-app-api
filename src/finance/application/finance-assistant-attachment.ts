import { BadRequestException } from "@nestjs/common";
import * as XLSX from "xlsx";

type PdfParseFn = (buffer: Buffer) => Promise<{ text: string }>;

function loadPdfParse(): PdfParseFn {
  // pdf-parse es CommonJS; import default queda como .default undefined en Nest.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("pdf-parse") as PdfParseFn | { default: PdfParseFn };
  const fn = typeof mod === "function" ? mod : mod.default;
  if (typeof fn !== "function") {
    throw new Error("pdf-parse no se pudo cargar");
  }
  return fn;
}

const pdfParse = loadPdfParse();

export const ASSISTANT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ASSISTANT_DOC_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
]);

const MAX_EXTRACT_CHARS = 40_000;

export function inferAttachmentMime(
  mimeType: string | undefined,
  fileName: string | undefined
): string {
  const mime = (mimeType || "").trim().toLowerCase();
  if (mime && mime !== "application/octet-stream") return mime;
  const name = (fileName || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (name.endsWith(".xls")) return "application/vnd.ms-excel";
  if (name.endsWith(".csv")) return "text/csv";
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return mime;
}

function decodeBase64(dataBase64: string): Buffer {
  const raw = dataBase64.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(raw, "base64");
}

function clip(text: string): string {
  const t = text.replace(/\u0000/g, "").trim();
  if (t.length <= MAX_EXTRACT_CHARS) return t;
  return `${t.slice(0, MAX_EXTRACT_CHARS)}\n\n[Documento recortado: solo las primeras ${MAX_EXTRACT_CHARS} caracteres]`;
}

function excelToText(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (!csv.trim()) continue;
    parts.push(`## Hoja: ${sheetName}\n${csv.trim()}`);
  }
  return clip(parts.join("\n\n"));
}

export async function extractAttachmentForLlm(opts: {
  mimeType: string;
  dataBase64: string;
  fileName?: string;
}): Promise<
  | { kind: "image"; mimeType: string; rawBase64: string }
  | { kind: "text"; text: string }
> {
  const mime = inferAttachmentMime(opts.mimeType, opts.fileName);
  const rawBase64 = opts.dataBase64.replace(/^data:[^;]+;base64,/, "");

  if (ASSISTANT_IMAGE_TYPES.has(mime)) {
    return { kind: "image", mimeType: mime, rawBase64 };
  }

  const buffer = decodeBase64(opts.dataBase64);
  if (!buffer.length) {
    throw new BadRequestException("El archivo adjunto está vacío");
  }

  if (mime === "application/pdf") {
    const parsed = await pdfParse(buffer);
    const text = clip(parsed.text || "");
    if (!text) {
      throw new BadRequestException(
        "No pude leer texto de ese PDF. Probá un pantallazo."
      );
    }
    return { kind: "text", text };
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel"
  ) {
    const text = excelToText(buffer);
    if (!text) {
      throw new BadRequestException("El Excel no tiene datos para analizar");
    }
    return { kind: "text", text };
  }

  if (mime === "text/csv" || mime === "application/csv" || mime === "text/plain") {
    return { kind: "text", text: clip(buffer.toString("utf8")) };
  }

  throw new BadRequestException(
    "Formato no soportado. Usá imagen, PDF, Excel o CSV."
  );
}
