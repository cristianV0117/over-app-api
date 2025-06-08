import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  UserDocument,
  UserModel,
} from "src/shared/infrastructure/mongo/schemas/user.schema";
import { UsersLoginRepository } from "src/users/domain/repositories/users-login.repository";
import { UsersLoginValueObject } from "src/users/domain/valueObjects/users-login.valueObject";
import { UsersInvalidCredentialsException } from "src/users/domain/exceptions/users-invalid-credentials.exception";
import * as bcrypt from "bcrypt";
import { User } from "src/users/domain/user";

export class UsersLoginMongoImplementation implements UsersLoginRepository {
  constructor(
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>
  ) {}

  async login(userLogin: UsersLoginValueObject): Promise<User> {
    const user = await this.userModel.findOne({ email: userLogin.getEmail() });

    if (!user) {
      console.error("User not found");
      throw new UsersInvalidCredentialsException();
    }

    const passwordMatch = await bcrypt.compare(
      userLogin.getPassword(),
      user.password
    );
    if (!passwordMatch) {
      console.error("Invalid password");
      throw new UsersInvalidCredentialsException();
    }

    return new User({
      id: user.id.toString(),
      email: userLogin.getEmail(),
      password: userLogin.getPassword(),
      name: user.name,
    });
  }
}
