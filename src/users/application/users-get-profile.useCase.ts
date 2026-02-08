import { Inject, Injectable } from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { User } from "../domain/user";

@Injectable()
export class UsersGetProfileUseCase {
  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository
  ) { }

  async execute(userId: string): Promise<User | null> {
    return this.usersLoginRepository.findById(userId);
  }
}
