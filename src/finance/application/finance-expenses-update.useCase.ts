import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceExpenseUpdateDto } from "../infrastructure/dtos/finance-expense-update.dto";
import { FinanceExpense } from "src/finance/domain/finance-expense";

const RECURRING_PREFIX = "recurring:";

@Injectable()
export class FinanceExpensesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    expenseId: string,
    body: FinanceExpenseUpdateDto,
    userId: string,
    monthContext?: { year: number; month: number }
  ): Promise<FinanceExpense> {
    if (expenseId.startsWith(RECURRING_PREFIX)) {
      if (body.paid === undefined) {
        throw new BadRequestException(
          "Para gastos recurrentes solo se actualiza «pagado»; envía { paid: true/false } y query ?year=&month="
        );
      }
      if (!monthContext) {
        throw new BadRequestException(
          "Añade ?year=YYYY&month=M para marcar pagado el gasto recurrente de ese mes"
        );
      }
      const hasOther =
        body.categoryId !== undefined ||
        body.amount !== undefined ||
        body.occurredAt !== undefined ||
        body.notes !== undefined;
      if (hasOther) {
        throw new BadRequestException(
          "En gastos recurrentes del mes solo puedes cambiar si está pagado"
        );
      }
      const ruleId = expenseId.slice(RECURRING_PREFIX.length);
      try {
        await this.ledger.setRecurringExpensePaidForMonth(
          userId,
          ruleId,
          monthContext.year,
          monthContext.month,
          body.paid
        );
      } catch (e) {
        if (e instanceof Error && e.message.includes("no encontrada")) {
          throw new NotFoundException(e.message);
        }
        throw e;
      }
      const list = await this.ledger.findExpensesForMonth(
        userId,
        monthContext.year,
        monthContext.month
      );
      const row = list.find((line) => line.toJSON().id === expenseId);
      if (!row) throw new NotFoundException("Gasto no encontrado");
      return row;
    }

    if (body.categoryId) {
      const categories = await this.ledger.findExpenseCategoriesByUser(userId);
      if (!categories.some((c) => c.id === body.categoryId)) {
        throw new NotFoundException("Categoría no encontrada");
      }
    }
    try {
      const updated = await this.ledger.updateExpense(userId, expenseId, {
        categoryId: body.categoryId,
        amount: body.amount,
        occurredAt: body.occurredAt,
        notes: body.notes,
        paid: body.paid,
      });
      if (!updated) {
        throw new NotFoundException("Gasto no encontrado");
      }
      return updated;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (e instanceof Error && e.message === "Categoría no encontrada") {
        throw new NotFoundException("Categoría no encontrada");
      }
      throw e;
    }
  }
}
