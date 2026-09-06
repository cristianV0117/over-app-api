import https from "https";

export const CHECKIN = {
  hostname: "back-eu2.sesametime.com",

  employeeId: process.env.EMPLOYEE_ID ?? "",

  companyId: process.env.CSID ?? "",

  workCheckTypeId: process.env.WORK_CHECK_TYPE_ID ?? "",

  authorization: process.env.AUTHORIZATION ?? "",

  cookie: process.env.COOKIE ?? "",

  origin: "https://app.sesametime.com",

  referer: "https://app.sesametime.com/",
} as const;

export function runCheckIn(): Promise<{
  method: string;
  url: string;
  body: string;
  statusCode: number;
  durationMs: number;
  response: string;
}> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      origin: "web",
      coordinates: {},
      workCheckTypeId: CHECKIN.workCheckTypeId,
    });

    const path = `/api/v3/employees/${CHECKIN.employeeId}/check-in`;

    const options = {
      hostname: CHECKIN.hostname,
      path,
      method: "POST",

      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",

        Authorization: CHECKIN.authorization,
        Cookie: CHECKIN.cookie,

        csid: CHECKIN.companyId,
        esid: CHECKIN.employeeId,

        Origin: CHECKIN.origin,
        Referer: CHECKIN.referer,

        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",

        "Content-Length": Buffer.byteLength(body),
      },
    };

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          method: options.method,
          url: `https://${options.hostname}${options.path}`,
          body,
          statusCode: res.statusCode ?? 0,
          durationMs: Date.now() - startTime,
          response: data,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}
