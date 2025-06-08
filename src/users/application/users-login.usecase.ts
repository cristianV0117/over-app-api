import { Inject, Injectable } from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { UsersLoginValueObject } from "../domain/valueObjects/users-login.valueObject";
import { UserLoginDTO } from "../infrastructure/dtos/users-login.dto";
import { UserLogin } from "../domain/user-login";
import { UsersAuthenticatedUseCase } from "./users-authenticated.usecase";

@Injectable()
export class UsersLoginUseCase {
  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository,
    private readonly usersAuthenticatedUseCase: UsersAuthenticatedUseCase
  ) {}

  async login(body: UserLoginDTO): Promise<UserLogin> {
    const user = await this.usersLoginRepository.login(
      new UsersLoginValueObject(body.email, body.password)
    );
    return await this.usersAuthenticatedUseCase.authenticated(user);
  }
}
