import { Injectable } from "@nestjs/common";
import { FinanceMonthlySummaryUseCase } from "./finance-monthly-summary.useCase";

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

@Injectable()
export class FinanceRangeOverviewUseCase {
  constructor(private readonly monthlySummary: FinanceMonthlySummaryUseCase) {}

  async execute(
    userId: string,
    year: number,
    month: number,
    monthsBack = 12
  ) {
    const count = Math.min(24, Math.max(3, monthsBack));
    const points: {
      year: number;
      month: number;
      income: number;
      expenses: number;
      remaining: number;
    }[] = [];
    let cursor = { year, month };
    for (let i = 0; i < count; i++) {
      const s = await this.monthlySummary.execute(
        userId,
        cursor.year,
        cursor.month
      );
      points.push({
        year: cursor.year,
        month: cursor.month,
        income: s.income,
        expenses: s.totalExpenses,
        remaining: s.remaining,
      });
      cursor = shiftMonth(cursor.year, cursor.month, -1);
    }
    points.reverse();
    const current = await this.monthlySummary.execute(userId, year, month);
    return {
      months: points,
      expenseBreakdown: current.expenseBreakdown,
      incomeBreakdown: current.incomeBreakdown,
    };
  }
}
