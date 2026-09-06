import { BadRequestException, Injectable } from "@nestjs/common";
import { FinanceMonthlySummaryUseCase } from "./finance-monthly-summary.useCase";

export type FinanceExportRow = {
  tipo: "ingreso" | "gasto";
  year: number;
  month: number;
  fecha: string;
  categoria: string;
  etiqueta: string;
  monto: number;
  notas: string;
  recurrente: boolean;
};

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

@Injectable()
export class FinanceExportUseCase {
  constructor(private readonly monthlySummary: FinanceMonthlySummaryUseCase) {}

  async execute(
    userId: string,
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number
  ): Promise<FinanceExportRow[]> {
    const start = fromYear * 12 + fromMonth;
    const end = toYear * 12 + toMonth;
    if (end < start) {
      throw new BadRequestException("El rango de fechas es inválido");
    }
    if (end - start > 36) {
      throw new BadRequestException("El rango máximo es 36 meses");
    }

    const rows: FinanceExportRow[] = [];
    let cursor = { year: fromYear, month: fromMonth };
    while (cursor.year * 12 + cursor.month <= end) {
      const summary = await this.monthlySummary.execute(
        userId,
        cursor.year,
        cursor.month
      );
      for (const inc of summary.incomes) {
        rows.push({
          tipo: "ingreso",
          year: cursor.year,
          month: cursor.month,
          fecha: new Date(inc.receivedAt).toISOString().slice(0, 10),
          categoria: inc.categoryName ?? "",
          etiqueta: inc.label ?? "",
          monto: inc.amount,
          notas: inc.notes ?? "",
          recurrente: !!inc.isRecurring,
        });
      }
      for (const exp of summary.expenses) {
        rows.push({
          tipo: "gasto",
          year: cursor.year,
          month: cursor.month,
          fecha: new Date(exp.occurredAt).toISOString().slice(0, 10),
          categoria: exp.categoryName ?? "",
          etiqueta: exp.label ?? "",
          monto: exp.amount,
          notas: exp.notes ?? "",
          recurrente: !!exp.isRecurring,
        });
      }
      cursor = shiftMonth(cursor.year, cursor.month, 1);
    }
    return rows;
  }

  toCsv(rows: FinanceExportRow[]): string {
    const header = [
      "tipo",
      "anio",
      "mes",
      "fecha",
      "categoria",
      "etiqueta",
      "monto",
      "notas",
      "recurrente",
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.tipo,
          r.year,
          r.month,
          r.fecha,
          csvEscape(r.categoria),
          csvEscape(r.etiqueta),
          r.monto,
          csvEscape(r.notas),
          r.recurrente ? "si" : "no",
        ].join(",")
      ),
    ];
    return `\uFEFF${lines.join("\n")}\n`;
  }
}
