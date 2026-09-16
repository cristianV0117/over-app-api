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
import { FilesService } from "../../application/files.service";
import {
  CreateFolderDto,
  RenameNodeDto,
} from "../dtos/file-write.dto";

const MAX_FILE_SIZE = 12 * 1024 * 1024;

@Controller("files")
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  tree(@Req() req: RequestWithUser) {
    return this.files.tree(req.user.id);
  }

  @Post("folders")
  createFolder(@Req() req: RequestWithUser, @Body() body: CreateFolderDto) {
    return this.files.createFolder(req.user.id, body);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
    })
  )
  upload(
    @Req() req: RequestWithUser,
    @Body("parentId") parentId: string | undefined,
    @UploadedFile() file?: IUploadedFile
  ) {
    if (!file) throw new BadRequestException("Adjunta un archivo");
    const parent =
      !parentId || parentId === "null" || parentId === "undefined"
        ? null
        : parentId;
    return this.files.upload(req.user.id, parent, file);
  }

  @Get(":id/download")
  async download(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Res() res: Response
  ) {
    const file = await this.files.getFile(req.user.id, id);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.fileName)}"`
    );
    createReadStream(file.filepath).pipe(res);
  }

  @Patch(":id")
  rename(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: RenameNodeDto
  ) {
    return this.files.rename(req.user.id, id, body);
  }

  @Delete(":id")
  remove(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.files.remove(req.user.id, id);
  }
}
