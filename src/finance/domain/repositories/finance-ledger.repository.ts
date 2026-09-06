import { ExpenseCategory } from "../expense-category";
import { FinanceDebt } from "../finance-debt";
import type { FinanceInterestRateType } from "../dtos/finance-debt.dto";
import { FinanceExpense } from "../finance-expense";
import { FinanceRecurringExpense } from "../finance-recurring-expense";
import { FinanceRecurringIncome } from "../finance-recurring-income";
import { IncomeCategory } from "../income-category";
import { FinanceIncomeLine } from "../finance-income-line";

export type FinanceDebtWrite = {
  name: string;
  creditor?: string;
  balance: number;
  principal?: number;
  interestRate: number;
  interestRateType: FinanceInterestRateType;
  installmentAmount: number;
  dayOfMonth: number;
  totalInstallments?: number | null;
  paidInstallments?: number;
  startDate?: Date | null;
  notes?: string;
  isActive?: boolean;
};

export type FinanceCategoryDeleteResult =
  | "deleted"
  | "not_found"
  | "has_expenses"
  | "has_recurring";

export type FinanceIncomeCategoryDeleteResult =
  | "deleted"
  | "not_found"
  | "has_incomes"
  | "has_recurring";

export type FinanceLiquidityAccount = {
  label: string;
  amount: number;
};

export interface FinanceLedgerRepository {
  findIncomeCategoriesByUser(userId: string): Promise<IncomeCategory[]>;
  createIncomeCategory(userId: string, name: string): Promise<IncomeCategory>;
  updateIncomeCategory(
    userId: string,
    id: string,
    name: string
  ): Promise<IncomeCategory | null>;
  deleteIncomeCategory(
    userId: string,
    id: string
  ): Promise<FinanceIncomeCategoryDeleteResult>;
  createIncome(
    userId: string,
    categoryId: string,
    amount: number,
    receivedAt: Date,
    notes?: string
  ): Promise<FinanceIncomeLine>;
  findIncomesForMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<FinanceIncomeLine[]>;
  updateIncome(
    userId: string,
    id: string,
    patch: {
      categoryId?: string;
      amount?: number;
      receivedAt?: Date;
      notes?: string;
      received?: boolean;
    }
  ): Promise<FinanceIncomeLine | null>;
  deleteIncome(userId: string, id: string): Promise<boolean>;

  findExpenseCategoriesByUser(userId: string): Promise<ExpenseCategory[]>;
  createExpenseCategory(userId: string, name: string): Promise<ExpenseCategory>;
  updateExpenseCategory(
    userId: string,
    id: string,
    name: string
  ): Promise<ExpenseCategory | null>;
  deleteExpenseCategory(
    userId: string,
    id: string
  ): Promise<FinanceCategoryDeleteResult>;
  createExpense(
    userId: string,
    categoryId: string,
    amount: number,
    occurredAt: Date,
    notes?: string
  ): Promise<FinanceExpense>;
  findExpensesForMonth(
    userId: string,
    year: number,
    month: number
  ): Promise<FinanceExpense[]>;
  updateExpense(
    userId: string,
    id: string,
    patch: {
      categoryId?: string;
      amount?: number;
      occurredAt?: Date;
      notes?: string;
      paid?: boolean;
    }
  ): Promise<FinanceExpense | null>;
  deleteExpense(userId: string, id: string): Promise<boolean>;

  findRecurringExpenseRulesByUser(
    userId: string
  ): Promise<FinanceRecurringExpense[]>;
  createRecurringExpenseRule(
    userId: string,
    data: {
      categoryId: string;
      amount: number;
      dayOfMonth: number;
      label?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<FinanceRecurringExpense>;
  updateRecurringExpenseRule(
    userId: string,
    id: string,
    patch: {
      categoryId?: string;
      amount?: number;
      dayOfMonth?: number;
      label?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<FinanceRecurringExpense | null>;
  deleteRecurringExpenseRule(userId: string, id: string): Promise<boolean>;

  getLiquidityAccounts(userId: string): Promise<FinanceLiquidityAccount[]>;
  replaceLiquidityAccounts(
    userId: string,
    accounts: FinanceLiquidityAccount[]
  ): Promise<FinanceLiquidityAccount[]>;

  setRecurringExpensePaidForMonth(
    userId: string,
    recurringRuleId: string,
    year: number,
    month: number,
    paid: boolean
  ): Promise<void>;

  findRecurringIncomeRulesByUser(
    userId: string
  ): Promise<FinanceRecurringIncome[]>;
  createRecurringIncomeRule(
    userId: string,
    data: {
      categoryId: string;
      amount: number;
      dayOfMonth: number;
      label?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<FinanceRecurringIncome>;
  updateRecurringIncomeRule(
    userId: string,
    id: string,
    patch: {
      categoryId?: string;
      amount?: number;
      dayOfMonth?: number;
      label?: string;
      notes?: string;
      isActive?: boolean;
    }
  ): Promise<FinanceRecurringIncome | null>;
  deleteRecurringIncomeRule(userId: string, id: string): Promise<boolean>;

  setRecurringIncomeReceivedForMonth(
    userId: string,
    recurringRuleId: string,
    year: number,
    month: number,
    received: boolean
  ): Promise<void>;

  findDebtsByUser(userId: string): Promise<FinanceDebt[]>;
  createDebt(userId: string, data: FinanceDebtWrite): Promise<FinanceDebt>;
  updateDebt(
    userId: string,
    id: string,
    patch: Partial<FinanceDebtWrite>
  ): Promise<FinanceDebt | null>;
  deleteDebt(userId: string, id: string): Promise<boolean>;
}
