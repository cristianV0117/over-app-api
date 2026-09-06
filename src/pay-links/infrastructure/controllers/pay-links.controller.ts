import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { PayLinksService } from "../../application/pay-links.service";
import { PayLinkWriteDto } from "../dtos/pay-link-write.dto";

@Controller("pay-links")
@UseGuards(JwtAuthGuard)
export class PayLinksController {
  constructor(private readonly payLinks: PayLinksService) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.payLinks.list(req.user.id);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() body: PayLinkWriteDto) {
    return this.payLinks.create(req.user.id, body);
  }

  @Patch(":id")
  update(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: PayLinkWriteDto
  ) {
    return this.payLinks.update(req.user.id, id, body);
  }

  @Delete(":id")
  async remove(@Req() req: RequestWithUser, @Param("id") id: string) {
    await this.payLinks.remove(req.user.id, id);
    return { ok: true };
  }
}
