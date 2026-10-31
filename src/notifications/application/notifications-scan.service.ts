import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import { Model, Types } from "mongoose";
import {
  FinanceDebtDocument,
  FinanceDebtModel,
} from "src/shared/infrastructure/mongo/schemas/finance-debt.schema";
import {
  FinanceDebtPaymentDocument,
  FinanceDebtPaymentModel,
} from "src/shared/infrastructure/mongo/schemas/finance-debt-payment.schema";
import {
  FinanceRecurringExpenseDocument,
  FinanceRecurringExpenseModel,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-expense.schema";
import {
  FinanceRecurringExpensePaidDocument,
  FinanceRecurringExpensePaidModel,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-expense-paid.schema";
import {
  FinanceRecurringIncomeDocument,
  FinanceRecurringIncomeModel,
} from "src/shared/infrastructure/mongo/schemas/finance-recurring-income.schema";
import {
  TaskDocument,
  TaskModel,
} from "src/shared/infrastructure/mongo/schemas/task.schema";
import {
  TaskStatusDocument,
  TaskStatusModel,
} from "src/shared/infrastructure/mongo/schemas/task-status.schema";
import {
  VehicleDocument,
  VehicleModel,
} from "src/shared/infrastructure/mongo/schemas/vehicle.schema";
import {
  CronConfigDocument,
  CronConfigModel,
} from "src/shared/infrastructure/mongo/schemas/cron-config.schema";
import {
  CronLogDocument,
  CronLogModel,
} from "src/shared/infrastructure/mongo/schemas/cron-log.schema";
import {
  UserDocument,
  UserModel,
} from "src/shared/infrastructure/mongo/schemas/user.schema";
import { NotificationsService } from "./notifications.service";
import {
  bogotaYmd,
  daysUntilDate,
  daysUntilDayOfMonth,
  formatCop,
  BOGOTA_TZ,
} from "./bogota-date";

@Injectable()
export class NotificationsScanService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsScanService.name);

  constructor(
    @InjectModel(UserModel.name)
    private readonly users: Model<UserDocument>,
    @InjectModel(FinanceDebtModel.name)
    private readonly debts: Model<FinanceDebtDocument>,
    @InjectModel(FinanceDebtPaymentModel.name)
    private readonly debtPayments: Model<FinanceDebtPaymentDocument>,
    @InjectModel(FinanceRecurringExpenseModel.name)
    private readonly recExpenses: Model<FinanceRecurringExpenseDocument>,
    @InjectModel(FinanceRecurringExpensePaidModel.name)
    private readonly recPaid: Model<FinanceRecurringExpensePaidDocument>,
    @InjectModel(FinanceRecurringIncomeModel.name)
    private readonly recIncomes: Model<FinanceRecurringIncomeDocument>,
    @InjectModel(TaskModel.name)
    private readonly tasks: Model<TaskDocument>,
    @InjectModel(TaskStatusModel.name)
    private readonly taskStatuses: Model<TaskStatusDocument>,
    @InjectModel(VehicleModel.name)
    private readonly vehicles: Model<VehicleDocument>,
    @InjectModel(CronConfigModel.name)
    private readonly cronConfigs: Model<CronConfigDocument>,
    @InjectModel(CronLogModel.name)
    private readonly cronLogs: Model<CronLogDocument>,
    private readonly notifications: NotificationsService
  ) {}

  onModuleInit() {
    setTimeout(() => {
      void this.scanAll().catch((e) =>
        this.logger.warn(
          `Scan inicial de notificaciones falló: ${e instanceof Error ? e.message : e}`
        )
      );
    }, 8_000);
  }

  @Cron("0 8 * * *", { timeZone: BOGOTA_TZ })
  async daily(): Promise<void> {
    try {
      await this.scanAll();
    } catch (e) {
      this.logger.warn(
        `Scan diario falló: ${e instanceof Error ? e.message : e}`
      );
    }
  }

  async scanAll(): Promise<{ created: number }> {
    const users = await this.users.find().select("_id").lean().exec();
    let created = 0;
    for (const u of users) {
      created += await this.scanUser(String(u._id));
    }
    this.logger.log(`Scan de notificaciones: ${created} nuevas`);
    return { created };
  }

  private async scanUser(userId: string): Promise<number> {
    const uid = new Types.ObjectId(userId);
    const { y, m, iso } = bogotaYmd();
    let n = 0;
    n += await this.scanDebts(userId, uid, y, m, iso);
    n += await this.scanRecurringExpenses(userId, uid, y, m, iso);
    n += await this.scanRecurringIncomes(userId, uid, iso);
    n += await this.scanTasks(userId, uid, iso);
    n += await this.scanVehicles(userId, uid, iso);
    n += await this.scanCron(userId, uid, iso);
    return n;
  }

  private async scanDebts(
    userId: string,
    uid: Types.ObjectId,
    y: number,
    m: number,
    iso: string
  ): Promise<number> {
    const rows = await this.debts
      .find({ userId: uid, isActive: true })
      .lean()
      .exec();
    let n = 0;
    for (const d of rows) {
      const paid = await this.debtPayments
        .findOne({ userId: uid, debtId: d._id, year: y, month: m })
        .lean()
        .exec();
      if (paid) continue;
      const days = daysUntilDayOfMonth(d.dayOfMonth);
      if (days > 3) continue;
      const dueLabel =
        days < 0
          ? "vencida"
          : days === 0
            ? "vence hoy"
            : `vence en ${days} día${days === 1 ? "" : "s"}`;
      const ok = await this.notifications.createIfNew({
        userId,
        type: "debt",
        severity: days <= 0 ? "urgent" : "warning",
        title: `Cuota: ${d.name}`,
        body: `${dueLabel}. ${formatCop(d.installmentAmount)}${d.creditor ? ` · ${d.creditor}` : ""}`,
        href: "/dashboard/contabilidad",
        dedupeKey: `debt:${d._id}:${iso}:${days <= 0 ? "due" : "soon"}`,
        meta: { debtId: String(d._id), days },
      });
      if (ok) n += 1;
    }
    return n;
  }

  private async scanRecurringExpenses(
    userId: string,
    uid: Types.ObjectId,
    y: number,
    m: number,
    iso: string
  ): Promise<number> {
    const rows = await this.recExpenses
      .find({ userId: uid, isActive: true })
      .lean()
      .exec();
    let n = 0;
    for (const r of rows) {
      const paid = await this.recPaid
        .findOne({
          userId: uid,
          recurringRuleId: r._id,
          year: y,
          month: m,
          paid: true,
        })
        .lean()
        .exec();
      if (paid) continue;
      const days = daysUntilDayOfMonth(r.dayOfMonth);
      if (days > 3) continue;
      const label = r.label?.trim() || "Pago recurrente";
      const dueLabel =
        days < 0
          ? "vencido"
          : days === 0
            ? "vence hoy"
            : `vence en ${days} día${days === 1 ? "" : "s"}`;
      const ok = await this.notifications.createIfNew({
        userId,
        type: "recurring_expense",
        severity: days <= 0 ? "urgent" : "warning",
        title: label,
        body: `${dueLabel}. ${formatCop(r.amount)}`,
        href: "/dashboard/contabilidad",
        dedupeKey: `rec-exp:${r._id}:${iso}:${days <= 0 ? "due" : "soon"}`,
        meta: { recurringId: String(r._id), days },
      });
      if (ok) n += 1;
    }
    return n;
  }

  private async scanRecurringIncomes(
    userId: string,
    uid: Types.ObjectId,
    iso: string
  ): Promise<number> {
    const rows = await this.recIncomes
      .find({ userId: uid, isActive: true })
      .lean()
      .exec();
    let n = 0;
    for (const r of rows) {
      const days = daysUntilDayOfMonth(r.dayOfMonth);
      if (days > 1) continue;
      const label = r.label?.trim() || "Ingreso recurrente";
      const dueLabel =
        days === 0 ? "llega hoy" : days < 0 ? "ya debió llegar" : "llega mañana";
      const ok = await this.notifications.createIfNew({
        userId,
        type: "recurring_income",
        severity: "info",
        title: label,
        body: `${dueLabel}. ${formatCop(r.amount)}`,
        href: "/dashboard/contabilidad",
        dedupeKey: `rec-inc:${r._id}:${iso}`,
        meta: { recurringId: String(r._id), days },
      });
      if (ok) n += 1;
    }
    return n;
  }

  private async scanTasks(
    userId: string,
    uid: Types.ObjectId,
    iso: string
  ): Promise<number> {
    const done = await this.taskStatuses.findOne({ name: "Done" }).lean().exec();
    const filter: Record<string, unknown> = {
      userId: uid,
      dueDate: { $exists: true, $ne: null },
    };
    if (done?._id) filter.status = { $ne: done._id };
    const rows = await this.tasks.find(filter).lean().exec();
    let n = 0;
    for (const t of rows) {
      if (!t.dueDate) continue;
      const days = daysUntilDate(new Date(t.dueDate));
      if (days > 1) continue;
      const dueLabel =
        days < 0
          ? `vencida hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`
          : days === 0
            ? "vence hoy"
            : "vence mañana";
      const ok = await this.notifications.createIfNew({
        userId,
        type: "task",
        severity: days < 0 ? "urgent" : "warning",
        title: t.title,
        body: dueLabel,
        href: "/dashboard/tasks",
        dedupeKey: `task:${t._id}:${iso}:${days < 0 ? "overdue" : "due"}`,
        meta: { taskId: String(t._id), days },
      });
      if (ok) n += 1;
    }
    return n;
  }

  private async scanVehicles(
    userId: string,
    uid: Types.ObjectId,
    iso: string
  ): Promise<number> {
    const rows = await this.vehicles.find({ userId: uid }).lean().exec();
    const windows = new Set([30, 15, 7, 3, 1, 0]);
    let n = 0;
    for (const v of rows) {
      const plate = v.plate || "vehículo";
      const checks: { kind: string; date?: Date | null; label: string }[] = [
        { kind: "soat", date: v.soatExpiresAt, label: "SOAT" },
        { kind: "techno", date: v.technoExpiresAt, label: "tecnomecánica" },
        { kind: "license", date: v.licenseExpiresAt, label: "licencia" },
      ];
      for (const c of checks) {
        if (!c.date) continue;
        const days = daysUntilDate(new Date(c.date));
        if (days > 30) continue;
        const bucket =
          days < 0 ? "expired" : windows.has(days) ? String(days) : days <= 3 ? "soon" : null;
        if (!bucket) continue;
        const dueLabel =
          days < 0
            ? `venció hace ${Math.abs(days)} día${Math.abs(days) === 1 ? "" : "s"}`
            : days === 0
              ? "vence hoy"
              : `vence en ${days} días`;
        const ok = await this.notifications.createIfNew({
          userId,
          type: "vehicle",
          severity: days <= 7 ? "urgent" : "warning",
          title: `${c.label} · ${plate}`,
          body: dueLabel,
          href: "/dashboard/vehiculo",
          dedupeKey: `vehicle:${v._id}:${c.kind}:${iso}:${bucket}`,
          meta: { vehicleId: String(v._id), kind: c.kind, days },
        });
        if (ok) n += 1;
      }
    }
    return n;
  }

  private async scanCron(
    userId: string,
    uid: Types.ObjectId,
    iso: string
  ): Promise<number> {
    const cfg = await this.cronConfigs.findOne({ userId: uid }).lean().exec();
    if (!cfg?.enabled) return 0;
    let n = 0;
    const last = await this.cronLogs
      .findOne({ userId: uid })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (last?.message && /error/i.test(last.message)) {
      const ageH =
        (Date.now() - new Date(last.createdAt).getTime()) / 3_600_000;
      if (ageH <= 24) {
        const ok = await this.notifications.createIfNew({
          userId,
          type: "cron",
          severity: "urgent",
          title: "El cron falló",
          body: last.message.split("\n")[0]?.slice(0, 240) || "Revisa los logs del cron.",
          href: "/dashboard/cron",
          dedupeKey: `cron:error:${iso}`,
        });
        if (ok) n += 1;
      }
    }
    if (cfg.lastRunAt) {
      const everyMs =
        (cfg.scheduleType || "interval") === "cron"
          ? 26 * 3_600_000
          : Math.max(1, cfg.everyMinutes || 5) * 60_000 * 2;
      const stale = Date.now() - new Date(cfg.lastRunAt).getTime() > everyMs;
      if (stale) {
        const ok = await this.notifications.createIfNew({
          userId,
          type: "cron",
          severity: "warning",
          title: "El cron no ha corrido",
          body: "Está activo, pero la última ejecución quedó atrasada.",
          href: "/dashboard/cron",
          dedupeKey: `cron:stale:${iso}`,
        });
        if (ok) n += 1;
      }
    }
    return n;
  }
}
