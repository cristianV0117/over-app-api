export type FinanceIncomeLineProps = {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  receivedAt: Date;
  notes?: string;
  /** Texto corto p. ej. "Nómina" (solo líneas proyectadas desde regla recurrente) */
  label?: string;
  isRecurring?: boolean;
  recurringRuleId?: string;
  /** Cobrado en el mes (reglas recurrentes sintéticas; para ingresos reales suele ser implícito) */
  received?: boolean;
};
