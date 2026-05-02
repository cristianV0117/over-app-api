import { Inject, Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceExpensesDeleteUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(expenseId: string, userId: string): Promise<void> {
    if (expenseId.startsWith("recurring:")) {
      throw new BadRequestException(
        "Para quitar un gasto recurrente del mes, desactívalo o bórralo en «Gastos recurrentes»"
      );
    }
    const ok = await this.ledger.deleteExpense(userId, expenseId);
    if (!ok) {
      throw new NotFoundException("Gasto no encontrado");
    }
  }
}
