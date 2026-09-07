import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import {
  FinanceIncomeCategoryModel,
  FinanceIncomeCategorySchema,
} from "src/shared/infrastructure/mongo/schemas/finance-income-category.schema";
import {
  FinanceIncomeModel,
  FinanceIncomeSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-income.schema";
import {
  FinanceExpenseCategoryModel,
  FinanceExpenseCategorySchema,
} from "src/shared/infrastructure/mongo/schemas/finance-expense-category.schema";
import {
  FinanceExpenseModel,
  FinanceExpenseSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-expense.schema";
import {
  FinanceRecurringExpenseModel,
  FinanceRecurringExpenseSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-expense.schema";
import {
  FinanceRecurringExpensePaidModel,
  FinanceRecurringExpensePaidSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-expense-paid.schema";
import {
  FinanceRecurringIncomeModel,
  FinanceRecurringIncomeSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-income.schema";
import {
  FinanceRecurringIncomeReceivedModel,
  FinanceRecurringIncomeReceivedSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-income-received.schema";
import {
  FinanceLiquidityModel,
  FinanceLiquiditySchema,
} from "src/shared/infrastructure/mongo/schemas/finance-liquidity.schema";
import {
  FinanceDebtModel,
  FinanceDebtSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-debt.schema";
import {
  FinanceAssistantThreadModel,
  FinanceAssistantThreadSchema,
} from "src/shared/infrastructure/mongo/schemas/finance-assistant-thread.schema";
import { FinanceController } from "../controllers/finance.controller";
import { FinanceLedgerImplementation } from "../implementations/mongo/finance-ledger.implementation";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { FinanceCategoriesIndexUseCase } from "src/finance/application/finance-categories-index.useCase";
import { FinanceCategoriesStoreUseCase } from "src/finance/application/finance-categories-store.useCase";
import { FinanceCategoriesUpdateUseCase } from "src/finance/application/finance-categories-update.useCase";
import { FinanceCategoriesDeleteUseCase } from "src/finance/application/finance-categories-delete.useCase";
import { FinanceIncomeCategoriesIndexUseCase } from "src/finance/application/finance-income-categories-index.useCase";
import { FinanceIncomeCategoriesStoreUseCase } from "src/finance/application/finance-income-categories-store.useCase";
import { FinanceIncomeCategoriesUpdateUseCase } from "src/finance/application/finance-income-categories-update.useCase";
import { FinanceIncomeCategoriesDeleteUseCase } from "src/finance/application/finance-income-categories-delete.useCase";
import { FinanceIncomesIndexMonthUseCase } from "src/finance/application/finance-incomes-index-month.useCase";
import { FinanceIncomesStoreUseCase } from "src/finance/application/finance-incomes-store.useCase";
import { FinanceIncomesUpdateUseCase } from "src/finance/application/finance-incomes-update.useCase";
import { FinanceIncomesDeleteUseCase } from "src/finance/application/finance-incomes-delete.useCase";
import { FinanceExpensesIndexMonthUseCase } from "src/finance/application/finance-expenses-index-month.useCase";
import { FinanceExpensesStoreUseCase } from "src/finance/application/finance-expenses-store.useCase";
import { FinanceExpensesUpdateUseCase } from "src/finance/application/finance-expenses-update.useCase";
import { FinanceExpensesDeleteUseCase } from "src/finance/application/finance-expenses-delete.useCase";
import { FinanceMonthlySummaryUseCase } from "src/finance/application/finance-monthly-summary.useCase";
import { FinanceLiquidityReplaceUseCase } from "src/finance/application/finance-liquidity-replace.useCase";
import { FinanceRecurringExpensesIndexUseCase } from "src/finance/application/finance-recurring-expenses-index.useCase";
import { FinanceRecurringExpensesStoreUseCase } from "src/finance/application/finance-recurring-expenses-store.useCase";
import { FinanceRecurringExpensesUpdateUseCase } from "src/finance/application/finance-recurring-expenses-update.useCase";
import { FinanceRecurringExpensesDeleteUseCase } from "src/finance/application/finance-recurring-expenses-delete.useCase";
import { FinanceRecurringIncomesDeleteUseCase } from "src/finance/application/finance-recurring-incomes-delete.useCase";
import { FinanceRecurringIncomesIndexUseCase } from "src/finance/application/finance-recurring-incomes-index.useCase";
import { FinanceRecurringIncomesStoreUseCase } from "src/finance/application/finance-recurring-incomes-store.useCase";
import { FinanceRecurringIncomesUpdateUseCase } from "src/finance/application/finance-recurring-incomes-update.useCase";
import { FinanceDebtsIndexUseCase } from "src/finance/application/finance-debts-index.useCase";
import { FinanceDebtsStoreUseCase } from "src/finance/application/finance-debts-store.useCase";
import { FinanceDebtsUpdateUseCase } from "src/finance/application/finance-debts-update.useCase";
import { FinanceDebtsDeleteUseCase } from "src/finance/application/finance-debts-delete.useCase";
import { FinanceExportUseCase } from "src/finance/application/finance-export.useCase";
import { FinanceAssistantUseCase } from "src/finance/application/finance-assistant.useCase";
import { FinanceRangeOverviewUseCase } from "src/finance/application/finance-range-overview.useCase";
import { FinanceDebtsForecastUseCase } from "src/finance/application/finance-debts-forecast.useCase";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: FinanceIncomeCategoryModel.name,
        schema: FinanceIncomeCategorySchema,
      },
      { name: FinanceIncomeModel.name, schema: FinanceIncomeSchema },
      {
        name: FinanceExpenseCategoryModel.name,
        schema: FinanceExpenseCategorySchema,
      },
      { name: FinanceExpenseModel.name, schema: FinanceExpenseSchema },
      {
        name: FinanceRecurringExpenseModel.name,
        schema: FinanceRecurringExpenseSchema,
      },
      {
        name: FinanceRecurringExpensePaidModel.name,
        schema: FinanceRecurringExpensePaidSchema,
      },
      {
        name: FinanceRecurringIncomeModel.name,
        schema: FinanceRecurringIncomeSchema,
      },
      {
        name: FinanceRecurringIncomeReceivedModel.name,
        schema: FinanceRecurringIncomeReceivedSchema,
      },
      {
        name: FinanceLiquidityModel.name,
        schema: FinanceLiquiditySchema,
      },
      { name: FinanceDebtModel.name, schema: FinanceDebtSchema },
      {
        name: FinanceAssistantThreadModel.name,
        schema: FinanceAssistantThreadSchema,
      },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [FinanceController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: "FinanceLedgerRepository",
      useClass: FinanceLedgerImplementation,
    },
    FinanceCategoriesIndexUseCase,
    FinanceCategoriesStoreUseCase,
    FinanceCategoriesUpdateUseCase,
    FinanceCategoriesDeleteUseCase,
    FinanceIncomeCategoriesIndexUseCase,
    FinanceIncomeCategoriesStoreUseCase,
    FinanceIncomeCategoriesUpdateUseCase,
    FinanceIncomeCategoriesDeleteUseCase,
    FinanceIncomesIndexMonthUseCase,
    FinanceIncomesStoreUseCase,
    FinanceIncomesUpdateUseCase,
    FinanceIncomesDeleteUseCase,
    FinanceExpensesIndexMonthUseCase,
    FinanceExpensesStoreUseCase,
    FinanceExpensesUpdateUseCase,
    FinanceExpensesDeleteUseCase,
    FinanceRecurringExpensesIndexUseCase,
    FinanceRecurringExpensesStoreUseCase,
    FinanceRecurringExpensesUpdateUseCase,
    FinanceRecurringExpensesDeleteUseCase,
    FinanceRecurringIncomesIndexUseCase,
    FinanceRecurringIncomesStoreUseCase,
    FinanceRecurringIncomesUpdateUseCase,
    FinanceRecurringIncomesDeleteUseCase,
    FinanceMonthlySummaryUseCase,
    FinanceLiquidityReplaceUseCase,
    FinanceDebtsIndexUseCase,
    FinanceDebtsStoreUseCase,
    FinanceDebtsUpdateUseCase,
    FinanceDebtsDeleteUseCase,
    FinanceExportUseCase,
    FinanceAssistantUseCase,
    FinanceRangeOverviewUseCase,
    FinanceDebtsForecastUseCase,
  ],
})
export class FinanceModule {}
