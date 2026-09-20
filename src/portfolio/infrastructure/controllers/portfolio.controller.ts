import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { PortfolioService } from "../../application/portfolio.service";
import { PortfolioCreateDto } from "../dtos/portfolio-create.dto";
import { PortfolioWriteDto } from "../dtos/portfolio-write.dto";

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get("public/:slug")
  getPublic(@Param("slug") slug: string) {
    return this.portfolio.getPublic(slug);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  listMine(@Req() req: RequestWithUser) {
    return this.portfolio.listMine(req.user.id);
  }

  @Post("me")
  @UseGuards(JwtAuthGuard)
  create(@Req() req: RequestWithUser, @Body() body: PortfolioCreateDto) {
    return this.portfolio.create(req.user.id, body);
  }

  @Get("me/:id")
  @UseGuards(JwtAuthGuard)
  getById(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.portfolio.getById(req.user.id, id);
  }

  @Put("me/:id")
  @UseGuards(JwtAuthGuard)
  save(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: PortfolioWriteDto
  ) {
    return this.portfolio.save(req.user.id, id, body);
  }

  @Post("me/:id/publish")
  @UseGuards(JwtAuthGuard)
  publish(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.portfolio.publish(req.user.id, id);
  }

  @Post("me/:id/unpublish")
  @UseGuards(JwtAuthGuard)
  unpublish(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.portfolio.unpublish(req.user.id, id);
  }

  @Delete("me/:id")
  @UseGuards(JwtAuthGuard)
  delete(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.portfolio.delete(req.user.id, id);
  }
}
