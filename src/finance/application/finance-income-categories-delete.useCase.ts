import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceIncomeCategoriesDeleteUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(categoryId: string, userId: string): Promise<void> {
    const result = await this.ledger.deleteIncomeCategory(userId, categoryId);
    if (result === "not_found") {
      throw new NotFoundException("Categoría de ingreso no encontrada");
    }
    if (result === "has_incomes") {
      throw new ConflictException(
        "No puedes eliminar la categoría mientras tenga ingresos asociados"
      );
    }
    if (result === "has_recurring") {
      throw new ConflictException(
        "No puedes eliminar la categoría mientras haya ingresos recurrentes que la usen"
      );
    }
  }
}
