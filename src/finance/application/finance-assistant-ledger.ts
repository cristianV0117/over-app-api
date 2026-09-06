import type { FinanceLedgerRepository } from "src/finance/domain/repositories/finance-ledger.repository";

export type LedgerMovementDraft = {
  amount: number;
  date: string;
  notes: string;
  categoryName: string;
  categoryId: string | null;
};

export type LedgerRecurringDraft = {
  amount: number;
  dayOfMonth: number;
  label: string;
  notes: string;
  categoryName: string;
  categoryId: string | null;
};

export type ExtractedLedger = {
  expenses: LedgerMovementDraft[];
  incomes: LedgerMovementDraft[];
  expenseCategories: { name: string }[];
  incomeCategories: { name: string }[];
  recurringExpenses: LedgerRecurringDraft[];
  recurringIncomes: LedgerRecurringDraft[];
};

const MAX_EXPENSES = 80;
const MAX_INCOMES = 40;
const MAX_CATS = 20;
const MAX_RECURRING = 20;

export function emptyLedger(): ExtractedLedger {
  return {
    expenses: [],
    incomes: [],
    expenseCategories: [],
    incomeCategories: [],
    recurringExpenses: [],
    recurringIncomes: [],
  };
}

export function ledgerHasItems(ledger: ExtractedLedger | null | undefined): boolean {
  if (!ledger) return false;
  return (
    ledger.expenses.length +
      ledger.incomes.length +
      ledger.expenseCategories.length +
      ledger.incomeCategories.length +
      ledger.recurringExpenses.length +
      ledger.recurringIncomes.length >
    0
  );
}

export function mergeLedgers(
  a: ExtractedLedger,
  b: ExtractedLedger
): ExtractedLedger {
  return {
    expenses: [...a.expenses, ...b.expenses].slice(0, MAX_EXPENSES),
    incomes: [...a.incomes, ...b.incomes].slice(0, MAX_INCOMES),
    expenseCategories: uniqCats([
      ...a.expenseCategories,
      ...b.expenseCategories,
    ]).slice(0, MAX_CATS),
    incomeCategories: uniqCats([
      ...a.incomeCategories,
      ...b.incomeCategories,
    ]).slice(0, MAX_CATS),
    recurringExpenses: [...a.recurringExpenses, ...b.recurringExpenses].slice(
      0,
      MAX_RECURRING
    ),
    recurringIncomes: [...a.recurringIncomes, ...b.recurringIncomes].slice(
      0,
      MAX_RECURRING
    ),
  };
}

export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDay(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function dayToUtcNoon(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12, 0, 0));
}

export function findCategoryId(
  categories: Array<{ id: string; name: string }>,
  name: string
): string | null {
  const folded = foldName(name);
  if (!folded) return null;
  return categories.find((c) => foldName(c.name) === folded)?.id ?? null;
}

function uniqCats(items: Array<{ name: string }>): Array<{ name: string }> {
  const seen = new Set<string>();
  const out: Array<{ name: string }> = [];
  for (const item of items) {
    const name = item.name.trim().slice(0, 80);
    const key = foldName(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name });
  }
  return out;
}

function asAmount(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function asNotes(value: unknown): string {
  return String(value ?? "").trim().slice(0, 500);
}

function asCategoryName(value: unknown, fallback = "Otros"): string {
  const name = String(value ?? "").trim().slice(0, 80);
  return name || fallback;
}

function asDayOfMonth(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(31, n);
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function resolveMovement(
  raw: Record<string, unknown>,
  categories: Array<{ id: string; name: string }>
): LedgerMovementDraft | null {
  const amount = asAmount(raw.amount);
  const date = parseDay(raw.date ?? raw.occurredAt ?? raw.receivedAt);
  if (amount == null || !date) return null;
  const categoryName = asCategoryName(raw.categoryName ?? raw.category);
  return {
    amount,
    date,
    notes: asNotes(raw.notes ?? raw.description ?? raw.label),
    categoryName,
    categoryId: findCategoryId(categories, categoryName),
  };
}

function resolveRecurring(
  raw: Record<string, unknown>,
  categories: Array<{ id: string; name: string }>
): LedgerRecurringDraft | null {
  const amount = asAmount(raw.amount);
  if (amount == null) return null;
  const categoryName = asCategoryName(raw.categoryName ?? raw.category);
  const label = String(raw.label ?? raw.notes ?? categoryName)
    .trim()
    .slice(0, 120);
  return {
    amount,
    dayOfMonth: asDayOfMonth(raw.dayOfMonth ?? raw.day),
    label: label || categoryName,
    notes: asNotes(raw.notes),
    categoryName,
    categoryId: findCategoryId(categories, categoryName),
  };
}

export function normalizeProposedLedger(
  args: Record<string, unknown>,
  expenseCategories: Array<{ id: string; name: string }>,
  incomeCategories: Array<{ id: string; name: string }>
): ExtractedLedger {
  const expenses = asList(args.expenses)
    .map((item) =>
      item && typeof item === "object"
        ? resolveMovement(item as Record<string, unknown>, expenseCategories)
        : null
    )
    .filter((x): x is LedgerMovementDraft => x != null)
    .slice(0, MAX_EXPENSES);

  const incomes = asList(args.incomes)
    .map((item) =>
      item && typeof item === "object"
        ? resolveMovement(item as Record<string, unknown>, incomeCategories)
        : null
    )
    .filter((x): x is LedgerMovementDraft => x != null)
    .slice(0, MAX_INCOMES);

  const expenseCategoriesNeeded = uniqCats([
    ...asList(args.expenseCategories).map((item) => ({
      name: asCategoryName(
        item && typeof item === "object"
          ? (item as Record<string, unknown>).name
          : item
      ),
    })),
    ...expenses
      .filter((e) => !e.categoryId)
      .map((e) => ({ name: e.categoryName })),
  ]).slice(0, MAX_CATS);

  const incomeCategoriesNeeded = uniqCats([
    ...asList(args.incomeCategories).map((item) => ({
      name: asCategoryName(
        item && typeof item === "object"
          ? (item as Record<string, unknown>).name
          : item,
        "Ingresos"
      ),
    })),
    ...incomes
      .filter((e) => !e.categoryId)
      .map((e) => ({ name: e.categoryName })),
  ]).slice(0, MAX_CATS);

  const recurringExpenses = asList(args.recurringExpenses)
    .map((item) =>
      item && typeof item === "object"
        ? resolveRecurring(item as Record<string, unknown>, expenseCategories)
        : null
    )
    .filter((x): x is LedgerRecurringDraft => x != null)
    .slice(0, MAX_RECURRING);

  const recurringIncomes = asList(args.recurringIncomes)
    .map((item) =>
      item && typeof item === "object"
        ? resolveRecurring(item as Record<string, unknown>, incomeCategories)
        : null
    )
    .filter((x): x is LedgerRecurringDraft => x != null)
    .slice(0, MAX_RECURRING);

  return {
    expenses,
    incomes,
    expenseCategories: expenseCategoriesNeeded,
    incomeCategories: incomeCategoriesNeeded,
    recurringExpenses,
    recurringIncomes,
  };
}

async function ensureCategoryId(
  existing: Array<{ id: string; name: string }>,
  cache: Map<string, string>,
  name: string,
  create: (name: string) => Promise<{ id: string; name: string }>
): Promise<string> {
  const key = foldName(name);
  if (cache.has(key)) return cache.get(key)!;
  const found = findCategoryId(existing, name);
  if (found) {
    cache.set(key, found);
    return found;
  }
  const created = await create(name.trim().slice(0, 80) || "Otros");
  existing.push({ id: created.id, name: created.name });
  cache.set(foldName(created.name), created.id);
  return created.id;
}

export async function applyLedgerImport(
  repo: FinanceLedgerRepository,
  userId: string,
  draft: ExtractedLedger
): Promise<{
  created: {
    expenseCategories: number;
    incomeCategories: number;
    expenses: number;
    incomes: number;
    recurringExpenses: number;
    recurringIncomes: number;
  };
  errors: string[];
}> {
  const expenseCats = (await repo.findExpenseCategoriesByUser(userId)).map((c) =>
    c.toJSON()
  );
  const incomeCats = (await repo.findIncomeCategoriesByUser(userId)).map((c) =>
    c.toJSON()
  );
  const expCache = new Map<string, string>();
  const incCache = new Map<string, string>();
  const errors: string[] = [];
  const created = {
    expenseCategories: 0,
    incomeCategories: 0,
    expenses: 0,
    incomes: 0,
    recurringExpenses: 0,
    recurringIncomes: 0,
  };

  const makeExpenseCat = async (name: string) => {
    const before = expenseCats.length;
    const id = await ensureCategoryId(expenseCats, expCache, name, async (n) => {
      const cat = await repo.createExpenseCategory(userId, n);
      return cat.toJSON();
    });
    if (expenseCats.length > before) created.expenseCategories += 1;
    return id;
  };
  const makeIncomeCat = async (name: string) => {
    const before = incomeCats.length;
    const id = await ensureCategoryId(incomeCats, incCache, name, async (n) => {
      const cat = await repo.createIncomeCategory(userId, n);
      return cat.toJSON();
    });
    if (incomeCats.length > before) created.incomeCategories += 1;
    return id;
  };

  for (const cat of draft.expenseCategories) {
    try {
      await makeExpenseCat(cat.name);
    } catch (e) {
      errors.push(
        `Categoría de gasto "${cat.name}": ${e instanceof Error ? e.message : e}`
      );
    }
  }
  for (const cat of draft.incomeCategories) {
    try {
      await makeIncomeCat(cat.name);
    } catch (e) {
      errors.push(
        `Categoría de ingreso "${cat.name}": ${e instanceof Error ? e.message : e}`
      );
    }
  }

  for (const row of draft.expenses) {
    try {
      const categoryId = await makeExpenseCat(row.categoryName);
      await repo.createExpense(
        userId,
        categoryId,
        row.amount,
        dayToUtcNoon(row.date),
        row.notes
      );
      created.expenses += 1;
    } catch (e) {
      errors.push(
        `Gasto ${row.date} ${row.notes || row.categoryName}: ${
          e instanceof Error ? e.message : e
        }`
      );
    }
  }

  for (const row of draft.incomes) {
    try {
      const categoryId = await makeIncomeCat(row.categoryName);
      await repo.createIncome(
        userId,
        categoryId,
        row.amount,
        dayToUtcNoon(row.date),
        row.notes
      );
      created.incomes += 1;
    } catch (e) {
      errors.push(
        `Ingreso ${row.date} ${row.notes || row.categoryName}: ${
          e instanceof Error ? e.message : e
        }`
      );
    }
  }

  for (const row of draft.recurringExpenses) {
    try {
      const categoryId = await makeExpenseCat(row.categoryName);
      await repo.createRecurringExpenseRule(userId, {
        categoryId,
        amount: row.amount,
        dayOfMonth: row.dayOfMonth,
        label: row.label,
        notes: row.notes,
        isActive: true,
      });
      created.recurringExpenses += 1;
    } catch (e) {
      errors.push(
        `Recurrente gasto "${row.label}": ${e instanceof Error ? e.message : e}`
      );
    }
  }

  for (const row of draft.recurringIncomes) {
    try {
      const categoryId = await makeIncomeCat(row.categoryName);
      await repo.createRecurringIncomeRule(userId, {
        categoryId,
        amount: row.amount,
        dayOfMonth: row.dayOfMonth,
        label: row.label,
        notes: row.notes,
        isActive: true,
      });
      created.recurringIncomes += 1;
    } catch (e) {
      errors.push(
        `Recurrente ingreso "${row.label}": ${e instanceof Error ? e.message : e}`
      );
    }
  }

  return { created, errors };
}
