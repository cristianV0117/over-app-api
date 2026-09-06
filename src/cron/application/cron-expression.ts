import { BadRequestException } from "@nestjs/common";
import { CronExpressionParser } from "cron-parser";

const FIVE_FIELD = /^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/;

export function assertCronExpression(expression: string): string {
  const expr = expression.trim();
  if (!FIVE_FIELD.test(expr)) {
    throw new BadRequestException(
      "Usá un cron de 5 campos, ej. 40 3 * * 1-5 (min hora día mes weekday)"
    );
  }
  try {
    CronExpressionParser.parse(expr, { tz: "America/Bogota" });
  } catch {
    throw new BadRequestException("La expresión cron no es válida");
  }
  return expr;
}

/** Si el minuto actual (TZ) coincide con la última ocurrencia, devuelve esa fecha. */
export function cronSlotIfDue(
  expression: string,
  timezone: string,
  now = new Date()
): Date | null {
  try {
    const interval = CronExpressionParser.parse(expression, {
      currentDate: now,
      tz: timezone,
    });
    const prev = interval.prev().toDate();
    if (now.getTime() - prev.getTime() < 90_000) return prev;
    return null;
  } catch {
    return null;
  }
}
