export const BOGOTA_TZ = "America/Bogota";

export type BogotaYmd = { y: number; m: number; day: number; iso: string };

export function bogotaYmd(d = new Date()): BogotaYmd {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOGOTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = iso.split("-").map(Number);
  return { y, m, day, iso };
}

export function daysUntilDayOfMonth(dayOfMonth: number, now = new Date()): number {
  const { y, m, day } = bogotaYmd(now);
  const lastThis = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dueThis = Math.min(Math.max(1, dayOfMonth), lastThis);
  return dueThis - day;
}

export function daysUntilDate(date: Date, now = new Date()): number {
  const a = bogotaYmd(now);
  const b = bogotaYmd(date);
  const start = Date.UTC(a.y, a.m - 1, a.day);
  const end = Date.UTC(b.y, b.m - 1, b.day);
  return Math.round((end - start) / 86_400_000);
}

export function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}
