export type FinanceRecurringExpenseProps = {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  dayOfMonth: number;
  label: string;
  notes: string;
  isActive: boolean;
};
