import { Inject, Injectable } from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";

@Injectable()
export class UsersAdminListUseCase {
  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository
  ) {}

  execute() {
    return this.usersLoginRepository.listUsersForAdmin();
  }
}
