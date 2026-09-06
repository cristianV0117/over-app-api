import { Body, Controller, Delete, Get, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { AdminGuard } from "src/shared/infrastructure/guards/admin.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { CronJobsService } from "src/cron/application/cron.service";
import { CronConfigPutDto } from "../dtos/cron-config-put.dto";

@Controller("cron")
@UseGuards(JwtAuthGuard, AdminGuard)
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
    return this.cron.putConfig(req.user.id, body);
  }

  @Get("logs")
  async logs(
    @Req() req: RequestWithUser,
    @Query("limit") limitStr?: string
  ) {
    const limit = limitStr ? Number(limitStr) : 80;
    return { logs: await this.cron.listLogs(req.user.id, limit) };
  }

  @Delete("logs")
  async clearLogs(@Req() req: RequestWithUser) {
    return this.cron.clearLogs(req.user.id);
  }

  @Post("run")
  async runNow(@Req() req: RequestWithUser) {
    const log = await this.cron.runNow(req.user.id);
    return { log };
  }
}
