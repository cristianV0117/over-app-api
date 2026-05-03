import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { UsersAuthenticatedRepository } from "../domain/repositories/users-authenticated.repository";

@Injectable()
export class UsersAdminStopImpersonateUseCase {
  private readonly log = new Logger(UsersAdminStopImpersonateUseCase.name);

  constructor(
    @Inject("UsersLoginRepository")
    private readonly users: UsersLoginRepository,
    @Inject("UsersAuthenticatedRepository")
    private readonly auth: UsersAuthenticatedRepository
  ) {}

  /** `impersonatorId` viene del claim `imp` del JWT actual. */
  async execute(impersonatorId: string) {
    if (!impersonatorId) {
      throw new BadRequestException("No estás en modo infiltración.");
    }
    const admin = await this.users.findById(impersonatorId);
    if (!admin || admin.getRole() !== "admin") {
      throw new ForbiddenException(
        "La sesión de infiltración es inválida. Inicia sesión de nuevo."
      );
    }
    this.log.warn(`ADMIN_IMPERSONATE_STOP adminId=${impersonatorId}`);
    return this.auth.authenticated(admin);
  }
}
