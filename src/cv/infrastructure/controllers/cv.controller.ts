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
import { CvService } from "../../application/cv.service";
import { CvCreateDto } from "../dtos/cv-create.dto";
import { CvWriteDto } from "../dtos/cv-write.dto";

@Controller("cv")
@UseGuards(JwtAuthGuard)
export class CvController {
  constructor(private readonly cv: CvService) {}

  @Get("me")
  listMine(@Req() req: RequestWithUser) {
    return this.cv.listMine(req.user.id);
  }

  @Post("me")
  create(@Req() req: RequestWithUser, @Body() body: CvCreateDto) {
    return this.cv.create(req.user.id, body, {
      name: req.user.name,
      email: req.user.email,
    });
  }

  @Get("me/:id")
  getById(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.cv.getById(req.user.id, id);
  }

  @Put("me/:id")
  save(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: CvWriteDto
  ) {
    return this.cv.save(req.user.id, id, body);
  }

  @Post("me/:id/translate")
  translate(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.cv.translateToEnglish(req.user.id, id);
  }

  @Delete("me/:id")
  delete(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.cv.delete(req.user.id, id);
  }
}
