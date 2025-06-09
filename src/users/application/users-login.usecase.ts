import { Inject, Injectable } from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { UsersLoginValueObject } from "../domain/valueObjects/users-login.valueObject";
import { UserLoginDTO } from "../infrastructure/dtos/users-login.dto";
import { UserLogin } from "../domain/user-login";
import { UsersAuthenticatedUseCase } from "./users-authenticated.usecase";
import { UsersStoreValueObject } from "../domain/valueObjects/users-store.valueObjects";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { UserLoggedInEvent } from "../domain/events/user-logged-in.event";

@Injectable()
export class UsersLoginUseCase {
  private PLATFORM = "platform";
  private GOOGLE = "google";

  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository,
    private readonly usersAuthenticatedUseCase: UsersAuthenticatedUseCase,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async login(body: UserLoginDTO): Promise<UserLogin> {
    const user = await this.usersLoginRepository.login(
      new UsersLoginValueObject(body.email, body.password)
    );
    this.eventEmitter.emit(
      "user.logged_in",
      new UserLoggedInEvent(user.getId(), user.getEmail(), this.PLATFORM)
    );
    return await this.usersAuthenticatedUseCase.authenticated(user);
  }

  async loginGoogle(name: string, email: string): Promise<UserLogin> {
    const ensureShow = await this.usersLoginRepository.ensureShow(email);
    if (!ensureShow) {
      const userCreatedOfGoole = await this.usersLoginRepository.store(
        new UsersStoreValueObject(name, email, null)
      );

      this.eventEmitter.emit(
        "user.logged_in",
        new UserLoggedInEvent(
          userCreatedOfGoole.getId(),
          userCreatedOfGoole.getEmail(),
          this.GOOGLE
        )
      );

      return await this.usersAuthenticatedUseCase.authenticated(
        userCreatedOfGoole
      );
    }

    const userFinded = await this.usersLoginRepository.show(email);

    this.eventEmitter.emit(
      "user.logged_in",
      new UserLoggedInEvent(
        userFinded.getId(),
        userFinded.getEmail(),
        this.GOOGLE
      )
    );

    return await this.usersAuthenticatedUseCase.authenticated(userFinded);
  }
}
