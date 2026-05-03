import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { AdminGuard } from "src/shared/infrastructure/guards/admin.guard";
import { UsersAdminListUseCase } from "src/users/application/users-admin-list.useCase";

@Controller("admin")
export class UsersAdminController {
  constructor(private readonly usersAdminList: UsersAdminListUseCase) {}

  @Get("users")
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listUsers() {
    return this.usersAdminList.execute();
  }
}
