import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  FinanceAssistantThreadDocument,
  FinanceAssistantThreadModel,
} from "src/shared/infrastructure/mongo/schemas/finance-assistant-thread.schema";
import { FinanceAssistantChatDto } from "../infrastructure/dtos/finance-assistant-chat.dto";
import { FinanceMonthlySummaryUseCase } from "./finance-monthly-summary.useCase";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { Inject } from "@nestjs/common";
import {
  simulateDebtPayoff,
  simulateDebtPlan,
  type DebtPayoffInput,
} from "src/finance/domain/debt-payoff";
import { extractAttachmentForLlm } from "./finance-assistant-attachment";

const MAX_THREAD_MESSAGES = 40;

export type AssistantMessageDto = {
  role: "user" | "assistant";
  content: string;
  attachmentName?: string;
  extractedDebt?: Record<string, unknown> | null;
  createdAt: string;
};

type ChatToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

type ChatApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
};

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_month_summary",
      description: "Resumen de ingresos, gastos y liquidez de un mes.",
      parameters: {
        type: "object",
        properties: {
          year: { type: "integer" },
          month: { type: "integer" },
        },
        required: ["year", "month"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_range_overview",
      description:
        "Totales por mes y ranking de categorías de gasto en un rango (máx. 12 meses).",
      parameters: {
        type: "object",
        properties: {
          fromYear: { type: "integer" },
          fromMonth: { type: "integer" },
          toYear: { type: "integer" },
          toMonth: { type: "integer" },
        },
        required: ["fromYear", "fromMonth", "toYear", "toMonth"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_debts",
      description: "Lista las deudas/créditos configurados por el usuario.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "simulate_payoff",
      description:
        "Calcula cuándo se paga una deuda (o un plan avalanche/snowball). Usa esto para fechas e intereses; no inventes la matemática.",
      parameters: {
        type: "object",
        properties: {
          debtId: { type: "string" },
          extraMonthly: { type: "number" },
          extraBudget: { type: "number" },
          strategy: { type: "string", enum: ["avalanche", "snowball"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "report_extracted_debt",
      description:
        "Cuando el usuario adjuntó un pantallazo de un crédito/deuda, reporta los campos extraídos para que pueda confirmarlos.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          creditor: { type: "string" },
          balance: { type: "number" },
          principal: { type: "number" },
          interestRate: { type: "number" },
          interestRateType: { type: "string", enum: ["NM", "EA"] },
          installmentAmount: { type: "number" },
          dayOfMonth: { type: "integer" },
          totalInstallments: { type: "integer" },
          paidInstallments: { type: "integer" },
          notes: { type: "string" },
        },
        required: ["name", "balance", "interestRate", "interestRateType", "installmentAmount"],
      },
    },
  },
];

@Injectable()
export class FinanceAssistantUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository,
    private readonly monthlySummary: FinanceMonthlySummaryUseCase,
    @InjectModel(FinanceAssistantThreadModel.name)
    private readonly threadModel: Model<FinanceAssistantThreadDocument>
  ) {}

  async history(userId: string): Promise<AssistantMessageDto[]> {
    const thread = await this.threadModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    return (thread?.messages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      attachmentName: m.attachmentName || undefined,
      extractedDebt: m.extractedDebt ?? null,
      createdAt: new Date(m.createdAt).toISOString(),
    }));
  }

  async clear(userId: string): Promise<void> {
    await this.threadModel.deleteOne({ userId: new Types.ObjectId(userId) });
  }

  async chat(
    userId: string,
    body: FinanceAssistantChatDto
  ): Promise<{
    reply: string;
    extractedDebt: Record<string, unknown> | null;
    messages: AssistantMessageDto[];
  }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Falta OPENAI_API_KEY en el servidor. Configurala para usar el asistente."
      );
    }

    const compact = await this.buildCompactContext(userId, body.year, body.month);
    const prior = await this.history(userId);

    const userText = body.message.trim() || "Analizá los documentos adjuntos.";
    const incoming = [
      ...(body.attachments ?? []),
      ...(body.attachment ? [body.attachment] : []),
    ].slice(0, 6);
    const attachmentName = incoming
      .map((a) => a.fileName?.trim())
      .filter(Boolean)
      .join(" · ");

    const llmMessages: ChatApiMessage[] = [
      { role: "system", content: this.systemPrompt(compact) },
      ...prior.slice(-16).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    if (incoming.length > 0) {
      const images: Array<{
        type: "image_url";
        image_url: { url: string };
      }> = [];
      const texts: string[] = [];
      for (const file of incoming) {
        const extracted = await extractAttachmentForLlm({
          mimeType: file.mimeType,
          dataBase64: file.dataBase64,
          fileName: file.fileName,
        });
        const label = file.fileName?.trim() || "archivo";
        if (extracted.kind === "image") {
          images.push({
            type: "image_url",
            image_url: {
              url: `data:${extracted.mimeType};base64,${extracted.rawBase64}`,
            },
          });
        } else {
          texts.push(`--- ${label} ---\n${extracted.text}`);
        }
      }
      const hint =
        (attachmentName ? `\n[Adjuntos: ${attachmentName}]` : "") +
        "\nHay varios archivos. Revisalos todos. Si alguno es crédito o deuda, extraé tasa, cuota, saldo y plazo y llamá report_extracted_debt por cada uno.";
      const textBlock = [userText + hint, ...texts].filter(Boolean).join("\n\n");
      if (images.length > 0) {
        llmMessages.push({
          role: "user",
          content: [{ type: "text", text: textBlock }, ...images],
        });
      } else {
        llmMessages.push({ role: "user", content: textBlock });
      }
    } else {
      llmMessages.push({ role: "user", content: userText });
    }

    let extractedDebt: Record<string, unknown> | null = null;
    const reply = await this.runLlmLoop(
      userId,
      llmMessages,
      apiKey,
      (debt) => {
        extractedDebt = debt;
      }
    );

    const now = new Date();
    await this.appendMessages(userId, [
      {
        role: "user",
        content: userText,
        attachmentName,
        extractedDebt: null,
        createdAt: now,
      },
      {
        role: "assistant",
        content: reply,
        attachmentName: "",
        extractedDebt,
        createdAt: new Date(),
      },
    ]);

    return {
      reply,
      extractedDebt,
      messages: await this.history(userId),
    };
  }

  private systemPrompt(compactContext: string): string {
    return [
      "Sos el asistente de contabilidad personal de OverApp.",
      "Hablás en español (Colombia), claro y concreto. Montos en COP.",
      "Usá las herramientas para números reales: no inventes saldos, tasas ni fechas de cancelación.",
      "Si falta un dato (tasa, cuota, saldo), preguntá o pedí un pantallazo.",
      "Esto es orientación, no asesoría financiera formal.",
      "Contexto actual del usuario:",
      compactContext,
    ].join("\n");
  }

  private async buildCompactContext(
    userId: string,
    year: number,
    month: number
  ): Promise<string> {
    const [summary, debts, recExp, recInc] = await Promise.all([
      this.monthlySummary.execute(userId, year, month),
      this.ledger.findDebtsByUser(userId),
      this.ledger.findRecurringExpenseRulesByUser(userId),
      this.ledger.findRecurringIncomeRulesByUser(userId),
    ]);

    const months: { year: number; month: number; income: number; expenses: number }[] =
      [];
    let cursor = { year, month };
    for (let i = 0; i < 6; i++) {
      const s = await this.monthlySummary.execute(
        userId,
        cursor.year,
        cursor.month
      );
      months.push({
        year: cursor.year,
        month: cursor.month,
        income: s.income,
        expenses: s.totalExpenses,
      });
      cursor = shiftMonth(cursor.year, cursor.month, -1);
    }

    return JSON.stringify(
      {
        mesConsultado: { year, month },
        mesActual: {
          ingresos: summary.income,
          gastos: summary.totalExpenses,
          disponible: summary.remaining,
          liquidezCuentas: summary.liquidity.total,
          topGastos: summary.expenseBreakdown.slice(0, 6),
          topIngresos: summary.incomeBreakdown.slice(0, 6),
        },
        historial6Meses: months,
        deudas: debts.map((d) => d.toJSON()),
        gastosRecurrentes: recExp
          .filter((r) => r.toJSON().isActive)
          .map((r) => {
            const j = r.toJSON();
            return {
              label: j.label,
              categoria: j.categoryName,
              monto: j.amount,
              dia: j.dayOfMonth,
            };
          }),
        ingresosRecurrentes: recInc
          .filter((r) => r.toJSON().isActive)
          .map((r) => {
            const j = r.toJSON();
            return {
              label: j.label,
              categoria: j.categoryName,
              monto: j.amount,
              dia: j.dayOfMonth,
            };
          }),
      },
      null,
      0
    );
  }

  private async runLlmLoop(
    userId: string,
    messages: ChatApiMessage[],
    apiKey: string,
    onExtracted: (debt: Record<string, unknown>) => void
  ): Promise<string> {
    const baseUrl = (
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    for (let step = 0; step < 6; step++) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new ServiceUnavailableException(
          err.slice(0, 280) || "El proveedor de IA no respondió"
        );
      }
      const data = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: ChatToolCall[];
          };
        }>;
      };
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new ServiceUnavailableException("Respuesta vacía de la IA");

      if (msg.tool_calls?.length) {
        messages.push({
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.tool_calls,
        });
        for (const call of msg.tool_calls) {
          const result = await this.execTool(
            userId,
            call.function.name,
            call.function.arguments,
            onExtracted
          );
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: result,
          });
        }
        continue;
      }

      const text = (msg.content || "").trim();
      return text || "No pude generar una respuesta. Probá de nuevo.";
    }
    return "Se alcanzó el límite de pasos del asistente. Pedí el análisis otra vez.";
  }

  private async execTool(
    userId: string,
    name: string,
    rawArgs: string,
    onExtracted: (debt: Record<string, unknown>) => void
  ): Promise<string> {
    let args: Record<string, unknown> = {};
    try {
      args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
    } catch {
      args = {};
    }

    if (name === "get_month_summary") {
      const year = Number(args.year);
      const month = Number(args.month);
      const s = await this.monthlySummary.execute(userId, year, month);
      return JSON.stringify({
        year: s.year,
        month: s.month,
        income: s.income,
        totalExpenses: s.totalExpenses,
        remaining: s.remaining,
        liquidity: s.liquidity,
        incomeBreakdown: s.incomeBreakdown,
        expenseBreakdown: s.expenseBreakdown,
      });
    }

    if (name === "get_range_overview") {
      const fromYear = Number(args.fromYear);
      const fromMonth = Number(args.fromMonth);
      const toYear = Number(args.toYear);
      const toMonth = Number(args.toMonth);
      const start = fromYear * 12 + fromMonth;
      const end = toYear * 12 + toMonth;
      if (end < start || end - start > 12) {
        return JSON.stringify({ error: "Rango inválido (máx. 12 meses)" });
      }
      const months: unknown[] = [];
      const catMap = new Map<string, number>();
      let cursor = { year: fromYear, month: fromMonth };
      while (cursor.year * 12 + cursor.month <= end) {
        const s = await this.monthlySummary.execute(
          userId,
          cursor.year,
          cursor.month
        );
        months.push({
          year: cursor.year,
          month: cursor.month,
          income: s.income,
          expenses: s.totalExpenses,
          remaining: s.remaining,
        });
        for (const b of s.expenseBreakdown) {
          catMap.set(b.categoryName, (catMap.get(b.categoryName) ?? 0) + b.total);
        }
        cursor = shiftMonth(cursor.year, cursor.month, 1);
      }
      const topGastos = [...catMap.entries()]
        .map(([categoryName, total]) => ({ categoryName, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);
      return JSON.stringify({ months, topGastos });
    }

    if (name === "list_debts") {
      const debts = await this.ledger.findDebtsByUser(userId);
      return JSON.stringify(debts.map((d) => d.toJSON()));
    }

    if (name === "simulate_payoff") {
      const debts = await this.ledger.findDebtsByUser(userId);
      const extraMonthly = Number(args.extraMonthly ?? 0) || 0;
      const extraBudget = Number(args.extraBudget ?? extraMonthly) || 0;
      const strategy =
        args.strategy === "snowball" ? "snowball" : "avalanche";
      const debtId = typeof args.debtId === "string" ? args.debtId : "";

      const toInput = (d: ReturnType<(typeof debts)[number]["toJSON"]>): DebtPayoffInput => ({
        name: d.name,
        balance: d.balance,
        interestRate: d.interestRate,
        interestRateType: d.interestRateType,
        installmentAmount: d.installmentAmount,
      });

      if (debtId) {
        const found = debts.find((d) => d.toJSON().id === debtId);
        if (!found) return JSON.stringify({ error: "Deuda no encontrada" });
        return JSON.stringify(
          simulateDebtPayoff({ ...toInput(found.toJSON()), extraMonthly })
        );
      }
      const active = debts.filter((d) => d.toJSON().isActive).map((d) => toInput(d.toJSON()));
      if (active.length === 0) {
        return JSON.stringify({ error: "No hay deudas activas" });
      }
      return JSON.stringify(simulateDebtPlan(active, extraBudget, strategy));
    }

    if (name === "report_extracted_debt") {
      const extracted = {
        name: String(args.name ?? "Deuda"),
        creditor: String(args.creditor ?? ""),
        balance: Number(args.balance ?? 0),
        principal: Number(args.principal ?? args.balance ?? 0),
        interestRate: Number(args.interestRate ?? 0),
        interestRateType: args.interestRateType === "EA" ? "EA" : "NM",
        installmentAmount: Number(args.installmentAmount ?? 0),
        dayOfMonth: Number(args.dayOfMonth ?? 1) || 1,
        totalInstallments:
          args.totalInstallments != null
            ? Number(args.totalInstallments)
            : null,
        paidInstallments: Number(args.paidInstallments ?? 0) || 0,
        notes: String(args.notes ?? ""),
      };
      onExtracted(extracted);
      return JSON.stringify({ ok: true, extracted });
    }

    return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
  }

  private async appendMessages(
    userId: string,
    incoming: Array<{
      role: "user" | "assistant";
      content: string;
      attachmentName: string;
      extractedDebt: Record<string, unknown> | null;
      createdAt: Date;
    }>
  ) {
    const uid = new Types.ObjectId(userId);
    const thread = await this.threadModel.findOne({ userId: uid }).exec();
    const next = [...(thread?.messages ?? []), ...incoming].slice(
      -MAX_THREAD_MESSAGES
    );
    await this.threadModel.findOneAndUpdate(
      { userId: uid },
      { $set: { messages: next } },
      { upsert: true }
    );
  }
}
