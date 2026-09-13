import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as fs from "fs";
import {
  VehicleAssistantThreadDocument,
  VehicleAssistantThreadModel,
} from "src/shared/infrastructure/mongo/schemas/vehicle-assistant-thread.schema";
import { VehiclesService } from "./vehicles.service";
import { VehicleAssistantChatDto } from "../infrastructure/dtos/vehicle-assistant-chat.dto";

const MAX_THREAD_MESSAGES = 30;
const MAX_MANUAL_CHARS = 36_000;

type PdfParseFn = (buffer: Buffer) => Promise<{ text: string }>;

function loadPdfParse(): PdfParseFn {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("pdf-parse") as PdfParseFn | { default: PdfParseFn };
  const fn = typeof mod === "function" ? mod : mod.default;
  if (typeof fn !== "function") {
    throw new Error("pdf-parse no se pudo cargar");
  }
  return fn;
}

const pdfParse = loadPdfParse();

export type VehicleAssistantMessageDto = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

@Injectable()
export class VehicleAssistantUseCase {
  constructor(
    @InjectModel(VehicleAssistantThreadModel.name)
    private readonly threadModel: Model<VehicleAssistantThreadDocument>,
    private readonly vehicles: VehiclesService
  ) {}

  async history(
    userId: string,
    vehicleId: string
  ): Promise<VehicleAssistantMessageDto[]> {
    await this.assertVehicle(userId, vehicleId);
    const thread = await this.threadModel
      .findOne({
        userId: new Types.ObjectId(userId),
        vehicleId: new Types.ObjectId(vehicleId),
      })
      .lean()
      .exec();
    return (thread?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: new Date(m.createdAt).toISOString(),
    }));
  }

  async clear(userId: string, vehicleId: string): Promise<void> {
    await this.assertVehicle(userId, vehicleId);
    await this.threadModel.deleteOne({
      userId: new Types.ObjectId(userId),
      vehicleId: new Types.ObjectId(vehicleId),
    });
  }

  async chat(
    userId: string,
    vehicleId: string,
    body: VehicleAssistantChatDto
  ): Promise<{ reply: string; messages: VehicleAssistantMessageDto[] }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Falta OPENAI_API_KEY en el servidor. Configurala para usar el asistente."
      );
    }

    const vehicle = await this.assertVehicle(userId, vehicleId);
    const manualText = await this.readManualText(userId, vehicleId);
    const prior = await this.history(userId, vehicleId);
    const userText =
      body.message.trim() ||
      "Revisá el estado de mi vehículo y decime qué mantenimientos debo hacer ya.";

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: this.systemPrompt(vehicle, manualText) },
      ...prior.slice(-16).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userText },
    ];

    const reply = await this.callLlm(messages, apiKey);
    const saved = await this.append(userId, vehicleId, userText, reply);
    return { reply, messages: saved };
  }

  private async assertVehicle(userId: string, vehicleId: string) {
    const list = await this.vehicles.list(userId);
    const vehicle = list.find((v) => v.id === vehicleId);
    if (!vehicle) throw new NotFoundException("Vehículo no encontrado");
    return vehicle;
  }

  private async readManualText(
    userId: string,
    vehicleId: string
  ): Promise<string | null> {
    try {
      const file = await this.vehicles.getDocumentFile(
        userId,
        vehicleId,
        "manual"
      );
      if (!file.mimeType.includes("pdf")) {
        return `[Manual adjunto: ${file.fileName}. No es PDF de texto; pedí que suba el PDF del manual.]`;
      }
      const buffer = fs.readFileSync(file.filepath);
      const parsed = await pdfParse(buffer);
      const text = (parsed.text || "").replace(/\u0000/g, "").trim();
      if (!text) {
        return "El PDF del manual no tiene texto extraíble (puede ser escaneado).";
      }
      return this.pickManualExcerpt(text);
    } catch {
      return null;
    }
  }

  private pickManualExcerpt(text: string): string {
    if (text.length <= MAX_MANUAL_CHARS) return text;
    const keywords =
      /mantenim|service|aceite|filtro|cadena|km|kilometr|v[aá]lvula|freno|llanta|buj[ií]a|coolant|refriger|transmisi[oó]n|embrague|spark|interval|torque|suspensi[oó]n|corriente|bater/i;
    const paras = text.split(/\n{2,}/);
    const hits = paras.filter((p) => keywords.test(p));
    const head = text.slice(0, 7000);
    const body = hits.join("\n\n").slice(0, MAX_MANUAL_CHARS - 8000);
    return `${head}\n\n[…extracto de capítulos de mantenimiento…]\n\n${body}`;
  }

  private systemPrompt(
    vehicle: Awaited<ReturnType<VehiclesService["list"]>>[number],
    manualText: string | null
  ): string {
    const hoy = new Date().toISOString().slice(0, 10);
    const facts = {
      tipo: vehicle.type,
      placa: vehicle.plate,
      marca: vehicle.brand,
      modelo: vehicle.model,
      anioModelo: vehicle.year,
      color: vehicle.color,
      kilometrajeKm: vehicle.odometerKm,
      aniosDeTenencia: vehicle.yearsOwned,
      venceSoat: vehicle.soatExpiresAt,
      venceTecnomecanica: vehicle.technoExpiresAt,
      venceLicencia: vehicle.licenseExpiresAt,
      notas: vehicle.notes,
      tieneManualPdf: Boolean(manualText),
    };

    return [
      "Sos el mecánico de cabecera de OverApp (Colombia).",
      "El usuario te pide qué debe hacerle a SU moto o carro, con tono cercano: 'uy, andá haciendo esto'.",
      "Priorizá lo urgente (seguridad, líquidos, frenos, cadena/correa, SOAT/tecno) y después lo de intervalo por km o tiempo.",
      "Si hay texto del manual, usalo como fuente principal (intervalos, pares, capacidades). Citá el intervalo cuando exista.",
      "Si no hay manual, decilo y dá recomendaciones genéricas para esa marca/tipo/año, marcándolas como orientativas.",
      "No inventes códigos de error ni pares de apriete si no están en el manual.",
      "Respondé en el idioma del usuario. Formato: lista corta (ahora / pronto / más adelante) + por qué.",
      "No reemplazás un taller: si hay ruido raro, fuga o luz de check, mandalo al taller.",
      `Hoy: ${hoy}`,
      `Datos del vehículo:\n${JSON.stringify(facts)}`,
      manualText
        ? `Texto extraído del manual:\n${manualText}`
        : "No hay manual PDF cargado todavía.",
    ].join("\n\n");
  }

  private async callLlm(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    apiKey: string
  ): Promise<string> {
    const baseUrl = (
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new ServiceUnavailableException(
        err.slice(0, 280) || "El proveedor de IA no respondió"
      );
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    return (
      (data.choices?.[0]?.message?.content || "").trim() ||
      "No pude generar una respuesta. Probá de nuevo."
    );
  }

  private async append(
    userId: string,
    vehicleId: string,
    userText: string,
    reply: string
  ): Promise<VehicleAssistantMessageDto[]> {
    const now = new Date();
    const thread = await this.threadModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          vehicleId: new Types.ObjectId(vehicleId),
        },
        {
          $setOnInsert: {
            userId: new Types.ObjectId(userId),
            vehicleId: new Types.ObjectId(vehicleId),
          },
          $push: {
            messages: {
              $each: [
                { role: "user", content: userText, createdAt: now },
                { role: "assistant", content: reply, createdAt: now },
              ],
              $slice: -MAX_THREAD_MESSAGES,
            },
          },
        },
        { upsert: true, new: true }
      )
      .exec();
    return (thread?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: new Date(m.createdAt).toISOString(),
    }));
  }
}
