import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { AdminGuard } from "src/shared/infrastructure/guards/admin.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { NotificationsService } from "../../application/notifications.service";
import { NotificationsScanService } from "../../application/notifications-scan.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly scan: NotificationsScanService
  ) {}

  @Get()
  list(
    @Req() req: RequestWithUser,
    @Query("unread") unread?: string,
    @Query("limit") limit?: string
  ) {
    return this.notifications.list(req.user.id, {
      unreadOnly: unread === "1" || unread === "true",
      limit: limit ? Number(limit) : 80,
    });
  }

  @Get("unread-count")
  async unreadCount(@Req() req: RequestWithUser) {
    return { count: await this.notifications.unreadCount(req.user.id) };
  }

  @Post("read-all")
  markAllRead(@Req() req: RequestWithUser) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Post("scan")
  @UseGuards(AdminGuard)
  scanNow() {
    return this.scan.scanAll();
  }

  @Post(":id/read")
  async markRead(@Req() req: RequestWithUser, @Param("id") id: string) {
    const row = await this.notifications.markRead(req.user.id, id);
    return { notification: row };
  }
}
