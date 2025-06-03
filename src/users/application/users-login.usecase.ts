import { Inject, Injectable } from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { UsersLoginValueObject } from "../domain/valueObjects/users-login.valueObject";
import { UserLoginDTO } from "../infrastructure/dtos/users-login.dto";
import { UserLogin } from "../domain/user-login";

@Injectable()
export class UsersLoginUseCase {
  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository
  ) {}

  async login(body: UserLoginDTO): Promise<UserLogin> {
    return await this.usersLoginRepository.login(
      new UsersLoginValueObject(body.email, body.password)
    );
  }
}
