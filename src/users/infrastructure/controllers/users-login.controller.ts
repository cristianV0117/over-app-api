import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { LoginResponseDTO, UserLoginDTO } from "../dtos/users-login.dto";
import { UsersLoginUseCase } from "src/users/application/users-login.usecase";
import { Exceptions } from "src/shared/domain/exceptions/exceptions";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("Login")
@ApiOkResponse({ type: LoginResponseDTO, description: "Login exitoso" })
@Controller("login")
export class UsersLoginController {
  constructor(private readonly usersLoginUseCase: UsersLoginUseCase) {}

  @Post()
  async login(@Body() body: UserLoginDTO): Promise<LoginResponseDTO> {
    try {
      const user = await this.usersLoginUseCase.login(body);
      return {
        email: user.getEmail(),
        token: user.getToken(),
      };
    } catch (error) {
      if (error instanceof Exceptions) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
