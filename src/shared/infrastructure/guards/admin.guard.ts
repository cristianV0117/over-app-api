import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { RequestWithUser } from "../types/request-with-user.type";
import { UsersLoginRepository } from "src/users/domain/repositories/users-login.repository";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject("UsersLoginRepository")
    private readonly users: UsersLoginRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    if (req.user.impersonatorId) {
      throw new ForbiddenException(
        "No disponible en modo infiltración. Sal de la sesión del usuario primero."
      );
    }
    const u = await this.users.findById(req.user.id);
    if (!u || u.getRole() !== "admin") {
      throw new ForbiddenException("Solo administradores pueden acceder");
    }
    return true;
  }
}
