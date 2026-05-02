import { ExpenseCategory } from "../expense-category";
import { FinanceExpense } from "../finance-expense";
import { FinanceRecurringExpense } from "../finance-recurring-expense";
import { IncomeCategory } from "../income-category";
import { FinanceIncomeLine } from "../finance-income-line";

export type FinanceCategoryDeleteResult =
  | "deleted"
  | "not_found"
  | "has_expenses"
  | "has_recurring";

export type FinanceIncomeCategoryDeleteResult =
  | "deleted"
  | "not_found"
  | "has_incomes";

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
}
