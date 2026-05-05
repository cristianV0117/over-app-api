import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

@Injectable()
export class FinanceIncomesDeleteUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(incomeId: string, userId: string): Promise<void> {
    if (incomeId.startsWith("recurring-income:")) {
      throw new BadRequestException(
        "Para quitar un ingreso recurrente del mes, desactívalo o bórralo en «Ingresos recurrentes»"
      );
    }
    const ok = await this.ledger.deleteIncome(userId, incomeId);
    if (!ok) {
      throw new NotFoundException("Ingreso no encontrado");
    }
  }
}
