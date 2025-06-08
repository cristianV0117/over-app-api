import { Inject, Injectable } from "@nestjs/common";
import { User } from "../domain/user";
import { UserLogin } from "../domain/user-login";
import {
  AuthCookieManager,
  UsersAuthenticatedRepository,
} from "../domain/repositories/users-authenticated.repository";

@Injectable()
export class UsersAuthenticatedUseCase {
  constructor(
    @Inject("UsersAuthenticatedRepository")
    private readonly usersAuthenticatedRepository: UsersAuthenticatedRepository
  ) {}

  authenticated(user: User): Promise<UserLogin> {
    return this.usersAuthenticatedRepository.authenticated(user);
  }

  async logOut(response: AuthCookieManager): Promise<void> {
    return await this.usersAuthenticatedRepository.logout(response);
  }
}
