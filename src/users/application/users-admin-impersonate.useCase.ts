import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { UsersAuthenticatedRepository } from "../domain/repositories/users-authenticated.repository";

@Injectable()
export class UsersAdminImpersonateUseCase {
  private readonly log = new Logger(UsersAdminImpersonateUseCase.name);

  constructor(
    @Inject("UsersLoginRepository")
    private readonly users: UsersLoginRepository,
    @Inject("UsersAuthenticatedRepository")
    private readonly auth: UsersAuthenticatedRepository
  ) {}

  async execute(adminUserId: string, targetUserId: string) {
    if (adminUserId === targetUserId) {
      throw new ForbiddenException("No puedes infiltrarte en tu propia cuenta.");
    }
    const admin = await this.users.findById(adminUserId);
    if (!admin || admin.getRole() !== "admin") {
      throw new ForbiddenException("Solo administradores pueden infiltrarse.");
    }
    const target = await this.users.findById(targetUserId);
    if (!target) {
      throw new NotFoundException("Usuario no encontrado");
    }
    if (target.getRole() === "admin") {
      throw new ForbiddenException(
        "No se puede infiltrar en la cuenta de otro administrador."
      );
    }
    this.log.warn(
      `ADMIN_IMPERSONATE adminId=${adminUserId} targetId=${targetUserId} targetEmail=${target.getEmail()}`
    );
    return this.auth.impersonated(target, adminUserId);
  }
}
