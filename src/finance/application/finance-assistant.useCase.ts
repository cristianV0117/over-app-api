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
import {
  applyLedgerImport,
  emptyLedger,
  ledgerHasItems,
  mergeLedgers,
  normalizeProposedLedger,
  parseDay,
  type ExtractedLedger,
} from "./finance-assistant-ledger";

const MAX_THREAD_MESSAGES = 40;

export type AssistantMessageDto = {
  role: "user" | "assistant";
  content: string;
  attachmentName?: string;
  extractedDebt?: Record<string, unknown> | null;
  extractedLedger?: ExtractedLedger | null;
  createdAt: string;
};

type ExtractSink = {
  debt: Record<string, unknown> | null;
  ledger: ExtractedLedger;
  applied: boolean;
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
  {
    type: "function",
    function: {
      name: "list_categories",
      description:
        "Lista categorías de gasto e ingreso del usuario (id y nombre).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_ledger_import",
      description:
        "Propone un lote extraído de un extracto para que el usuario lo revise y confirme. No guarda todavía. Usala con extractos, PDF o Excel. No dupliques pagos que ya existen como gasto/ingreso recurrente.",
      parameters: {
        type: "object",
        properties: {
          expenses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                date: { type: "string", description: "YYYY-MM-DD" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "date", "categoryName"],
            },
          },
          incomes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                date: { type: "string", description: "YYYY-MM-DD" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "date", "categoryName"],
            },
          },
          expenseCategories: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          },
          incomeCategories: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          },
          recurringExpenses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                dayOfMonth: { type: "integer" },
                label: { type: "string" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "dayOfMonth", "categoryName"],
            },
          },
          recurringIncomes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                dayOfMonth: { type: "integer" },
                label: { type: "string" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "dayOfMonth", "categoryName"],
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_ledger_import",
      description:
        "Crea de verdad en la cuenta del usuario el lote (categorías, gastos, ingresos y/o recurrentes). Solo cuando el usuario lo pida explícitamente (guardá, creá, registrá, sí dale). Si la categoría no existe, la crea.",
      parameters: {
        type: "object",
        properties: {
          expenses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                date: { type: "string" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "date", "categoryName"],
            },
          },
          incomes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                date: { type: "string" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "date", "categoryName"],
            },
          },
          expenseCategories: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          },
          incomeCategories: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" } },
              required: ["name"],
            },
          },
          recurringExpenses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                dayOfMonth: { type: "integer" },
                label: { type: "string" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "dayOfMonth", "categoryName"],
            },
          },
          recurringIncomes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: { type: "number" },
                dayOfMonth: { type: "integer" },
                label: { type: "string" },
                notes: { type: "string" },
                categoryName: { type: "string" },
              },
              required: ["amount", "dayOfMonth", "categoryName"],
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_expense",
      description:
        "Registra un gasto puntual. Usala si el usuario pide crear uno solo. Crea la categoría si no existe.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD" },
          notes: { type: "string" },
          categoryName: { type: "string" },
        },
        required: ["amount", "date", "categoryName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_income",
      description:
        "Registra un ingreso puntual. Crea la categoría si no existe.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD" },
          notes: { type: "string" },
          categoryName: { type: "string" },
        },
        required: ["amount", "date", "categoryName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_expense_category",
      description: "Crea una categoría de gasto.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_income_category",
      description: "Crea una categoría de ingreso.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_recurring_expense",
      description: "Crea un gasto recurrente mensual. Crea la categoría si no existe.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          dayOfMonth: { type: "integer" },
          label: { type: "string" },
          notes: { type: "string" },
          categoryName: { type: "string" },
        },
        required: ["amount", "dayOfMonth", "categoryName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_recurring_income",
      description: "Crea un ingreso recurrente mensual. Crea la categoría si no existe.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          dayOfMonth: { type: "integer" },
          label: { type: "string" },
          notes: { type: "string" },
          categoryName: { type: "string" },
        },
        required: ["amount", "dayOfMonth", "categoryName"],
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
      extractedLedger: (m.extractedLedger as ExtractedLedger | null) ?? null,
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
    extractedLedger: ExtractedLedger | null;
    applied: boolean;
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
        "\nHay archivos adjuntos. Revisalos todos." +
        " Si es un extracto de movimientos, extraé cada gasto e ingreso (fecha, monto, descripción) y llamá propose_ledger_import." +
        " Reutilizá categorías existentes del contexto. Si falta una, proponela." +
        " No vuelvas a cargar pagos que ya existen como gasto o ingreso recurrente." +
        " Si alguno es crédito o deuda, extraé tasa, cuota, saldo y plazo y llamá report_extracted_debt por cada uno.";
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

    const extracted: ExtractSink = {
      debt: null,
      ledger: emptyLedger(),
      applied: false,
    };
    const reply = await this.runLlmLoop(userId, llmMessages, apiKey, extracted);
    const ledger = ledgerHasItems(extracted.ledger) ? extracted.ledger : null;

    const now = new Date();
    await this.appendMessages(userId, [
      {
        role: "user",
        content: userText,
        attachmentName,
        extractedDebt: null,
        extractedLedger: null,
        createdAt: now,
      },
      {
        role: "assistant",
        content: reply,
        attachmentName: "",
        extractedDebt: extracted.debt,
        extractedLedger: ledger,
        createdAt: new Date(),
      },
    ]);

    return {
      reply,
      extractedDebt: extracted.debt,
      extractedLedger: ledger,
      applied: extracted.applied,
      messages: await this.history(userId),
    };
  }

  private systemPrompt(compactContext: string): string {
    return [
      "Sos el asistente de contabilidad personal de OverApp.",
      "Hablás en español (Colombia), claro y concreto. Montos en COP.",
      "Usá las herramientas para números reales: no inventes saldos, tasas ni fechas.",
      "Podés leer y también escribir en la cuenta del usuario.",
      "Si el usuario dice que HOY (o una fecha) gastó/pagó/compró o le entró plata, REGISTRALO YA con apply_ledger_import o create_expense/create_income. No pidas confirmación ni uses propose_ledger_import en ese caso.",
      "Ejemplo: «hoy gasté 20 mil en gasolina y 50 mil en mercado» → dos gastos con fecha = hoy del contexto, categorías Gasolina/Mercado (o las que existan más parecidas).",
      "Montos en Colombia: «20 mil» = 20000, «1.2 millones» = 1200000. Fecha por defecto: el campo hoy del contexto.",
      "Extractos, PDF o Excel: extraé movimientos y llamá propose_ledger_import (el usuario confirma en la app). No uses apply_ledger_import en el mismo turno del extracto.",
      "Si el usuario dice explícitamente que cree/guarde/registre un lote del extracto, usá apply_ledger_import.",
      "Reutilizá categorías existentes (mismo nombre, ignorá mayúsculas y tildes). Si no existe, proponé o creá la categoría.",
      "No dupliques recurrentes ya listados en el contexto. Un pago de arriendo/internet que ya es recurrente no lo cargues otra vez como gasto suelto salvo que el usuario lo pida.",
      "Si falta un dato (tasa, cuota, saldo, categoría), preguntá o pedí un pantallazo.",
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
    const [summary, debts, recExp, recInc, expCats, incCats] = await Promise.all([
      this.monthlySummary.execute(userId, year, month),
      this.ledger.findDebtsByUser(userId),
      this.ledger.findRecurringExpenseRulesByUser(userId),
      this.ledger.findRecurringIncomeRulesByUser(userId),
      this.ledger.findExpenseCategoriesByUser(userId),
      this.ledger.findIncomeCategoriesByUser(userId),
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
        hoy: new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Bogota",
        }).format(new Date()),
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
        categoriasGasto: expCats.map((c) => ({ id: c.id, name: c.name })),
        categoriasIngreso: incCats.map((c) => ({ id: c.id, name: c.name })),
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
    extracted: ExtractSink
  ): Promise<string> {
    const baseUrl = (
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    for (let step = 0; step < 8; step++) {
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
            extracted
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
    extracted: ExtractSink
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
      const debt = {
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
      extracted.debt = debt;
      return JSON.stringify({ ok: true, extracted: debt });
    }

    if (name === "list_categories") {
      const [exp, inc] = await Promise.all([
        this.ledger.findExpenseCategoriesByUser(userId),
        this.ledger.findIncomeCategoriesByUser(userId),
      ]);
      return JSON.stringify({
        expenseCategories: exp.map((c) => ({ id: c.id, name: c.name })),
        incomeCategories: inc.map((c) => ({ id: c.id, name: c.name })),
      });
    }

    if (name === "propose_ledger_import" || name === "apply_ledger_import") {
      const [exp, inc] = await Promise.all([
        this.ledger.findExpenseCategoriesByUser(userId),
        this.ledger.findIncomeCategoriesByUser(userId),
      ]);
      const draft = normalizeProposedLedger(
        args,
        exp.map((c) => ({ id: c.id, name: c.name })),
        inc.map((c) => ({ id: c.id, name: c.name }))
      );
      if (!ledgerHasItems(draft)) {
        return JSON.stringify({
          ok: false,
          error: "No hay ítems válidos (falta monto, fecha o categoría)",
        });
      }
      if (name === "propose_ledger_import") {
        extracted.ledger = mergeLedgers(extracted.ledger, draft);
        return JSON.stringify({
          ok: true,
          proposed: true,
          counts: {
            expenses: draft.expenses.length,
            incomes: draft.incomes.length,
            expenseCategories: draft.expenseCategories.length,
            incomeCategories: draft.incomeCategories.length,
            recurringExpenses: draft.recurringExpenses.length,
            recurringIncomes: draft.recurringIncomes.length,
          },
          note: "El usuario verá una tabla para confirmar. No guardaste nada todavía.",
        });
      }
      const result = await applyLedgerImport(this.ledger, userId, draft);
      extracted.applied = true;
      return JSON.stringify({ ok: true, applied: true, ...result });
    }

    if (name === "create_expense" || name === "create_income") {
      const date = parseDay(args.date ?? args.occurredAt ?? args.receivedAt);
      const amount = Number(args.amount);
      const categoryName = String(args.categoryName ?? "").trim();
      if (!date || !Number.isFinite(amount) || amount <= 0 || !categoryName) {
        return JSON.stringify({
          error: "Faltan amount, date (YYYY-MM-DD) o categoryName",
        });
      }
      const draft =
        name === "create_expense"
          ? {
              ...emptyLedger(),
              expenses: [
                {
                  amount: Math.round(amount),
                  date,
                  notes: String(args.notes ?? "").trim(),
                  categoryName,
                  categoryId: null,
                },
              ],
            }
          : {
              ...emptyLedger(),
              incomes: [
                {
                  amount: Math.round(amount),
                  date,
                  notes: String(args.notes ?? "").trim(),
                  categoryName,
                  categoryId: null,
                },
              ],
            };
      const result = await applyLedgerImport(this.ledger, userId, draft);
      extracted.applied = true;
      return JSON.stringify({ ok: true, applied: true, ...result });
    }

    if (name === "create_expense_category" || name === "create_income_category") {
      const catName = String(args.name ?? "").trim().slice(0, 80);
      if (!catName) return JSON.stringify({ error: "Falta name" });
      const result = await applyLedgerImport(
        this.ledger,
        userId,
        name === "create_expense_category"
          ? { ...emptyLedger(), expenseCategories: [{ name: catName }] }
          : { ...emptyLedger(), incomeCategories: [{ name: catName }] }
      );
      extracted.applied = true;
      return JSON.stringify({ ok: true, applied: true, ...result });
    }

    if (name === "create_recurring_expense" || name === "create_recurring_income") {
      const amount = Number(args.amount);
      const categoryName = String(args.categoryName ?? "").trim();
      if (!Number.isFinite(amount) || amount <= 0 || !categoryName) {
        return JSON.stringify({ error: "Faltan amount o categoryName" });
      }
      const row = {
        amount: Math.round(amount),
        dayOfMonth: Number(args.dayOfMonth ?? 1) || 1,
        label: String(args.label ?? categoryName).trim().slice(0, 120),
        notes: String(args.notes ?? "").trim(),
        categoryName,
        categoryId: null,
      };
      const result = await applyLedgerImport(
        this.ledger,
        userId,
        name === "create_recurring_expense"
          ? { ...emptyLedger(), recurringExpenses: [row] }
          : { ...emptyLedger(), recurringIncomes: [row] }
      );
      extracted.applied = true;
      return JSON.stringify({ ok: true, applied: true, ...result });
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
      extractedLedger: ExtractedLedger | null;
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
