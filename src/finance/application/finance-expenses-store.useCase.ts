import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceExpenseStoreDto } from "../infrastructure/dtos/finance-expense-store.dto";
import { FinanceExpense } from "src/finance/domain/finance-expense";

@Injectable()
export class FinanceExpensesStoreUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    body: FinanceExpenseStoreDto,
    userId: string
  ): Promise<FinanceExpense> {
    const categories = await this.ledger.findExpenseCategoriesByUser(userId);
    if (!categories.some((c) => c.id === body.categoryId)) {
      throw new NotFoundException("Categoría no encontrada");
    }
    return this.ledger.createExpense(
      userId,
      body.categoryId,
      body.amount,
      body.occurredAt,
      body.notes
    );
  }
}
