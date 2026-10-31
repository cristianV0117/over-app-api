import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { AdminGuard } from "src/shared/infrastructure/guards/admin.guard";
import { WorkanaService } from "../../application/workana.service";
import { WorkanaIngestDto } from "../dtos/workana-ingest.dto";

@Controller("workana")
@UseGuards(JwtAuthGuard, AdminGuard)
export class WorkanaController {
  constructor(private readonly workana: WorkanaService) {}

  @Get("jobs")
  list(
    @Query("highlighted") highlighted?: string,
    @Query("limit") limit?: string
  ) {
    return this.workana.list({
      highlighted: highlighted === "1" || highlighted === "true",
      limit: limit ? Number(limit) : 40,
    });
  }

  @Post("sync")
  syncNow() {
    return this.workana.syncAll();
  }

  @Post("ingest")
  ingest(@Body() body: WorkanaIngestDto) {
    return this.workana.ingest(body, body.query ?? "php");
  }
}
