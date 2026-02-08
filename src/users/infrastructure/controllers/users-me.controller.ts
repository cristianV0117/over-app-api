import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { IUploadedFile } from "src/shared/infrastructure/storage/uploaded-file.interface";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { UsersGetProfileUseCase } from "src/users/application/users-get-profile.useCase";
import { UsersUpdateProfileUseCase } from "src/users/application/users-update-profile.useCase";
import { UserUpdateProfileDTO } from "../dtos/user-update-profile.dto";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

@Controller("me")
export class UsersMeController {
  constructor(
    private readonly usersGetProfileUseCase: UsersGetProfileUseCase,
    private readonly usersUpdateProfileUseCase: UsersUpdateProfileUseCase
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: RequestWithUser) {
    const user = await this.usersGetProfileUseCase.execute(req.user.id);
    if (!user) throw new NotFoundException("Usuario no encontrado");
    return user.toJSON();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("avatar", {
      limits: { fileSize: MAX_AVATAR_SIZE },
    })
  )
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() body: UserUpdateProfileDTO,
    @UploadedFile() file?: IUploadedFile
  ) {
    const updated = await this.usersUpdateProfileUseCase.execute(
      req.user.id,
      { name: body.name },
      file
    );
    if (!updated) throw new NotFoundException("Usuario no encontrado");
    return updated.toJSON();
  }
}
