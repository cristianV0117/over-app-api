import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceIncomeUpdateDto } from "../infrastructure/dtos/finance-income-update.dto";
import { FinanceIncomeLine } from "src/finance/domain/finance-income-line";

const RECURRING_INCOME_PREFIX = "recurring-income:";

@Injectable()
export class FinanceIncomesUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    incomeId: string,
    body: FinanceIncomeUpdateDto,
    userId: string,
    monthContext?: { year: number; month: number }
  ): Promise<FinanceIncomeLine> {
    if (incomeId.startsWith(RECURRING_INCOME_PREFIX)) {
      if (body.received === undefined) {
        throw new BadRequestException(
          "Para ingresos recurrentes solo se actualiza «cobrado»; envía { received: true/false } y query ?year=&month="
        );
      }
      if (!monthContext) {
        throw new BadRequestException(
          "Añade ?year=YYYY&month=M para marcar cobrado el ingreso recurrente de ese mes"
        );
      }
      const hasOther =
        body.categoryId !== undefined ||
        body.amount !== undefined ||
        body.receivedAt !== undefined ||
        body.notes !== undefined;
      if (hasOther) {
        throw new BadRequestException(
          "En ingresos recurrentes del mes solo puedes cambiar si fue cobrado"
        );
      }
      const ruleId = incomeId.slice(RECURRING_INCOME_PREFIX.length);
      try {
        await this.ledger.setRecurringIncomeReceivedForMonth(
          userId,
          ruleId,
          monthContext.year,
          monthContext.month,
          body.received
        );
      } catch (e) {
        if (e instanceof Error && e.message.includes("no encontrada")) {
          throw new NotFoundException(e.message);
        }
        throw e;
      }
      const list = await this.ledger.findIncomesForMonth(
        userId,
        monthContext.year,
        monthContext.month
      );
      const row = list.find((line) => line.toJSON().id === incomeId);
      if (!row) throw new NotFoundException("Ingreso no encontrado");
      return row;
    }

    if (body.categoryId) {
      const categories = await this.ledger.findIncomeCategoriesByUser(userId);
      if (!categories.some((c) => c.id === body.categoryId)) {
        throw new NotFoundException("Categoría de ingreso no encontrada");
      }
    }
    if (body.received !== undefined) {
      throw new BadRequestException(
        "El campo «received» solo aplica a ingresos recurrentes del mes"
      );
    }
    try {
      const updated = await this.ledger.updateIncome(userId, incomeId, {
        categoryId: body.categoryId,
        amount: body.amount,
        receivedAt: body.receivedAt,
        notes: body.notes,
      });
      if (!updated) {
        throw new NotFoundException("Ingreso no encontrado");
      }
      return updated;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      if (
        e instanceof Error &&
        e.message === "Categoría de ingreso no encontrada"
      ) {
        throw new NotFoundException("Categoría de ingreso no encontrada");
      }
      throw e;
    }
  }
}
