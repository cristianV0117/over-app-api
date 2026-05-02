export type FinanceIncomeLineProps = {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  receivedAt: Date;
  notes?: string;
};
