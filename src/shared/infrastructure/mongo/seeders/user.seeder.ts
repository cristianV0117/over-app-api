// src/shared/infrastructure/mongo/seeders/user.seeder.ts
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env") });

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

  await userModel.updateMany(
    { $or: [{ role: { $exists: false } }, { role: null }] },
    { $set: { role: "user" } }
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  await userModel.updateOne(
    { email: adminEmail },
    { $set: { role: "admin" } }
  );

  const existing = await userModel.countDocuments();
  if (existing === 0) {
    await userModel.insertMany([
      {
        name: "admin",
        email: adminEmail,
        password:
          "$2a$12$UIdyoVzM5ZxQsolXzzg3AeUvikpTId2vJ6nxWcNxVBLH28ycOe5Xi",
        status: status._id,
        role: "admin",
      },
    ]);
  }

  await app.close();
}
bootstrap();
