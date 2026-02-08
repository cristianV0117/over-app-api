import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  UserModel,
  UserSchema,
} from "src/shared/infrastructure/mongo/schemas/user.schema";
import { UsersLoginController } from "../controllers/users-login.controller";
import { UsersLoginUseCase } from "src/users/application/users-login.usecase";
import { UsersLoginMongoImplementation } from "../implementations/mongo/users-login-mongo.implementation";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "../../../shared/infrastructure/strategies/jwt.strategy";
import { JwtAuthGuard } from "../../../shared/infrastructure/guards/jwt-auth.guard";
import { UsersMeController } from "../controllers/users-me.controller";
import { GoogleStrategy } from "src/shared/infrastructure/strategies/google.strategy";
import { UsersLoginGoogleController } from "../controllers/users-login-google.controller";
import { UsersLogoutController } from "../controllers/users-logout.controller";
import { UsersForgotPasswordController } from "../controllers/users-forgot-password.controller";
import { MailService } from "src/shared/infrastructure/services/mail.service";
import { UsersAuthenticatedCookiesImplementation } from "../implementations/cookies/users-authenticated-cookies.implementation";
import { UsersAuthenticatedUseCase } from "src/users/application/users-authenticated.usecase";
import { UsersGetProfileUseCase } from "src/users/application/users-get-profile.useCase";
import { UsersUpdateProfileUseCase } from "src/users/application/users-update-profile.useCase";
import { EventEmitterModule } from "@nestjs/event-emitter";
import {
  LoginLogModel,
  LoginLogSchema,
} from "src/shared/infrastructure/mongo/schemas/login-log.schema";
import { UserLoggedInListener } from "../events/user-logged-in.listener";
import { StorageModule } from "src/shared/infrastructure/storage/storage.module";

@Module({
  imports: [
    StorageModule,
    MongooseModule.forFeature([
      { name: UserModel.name, schema: UserSchema },
      {
        name: LoginLogModel.name,
        schema: LoginLogSchema,
      },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    UsersLoginController,
    UsersLoginGoogleController,
    UsersMeController,
    UsersLogoutController,
    UsersForgotPasswordController,
  ],
  providers: [
    UserLoggedInListener,
    GoogleStrategy,
    JwtStrategy,
    JwtAuthGuard,
    UsersLoginUseCase,
    UsersGetProfileUseCase,
    UsersUpdateProfileUseCase,
    {
      provide: "UsersLoginRepository",
      useClass: UsersLoginMongoImplementation,
    },
    UsersAuthenticatedUseCase,
    {
      provide: "UsersAuthenticatedRepository",
      useClass: UsersAuthenticatedCookiesImplementation,
    },
    MailService,
  ],
})
export class UsersModule { }
