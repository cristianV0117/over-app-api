import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createReadStream } from "fs";
import type { Response } from "express";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { IUploadedFile } from "src/shared/infrastructure/storage/uploaded-file.interface";
import { VehiclesService } from "../../application/vehicles.service";
import { VehicleAssistantUseCase } from "../../application/vehicle-assistant.useCase";
import {
  VehicleCreateDto,
  VehicleUpdateDto,
} from "../dtos/vehicle-write.dto";
import { VehicleAssistantChatDto } from "../dtos/vehicle-assistant-chat.dto";

const MAX_DOC_SIZE = 12 * 1024 * 1024;

@Controller("vehicles")
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly assistant: VehicleAssistantUseCase
  ) {}

  @Get()
  list(@Req() req: RequestWithUser) {
    return this.vehicles.list(req.user.id);
  }

  @Post()
  create(@Req() req: RequestWithUser, @Body() body: VehicleCreateDto) {
    return this.vehicles.create(req.user.id, body);
  }

  @Patch(":id")
  update(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: VehicleUpdateDto
  ) {
    return this.vehicles.update(req.user.id, id, body);
  }

  @Delete(":id")
  async remove(@Req() req: RequestWithUser, @Param("id") id: string) {
    await this.assistant.clear(req.user.id, id).catch(() => undefined);
    await this.vehicles.remove(req.user.id, id);
    return { ok: true };
  }

  @Get(":id/assistant/history")
  assistantHistory(
    @Req() req: RequestWithUser,
    @Param("id") id: string
  ) {
    return this.assistant.history(req.user.id, id);
  }

  @Delete(":id/assistant/history")
  async assistantClear(
    @Req() req: RequestWithUser,
    @Param("id") id: string
  ) {
    await this.assistant.clear(req.user.id, id);
    return { ok: true };
  }

  @Post(":id/assistant/chat")
  assistantChat(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: VehicleAssistantChatDto
  ) {
    return this.assistant.chat(req.user.id, id, body);
  }

  @Get(":id/documents/:kind")
  async download(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("kind") kind: string,
    @Res() res: Response
  ) {
    const file = await this.vehicles.getDocumentFile(req.user.id, id, kind);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.fileName)}"`
    );
    createReadStream(file.filepath).pipe(res);
  }

  @Post(":id/documents/:kind")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_DOC_SIZE },
    })
  )
  upload(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("kind") kind: string,
    @UploadedFile() file?: IUploadedFile
  ) {
    if (!file) throw new BadRequestException("Adjunta un archivo");
    return this.vehicles.uploadDocument(req.user.id, id, kind, file);
  }

  @Delete(":id/documents/:kind")
  removeDocument(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Param("kind") kind: string
  ) {
    return this.vehicles.removeDocument(req.user.id, id, kind);
  }
}
