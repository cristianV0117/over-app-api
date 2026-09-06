import { Body, Controller, Get, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { CronJobsService } from "src/cron/application/cron.service";
import { CronConfigPutDto } from "../dtos/cron-config-put.dto";

@Controller("cron")
@UseGuards(JwtAuthGuard)
export class CronController {
  constructor(private readonly cron: CronJobsService) {}

  @Get("config")
  async getConfig(@Req() req: RequestWithUser) {
    return this.cron.getConfig(req.user.id);
  }

  @Put("config")
  async putConfig(
    @Req() req: RequestWithUser,
    @Body() body: CronConfigPutDto
  ) {
    return this.cron.putConfig(req.user.id, body.enabled, body.everyMinutes);
  }

  @Get("logs")
  async logs(
    @Req() req: RequestWithUser,
    @Query("limit") limitStr?: string
  ) {
    const limit = limitStr ? Number(limitStr) : 80;
    return { logs: await this.cron.listLogs(req.user.id, limit) };
  }

  @Post("run")
  async runNow(@Req() req: RequestWithUser) {
    const log = await this.cron.runNow(req.user.id);
    return { log };
  }
}
