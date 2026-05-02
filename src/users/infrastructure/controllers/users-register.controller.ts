import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Post,
} from "@nestjs/common";
import {
  LoginResponseDTO,
  UserRegisterDTO,
} from "../dtos/users-login.dto";
import { UsersRegisterUseCase } from "src/users/application/users-register.usecase";
import { Exceptions } from "src/shared/domain/exceptions/exceptions";
import { UsersEmailAlreadyExistsException } from "src/users/domain/exceptions/users-email-already-exists.exception";
import { ApiCreatedResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Register")
@ApiCreatedResponse({
  type: LoginResponseDTO,
  description: "Cuenta creada; respuesta igual que en login",
})
@Controller("register")
export class UsersRegisterController {
  constructor(private readonly usersRegisterUseCase: UsersRegisterUseCase) {}

  @Post()
  async register(@Body() body: UserRegisterDTO): Promise<LoginResponseDTO> {
    try {
      const user = await this.usersRegisterUseCase.register(body);
      return {
        email: user.getEmail(),
        token: user.getToken(),
      };
    } catch (error) {
      if (error instanceof UsersEmailAlreadyExistsException) {
        throw new ConflictException(
          "Ya existe una cuenta con este correo electrónico."
        );
      }
      if (error instanceof Exceptions) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
