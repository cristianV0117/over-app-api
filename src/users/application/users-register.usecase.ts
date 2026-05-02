import { Inject, Injectable } from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { UserRegisterDTO } from "../infrastructure/dtos/users-login.dto";
import { UserLogin } from "../domain/user-login";
import { UsersAuthenticatedUseCase } from "./users-authenticated.usecase";
import { UsersStoreValueObject } from "../domain/valueObjects/users-store.valueObjects";
import { UsersEmailAlreadyExistsException } from "../domain/exceptions/users-email-already-exists.exception";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { UserLoggedInEvent } from "../domain/events/user-logged-in.event";

@Injectable()
export class UsersRegisterUseCase {
  private readonly PLATFORM = "platform";

  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository,
    private readonly usersAuthenticatedUseCase: UsersAuthenticatedUseCase,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async register(body: UserRegisterDTO): Promise<UserLogin> {
    const exists = await this.usersLoginRepository.ensureShow(body.email);
    if (exists) {
      throw new UsersEmailAlreadyExistsException(body.email);
    }

    const user = await this.usersLoginRepository.store(
      new UsersStoreValueObject(body.name, body.email, body.password)
    );

    this.eventEmitter.emit(
      "user.logged_in",
      new UserLoggedInEvent(user.getId(), user.getEmail(), this.PLATFORM)
    );

    return await this.usersAuthenticatedUseCase.authenticated(user);
  }
}
