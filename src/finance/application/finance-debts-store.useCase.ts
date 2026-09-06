import { Inject, Injectable } from "@nestjs/common";
import { FinanceDebt } from "src/finance/domain/finance-debt";
import { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";
import { FinanceDebtStoreDto } from "../infrastructure/dtos/finance-debt-store.dto";

@Injectable()
export class FinanceDebtsStoreUseCase {
  constructor(
    @Inject("FinanceLedgerRepository")
    private readonly ledger: FinanceLedgerRepository
  ) {}

  async execute(body: FinanceDebtStoreDto, userId: string): Promise<FinanceDebt> {
    return this.ledger.createDebt(userId, {
      name: body.name,
      creditor: body.creditor,
      balance: body.balance,
      principal: body.principal,
      interestRate: body.interestRate,
      interestRateType: body.interestRateType,
      installmentAmount: body.installmentAmount,
      dayOfMonth: body.dayOfMonth,
      totalInstallments: body.totalInstallments,
      paidInstallments: body.paidInstallments,
      startDate: body.startDate ? new Date(body.startDate) : null,
      notes: body.notes,
      isActive: body.isActive,
    });
  }
}
