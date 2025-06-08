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
import { UsersStoreValueObject } from "src/users/domain/valueObjects/users-store.valueObjects";
import { UsersEmailAlreadyExistsException } from "src/users/domain/exceptions/users-email-already-exists.exception";
import { UserNotFoundException } from "src/users/domain/exceptions/user-not-found.exception";

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

  async ensureShow(email: string): Promise<boolean> {
    const user = await this.userModel.findOne({ email: email });

    if (!user) {
      return false;
    }

    return true;
  }

  async store(userStore: UsersStoreValueObject): Promise<User> {
    try {
      const createdUser = await this.userModel.create({
        name: userStore.getName(),
        email: userStore.getEmail(),
        password: userStore.getPassword(),
        status: userStore.getStatus(),
      });

      return new User({
        id: createdUser.id.toString(),
        name: createdUser.name,
        email: createdUser.email,
        password: createdUser.password,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      });
    } catch (error: any) {
      if (error.code === 11000 && error.keyPattern?.email) {
        throw new UsersEmailAlreadyExistsException(userStore.getEmail());
      }

      throw error;
    }
  }

  async show(email: string) {
    const user = await this.userModel.findOne({
      email,
    });

    if (!user) {
      throw new UserNotFoundException(email);
    }

    return new User({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
