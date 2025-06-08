import { Inject, Injectable } from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { UsersLoginValueObject } from "../domain/valueObjects/users-login.valueObject";
import { UserLoginDTO } from "../infrastructure/dtos/users-login.dto";
import { UserLogin } from "../domain/user-login";
import { UsersAuthenticatedUseCase } from "./users-authenticated.usecase";
import { UsersStoreValueObject } from "../domain/valueObjects/users-store.valueObjects";

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

  async loginGoogle(name: string, email: string): Promise<UserLogin> {
    const ensureShow = await this.usersLoginRepository.ensureShow(email);
    if (!ensureShow) {
      const userCreatedOfGoole = await this.usersLoginRepository.store(
        new UsersStoreValueObject(name, email, null)
      );

      return await this.usersAuthenticatedUseCase.authenticated(
        userCreatedOfGoole
      );
    }

    return await this.usersAuthenticatedUseCase.authenticated(
      await this.usersLoginRepository.show(email)
    );
  }
}
