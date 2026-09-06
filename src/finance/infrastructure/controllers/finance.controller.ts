import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { FinanceMonthQueryDto } from "../dtos/finance-month-query.dto";
import { FinanceExpenseCategoryStoreDto } from "../dtos/finance-expense-category-store.dto";
import { FinanceExpenseCategoryUpdateDto } from "../dtos/finance-expense-category-update.dto";
import { FinanceExpenseStoreDto } from "../dtos/finance-expense-store.dto";
import { FinanceExpenseUpdateDto } from "../dtos/finance-expense-update.dto";
import { FinanceRecurringExpenseStoreDto } from "../dtos/finance-recurring-expense-store.dto";
import { FinanceRecurringExpenseUpdateDto } from "../dtos/finance-recurring-expense-update.dto";
import { FinanceRecurringIncomeStoreDto } from "../dtos/finance-recurring-income-store.dto";
import { FinanceRecurringIncomeUpdateDto } from "../dtos/finance-recurring-income-update.dto";
import { FinanceIncomeCategoryStoreDto } from "../dtos/finance-income-category-store.dto";
import { FinanceIncomeCategoryUpdateDto } from "../dtos/finance-income-category-update.dto";
import { FinanceIncomeStoreDto } from "../dtos/finance-income-store.dto";
import { FinanceIncomeUpdateDto } from "../dtos/finance-income-update.dto";
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
import { FinanceRecurringExpensesIndexUseCase } from "src/finance/application/finance-recurring-expenses-index.useCase";
import { FinanceRecurringExpensesStoreUseCase } from "src/finance/application/finance-recurring-expenses-store.useCase";
import { FinanceRecurringExpensesUpdateUseCase } from "src/finance/application/finance-recurring-expenses-update.useCase";
import { FinanceRecurringExpensesDeleteUseCase } from "src/finance/application/finance-recurring-expenses-delete.useCase";
import { FinanceRecurringIncomesDeleteUseCase } from "src/finance/application/finance-recurring-incomes-delete.useCase";
import { FinanceRecurringIncomesIndexUseCase } from "src/finance/application/finance-recurring-incomes-index.useCase";
import { FinanceRecurringIncomesStoreUseCase } from "src/finance/application/finance-recurring-incomes-store.useCase";
import { FinanceRecurringIncomesUpdateUseCase } from "src/finance/application/finance-recurring-incomes-update.useCase";
import { FinanceMonthlySummaryUseCase } from "src/finance/application/finance-monthly-summary.useCase";
import { FinanceLiquidityPutDto } from "../dtos/finance-liquidity-put.dto";
import { FinanceLiquidityReplaceUseCase } from "src/finance/application/finance-liquidity-replace.useCase";
import { FinanceDebtStoreDto } from "../dtos/finance-debt-store.dto";
import { FinanceDebtUpdateDto } from "../dtos/finance-debt-update.dto";
import { FinanceExportQueryDto } from "../dtos/finance-export-query.dto";
import { FinanceAssistantChatDto } from "../dtos/finance-assistant-chat.dto";
import { FinanceDebtsIndexUseCase } from "src/finance/application/finance-debts-index.useCase";
import { FinanceDebtsStoreUseCase } from "src/finance/application/finance-debts-store.useCase";
import { FinanceDebtsUpdateUseCase } from "src/finance/application/finance-debts-update.useCase";
import { FinanceDebtsDeleteUseCase } from "src/finance/application/finance-debts-delete.useCase";
import { FinanceExportUseCase } from "src/finance/application/finance-export.useCase";
import { FinanceAssistantUseCase } from "src/finance/application/finance-assistant.useCase";

@Controller("finance")
export class FinanceController {
  constructor(
    private readonly expenseCategoriesIndex: FinanceCategoriesIndexUseCase,
    private readonly expenseCategoriesStore: FinanceCategoriesStoreUseCase,
    private readonly expenseCategoriesUpdate: FinanceCategoriesUpdateUseCase,
    private readonly expenseCategoriesDelete: FinanceCategoriesDeleteUseCase,
    private readonly incomeCategoriesIndex: FinanceIncomeCategoriesIndexUseCase,
    private readonly incomeCategoriesStore: FinanceIncomeCategoriesStoreUseCase,
    private readonly incomeCategoriesUpdate: FinanceIncomeCategoriesUpdateUseCase,
    private readonly incomeCategoriesDelete: FinanceIncomeCategoriesDeleteUseCase,
    private readonly incomesIndexMonth: FinanceIncomesIndexMonthUseCase,
    private readonly incomesStore: FinanceIncomesStoreUseCase,
    private readonly incomesUpdate: FinanceIncomesUpdateUseCase,
    private readonly incomesDelete: FinanceIncomesDeleteUseCase,
    private readonly expensesIndexMonth: FinanceExpensesIndexMonthUseCase,
    private readonly expensesStore: FinanceExpensesStoreUseCase,
    private readonly expensesUpdate: FinanceExpensesUpdateUseCase,
    private readonly expensesDelete: FinanceExpensesDeleteUseCase,
    private readonly recurringExpensesIndex: FinanceRecurringExpensesIndexUseCase,
    private readonly recurringExpensesStore: FinanceRecurringExpensesStoreUseCase,
    private readonly recurringExpensesUpdate: FinanceRecurringExpensesUpdateUseCase,
    private readonly recurringExpensesDelete: FinanceRecurringExpensesDeleteUseCase,
    private readonly recurringIncomesIndex: FinanceRecurringIncomesIndexUseCase,
    private readonly recurringIncomesStore: FinanceRecurringIncomesStoreUseCase,
    private readonly recurringIncomesUpdate: FinanceRecurringIncomesUpdateUseCase,
    private readonly recurringIncomesDelete: FinanceRecurringIncomesDeleteUseCase,
    private readonly monthlySummary: FinanceMonthlySummaryUseCase,
    private readonly liquidityReplace: FinanceLiquidityReplaceUseCase,
    private readonly debtsIndex: FinanceDebtsIndexUseCase,
    private readonly debtsStore: FinanceDebtsStoreUseCase,
    private readonly debtsUpdate: FinanceDebtsUpdateUseCase,
    private readonly debtsDelete: FinanceDebtsDeleteUseCase,
    private readonly financeExport: FinanceExportUseCase,
    private readonly assistant: FinanceAssistantUseCase
  ) {}

  @Put("liquidity")
  @UseGuards(JwtAuthGuard)
  async liquidityPut(
    @Body() body: FinanceLiquidityPutDto,
    @Req() req: RequestWithUser
  ) {
    const accounts = await this.liquidityReplace.execute(req.user.id, body);
    const total = accounts.reduce((s, a) => s + a.amount, 0);
    return {
      currency: "COP" as const,
      total,
      accounts,
    };
  }

  @Get("summary")
  @UseGuards(JwtAuthGuard)
  async summary(
    @Query() query: FinanceMonthQueryDto,
    @Req() req: RequestWithUser
  ) {
    return this.monthlySummary.execute(req.user.id, query.year, query.month);
  }

  @Get("income-categories")
  @UseGuards(JwtAuthGuard)
  async incomeCategoriesList(@Req() req: RequestWithUser) {
    const list = await this.incomeCategoriesIndex.execute(req.user.id);
    return list.map((c) => c.toJSON());
  }

  @Post("income-categories")
  @UseGuards(JwtAuthGuard)
  async incomeCategoriesPost(
    @Body() body: FinanceIncomeCategoryStoreDto,
    @Req() req: RequestWithUser
  ) {
    const c = await this.incomeCategoriesStore.execute(body, req.user.id);
    return c.toJSON();
  }

  @Patch("income-categories/:id")
  @UseGuards(JwtAuthGuard)
  async incomeCategoriesPatch(
    @Param("id") id: string,
    @Body() body: FinanceIncomeCategoryUpdateDto,
    @Req() req: RequestWithUser
  ) {
    const c = await this.incomeCategoriesUpdate.execute(id, body, req.user.id);
    if (!c) throw new NotFoundException("Categoría de ingreso no encontrada");
    return c.toJSON();
  }

  @Delete("income-categories/:id")
  @UseGuards(JwtAuthGuard)
  async incomeCategoriesRemove(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    await this.incomeCategoriesDelete.execute(id, req.user.id);
    return { ok: true };
  }

  @Get("incomes")
  @UseGuards(JwtAuthGuard)
  async incomesList(
    @Query() query: FinanceMonthQueryDto,
    @Req() req: RequestWithUser
  ) {
    const list = await this.incomesIndexMonth.execute(
      req.user.id,
      query.year,
      query.month
    );
    return list.map((e) => e.toJSON());
  }

  @Post("incomes")
  @UseGuards(JwtAuthGuard)
  async incomesPost(
    @Body() body: FinanceIncomeStoreDto,
    @Req() req: RequestWithUser
  ) {
    const e = await this.incomesStore.execute(body, req.user.id);
    return e.toJSON();
  }

  @Patch("incomes/:id")
  @UseGuards(JwtAuthGuard)
  async incomesPatch(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
    @Body() body: FinanceIncomeUpdateDto,
    @Query("year") yearStr?: string,
    @Query("month") monthStr?: string
  ) {
    const ctx =
      yearStr !== undefined &&
      monthStr !== undefined &&
      yearStr !== "" &&
      monthStr !== ""
        ? { year: Number(yearStr), month: Number(monthStr) }
        : undefined;
    const e = await this.incomesUpdate.execute(id, body, req.user.id, ctx);
    return e.toJSON();
  }

  @Delete("incomes/:id")
  @UseGuards(JwtAuthGuard)
  async incomesRemove(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    await this.incomesDelete.execute(id, req.user.id);
    return { ok: true };
  }

  @Get("categories")
  @UseGuards(JwtAuthGuard)
  async expenseCategoriesList(@Req() req: RequestWithUser) {
    const list = await this.expenseCategoriesIndex.execute(req.user.id);
    return list.map((c) => c.toJSON());
  }

  @Post("categories")
  @UseGuards(JwtAuthGuard)
  async expenseCategoriesPost(
    @Body() body: FinanceExpenseCategoryStoreDto,
    @Req() req: RequestWithUser
  ) {
    const c = await this.expenseCategoriesStore.execute(body, req.user.id);
    return c.toJSON();
  }

  @Patch("categories/:id")
  @UseGuards(JwtAuthGuard)
  async expenseCategoriesPatch(
    @Param("id") id: string,
    @Body() body: FinanceExpenseCategoryUpdateDto,
    @Req() req: RequestWithUser
  ) {
    const c = await this.expenseCategoriesUpdate.execute(id, body, req.user.id);
    if (!c) throw new NotFoundException("Categoría no encontrada");
    return c.toJSON();
  }

  @Delete("categories/:id")
  @UseGuards(JwtAuthGuard)
  async expenseCategoriesRemove(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    await this.expenseCategoriesDelete.execute(id, req.user.id);
    return { ok: true };
  }

  @Get("expenses")
  @UseGuards(JwtAuthGuard)
  async expensesList(
    @Query() query: FinanceMonthQueryDto,
    @Req() req: RequestWithUser
  ) {
    const list = await this.expensesIndexMonth.execute(
      req.user.id,
      query.year,
      query.month
    );
    return list.map((e) => e.toJSON());
  }

  @Post("expenses")
  @UseGuards(JwtAuthGuard)
  async expensesPost(
    @Body() body: FinanceExpenseStoreDto,
    @Req() req: RequestWithUser
  ) {
    const e = await this.expensesStore.execute(body, req.user.id);
    return e.toJSON();
  }

  @Patch("expenses/:id")
  @UseGuards(JwtAuthGuard)
  async expensesPatch(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
    @Body() body: FinanceExpenseUpdateDto,
    @Query("year") yearStr?: string,
    @Query("month") monthStr?: string
  ) {
    const ctx =
      yearStr !== undefined &&
      monthStr !== undefined &&
      yearStr !== "" &&
      monthStr !== ""
        ? { year: Number(yearStr), month: Number(monthStr) }
        : undefined;
    const e = await this.expensesUpdate.execute(id, body, req.user.id, ctx);
    return e.toJSON();
  }

  @Delete("expenses/:id")
  @UseGuards(JwtAuthGuard)
  async expensesRemove(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    await this.expensesDelete.execute(id, req.user.id);
    return { ok: true };
  }

  @Get("recurring-expenses")
  @UseGuards(JwtAuthGuard)
  async recurringList(@Req() req: RequestWithUser) {
    const list = await this.recurringExpensesIndex.execute(req.user.id);
    return list.map((r) => r.toJSON());
  }

  @Post("recurring-expenses")
  @UseGuards(JwtAuthGuard)
  async recurringPost(
    @Body() body: FinanceRecurringExpenseStoreDto,
    @Req() req: RequestWithUser
  ) {
    const r = await this.recurringExpensesStore.execute(body, req.user.id);
    return r.toJSON();
  }

  @Patch("recurring-expenses/:id")
  @UseGuards(JwtAuthGuard)
  async recurringPatch(
    @Param("id") id: string,
    @Body() body: FinanceRecurringExpenseUpdateDto,
    @Req() req: RequestWithUser
  ) {
    const r = await this.recurringExpensesUpdate.execute(id, body, req.user.id);
    return r.toJSON();
  }

  @Delete("recurring-expenses/:id")
  @UseGuards(JwtAuthGuard)
  async recurringRemove(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    await this.recurringExpensesDelete.execute(id, req.user.id);
    return { ok: true };
  }

  @Get("recurring-incomes")
  @UseGuards(JwtAuthGuard)
  async recurringIncomesList(@Req() req: RequestWithUser) {
    const list = await this.recurringIncomesIndex.execute(req.user.id);
    return list.map((r) => r.toJSON());
  }

  @Post("recurring-incomes")
  @UseGuards(JwtAuthGuard)
  async recurringIncomesPost(
    @Body() body: FinanceRecurringIncomeStoreDto,
    @Req() req: RequestWithUser
  ) {
    const r = await this.recurringIncomesStore.execute(body, req.user.id);
    return r.toJSON();
  }

  @Patch("recurring-incomes/:id")
  @UseGuards(JwtAuthGuard)
  async recurringIncomesPatch(
    @Param("id") id: string,
    @Body() body: FinanceRecurringIncomeUpdateDto,
    @Req() req: RequestWithUser
  ) {
    const r = await this.recurringIncomesUpdate.execute(id, body, req.user.id);
    return r.toJSON();
  }

  @Delete("recurring-incomes/:id")
  @UseGuards(JwtAuthGuard)
  async recurringIncomesRemove(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    await this.recurringIncomesDelete.execute(id, req.user.id);
    return { ok: true };
  }

  @Get("debts")
  @UseGuards(JwtAuthGuard)
  async debtsList(@Req() req: RequestWithUser) {
    const list = await this.debtsIndex.execute(req.user.id);
    return list.map((d) => d.toJSON());
  }

  @Post("debts")
  @UseGuards(JwtAuthGuard)
  async debtsPost(
    @Body() body: FinanceDebtStoreDto,
    @Req() req: RequestWithUser
  ) {
    const d = await this.debtsStore.execute(body, req.user.id);
    return d.toJSON();
  }

  @Patch("debts/:id")
  @UseGuards(JwtAuthGuard)
  async debtsPatch(
    @Param("id") id: string,
    @Body() body: FinanceDebtUpdateDto,
    @Req() req: RequestWithUser
  ) {
    const d = await this.debtsUpdate.execute(id, body, req.user.id);
    return d.toJSON();
  }

  @Delete("debts/:id")
  @UseGuards(JwtAuthGuard)
  async debtsRemove(@Param("id") id: string, @Req() req: RequestWithUser) {
    await this.debtsDelete.execute(id, req.user.id);
    return { ok: true };
  }

  @Get("export")
  @UseGuards(JwtAuthGuard)
  async exportMovements(
    @Query() query: FinanceExportQueryDto,
    @Req() req: RequestWithUser,
    @Res() res: Response
  ) {
    const rows = await this.financeExport.execute(
      req.user.id,
      query.fromYear,
      query.fromMonth,
      query.toYear,
      query.toMonth
    );
    if (query.format === "json") {
      return res.json({ rows });
    }
    const csv = this.financeExport.toCsv(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="movimientos-${query.fromYear}-${String(query.fromMonth).padStart(2, "0")}-${query.toYear}-${String(query.toMonth).padStart(2, "0")}.csv"`
    );
    return res.send(csv);
  }

  @Get("assistant/history")
  @UseGuards(JwtAuthGuard)
  async assistantHistory(@Req() req: RequestWithUser) {
    const messages = await this.assistant.history(req.user.id);
    return { messages };
  }

  @Delete("assistant/history")
  @UseGuards(JwtAuthGuard)
  async assistantClear(@Req() req: RequestWithUser) {
    await this.assistant.clear(req.user.id);
    return { ok: true };
  }

  @Post("assistant/chat")
  @UseGuards(JwtAuthGuard)
  async assistantChat(
    @Body() body: FinanceAssistantChatDto,
    @Req() req: RequestWithUser
  ) {
    return this.assistant.chat(req.user.id, body);
  }
}
