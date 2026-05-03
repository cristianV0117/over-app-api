import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { AdminGuard } from "src/shared/infrastructure/guards/admin.guard";
import { UsersAdminListUseCase } from "src/users/application/users-admin-list.useCase";
import { UsersAdminImpersonateUseCase } from "src/users/application/users-admin-impersonate.useCase";
import { UsersAdminStopImpersonateUseCase } from "src/users/application/users-admin-stop-impersonate.useCase";
import { AdminImpersonateDto } from "../dtos/admin-impersonate.dto";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { LoginResponseDTO } from "../dtos/users-login.dto";

@Controller("admin")
export class UsersAdminController {
  constructor(
    private readonly usersAdminList: UsersAdminListUseCase,
    private readonly usersAdminImpersonate: UsersAdminImpersonateUseCase,
    private readonly usersAdminStopImpersonate: UsersAdminStopImpersonateUseCase
  ) {}

  @Get("users")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listUsers() {
    return this.usersAdminList.execute();
  }

  @Post("impersonate")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async impersonate(
    @Req() req: RequestWithUser,
    @Body() body: AdminImpersonateDto
  ): Promise<LoginResponseDTO> {
    const login = await this.usersAdminImpersonate.execute(
      req.user.id,
      body.userId
    );
    return {
      email: login.getEmail(),
      token: login.getToken(),
    };
  }

  @Post("impersonate/stop")
  @UseGuards(JwtAuthGuard)
  async stopImpersonate(@Req() req: RequestWithUser): Promise<LoginResponseDTO> {
    const imp = req.user.impersonatorId;
    if (!imp) {
      throw new BadRequestException("No estás en modo infiltración.");
    }
    const login = await this.usersAdminStopImpersonate.execute(imp);
    return {
      email: login.getEmail(),
      token: login.getToken(),
    };
  }
}
