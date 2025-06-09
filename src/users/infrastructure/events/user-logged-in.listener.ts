import { OnEvent } from "@nestjs/event-emitter";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { LoginLogModel } from "src/shared/infrastructure/mongo/schemas/login-log.schema"; // ajusta según tu ruta
import { UserLoggedInEvent } from "src/users/domain/events/user-logged-in.event";

@Injectable()
export class UserLoggedInListener {
  constructor(
    @InjectModel("LoginLogModel")
    private readonly logModel: Model<LoginLogModel>
  ) {}

  @OnEvent("user.logged_in")
  async handle(event: UserLoggedInEvent) {
    await this.logModel.create({
      userId: event.userId,
      email: event.email,
      from: event.from,
      loginAt: event.loginAt,
    });
  }
}
