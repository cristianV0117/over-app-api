import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceCategoriesDeleteUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(categoryId: string, userId: string): Promise<void> {
    const result = await this.ledger.deleteExpenseCategory(userId, categoryId);
    if (result === "not_found") {
      throw new NotFoundException("Categoría no encontrada");
    }
    if (result === "has_expenses") {
      throw new ConflictException(
        "No puedes eliminar la categoría mientras tenga gastos asociados"
      );
    }
    if (result === "has_recurring") {
      throw new ConflictException(
        "No puedes eliminar la categoría mientras haya gastos recurrentes que la usen"
      );
    }
  }
}
