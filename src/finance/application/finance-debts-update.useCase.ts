import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { FinanceDebt } from "src/finance/domain/finance-debt";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceDebtUpdateDto } from "../infrastructure/dtos/finance-debt-update.dto";

@Injectable()
export class FinanceDebtsUpdateUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(
    id: string,
    body: FinanceDebtUpdateDto,
    userId: string
  ): Promise<FinanceDebt> {
    const patch: Parameters<FinanceLedgerRepository["updateDebt"]>[2] = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.creditor !== undefined) patch.creditor = body.creditor;
    if (body.balance !== undefined) patch.balance = body.balance;
    if (body.principal !== undefined) patch.principal = body.principal;
    if (body.interestRate !== undefined) patch.interestRate = body.interestRate;
    if (body.interestRateType !== undefined)
      patch.interestRateType = body.interestRateType;
    if (body.installmentAmount !== undefined)
      patch.installmentAmount = body.installmentAmount;
    if (body.dayOfMonth !== undefined) patch.dayOfMonth = body.dayOfMonth;
    if (body.totalInstallments !== undefined)
      patch.totalInstallments = body.totalInstallments;
    if (body.paidInstallments !== undefined)
      patch.paidInstallments = body.paidInstallments;
    if (body.startDate !== undefined) {
      patch.startDate =
        body.startDate === null || body.startDate === ""
          ? null
          : new Date(body.startDate);
    }
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.isActive !== undefined) patch.isActive = body.isActive;

    const updated = await this.ledger.updateDebt(userId, id, patch);
    if (!updated) throw new NotFoundException("Deuda no encontrada");
    return updated;
  }
}
