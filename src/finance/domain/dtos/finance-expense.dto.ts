export type FinanceExpenseProps = {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  occurredAt: Date;
  notes?: string;
  /** Texto corto p. ej. "Gimnasio" (solo gastos proyectados desde regla recurrente) */
  label?: string;
  isRecurring?: boolean;
  recurringRuleId?: string;
  paid?: boolean;
};
