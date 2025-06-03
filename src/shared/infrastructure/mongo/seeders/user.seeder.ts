// src/shared/infrastructure/mongo/seeders/user.seeder.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../../../app.module";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { UserModel } from "../schemas/user.schema";
import { StatusModel } from "../schemas/status.schema";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<UserModel>>(getModelToken("UserModel"));
  const statusModel = app.get<Model<StatusModel>>(getModelToken("StatusModel"));

  const status = await statusModel.findOne({ name: "active" });
  if (!status) {
    await app.close();
    return;
  }

  const existing = await userModel.countDocuments();
  if (existing === 0) {
    await userModel.insertMany([
      {
        name: "admin",
        email: "admin@example.com",
        password:
          "$2a$12$UIdyoVzM5ZxQsolXzzg3AeUvikpTId2vJ6nxWcNxVBLH28ycOe5Xi",
        status: status._id,
      },
    ]);
    console.log("✅ Usuarios sembrados correctamente.");
  } else {
    console.log("⚠️ Ya existen usuarios.");
  }

  await app.close();
}
bootstrap();
