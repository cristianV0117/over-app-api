/** Destino e IDs ficticios. No se pueden cambiar ni apuntan a un servicio real. */
export const DEMO_CHECKIN = {
  hostname: "demo.overapp.local",
  path: "/api/v3/employees/demo-employee-0001/check-in",
  employeeId: "demo-employee-0001",
  companyId: "demo-company-0001",
  workCheckTypeId: "demo-teletrabajo",
  workCheckTypeName: "Demo remoto",
} as const;

export function runDemoCheckIn(): {
  method: string;
  url: string;
  body: string;
  statusCode: number;
  durationMs: number;
  response: string;
} {
  const start = Date.now();
  const body = JSON.stringify({
    origin: "web",
    coordinates: {},
    workCheckTypeId: DEMO_CHECKIN.workCheckTypeId,
  });
  const now = new Date();
  const payload = {
    data: {
      id: `demo-${now.getTime()}`,
      employeeId: DEMO_CHECKIN.employeeId,
      date: now.toISOString().slice(0, 10),
      isRemote: true,
      workStatus: "demo",
      checkIn: {
        origin: "web",
        date: now.toISOString(),
        timezone: "America/Bogota",
      },
      workCheckType: {
        id: DEMO_CHECKIN.workCheckTypeId,
        name: DEMO_CHECKIN.workCheckTypeName,
        workType: "demo",
      },
    },
    meta: { demo: true, note: "Respuesta ficticia de OverApp. No hubo red externa." },
  };
  return {
    method: "POST",
    url: `https://${DEMO_CHECKIN.hostname}${DEMO_CHECKIN.path}`,
    body,
    statusCode: 200,
    durationMs: Math.max(1, Date.now() - start),
    response: JSON.stringify(payload),
  };
}

export function formatDemoCheckInLog(
  result: ReturnType<typeof runDemoCheckIn>,
  extra?: { delaySeconds?: number }
): string {
  const lines = [
    "========================================",
    "INICIO DEL SCRIPT (demo OverApp)",
    `Método: ${result.method}`,
    `URL: ${result.url}`,
    `Body: ${result.body}`,
    extra?.delaySeconds != null
      ? `Delay aleatorio: ${extra.delaySeconds}s`
      : null,
    `Respuesta recibida. HTTP ${result.statusCode}`,
    `Petición terminada en ${result.durationMs} ms`,
    `Respuesta: ${result.response}`,
    "RESULTADO: petición ficticia exitosa (sin red externa)",
    "FIN DEL SCRIPT",
    "========================================",
  ].filter((x): x is string => x != null);
  return lines.join("\n");
}
