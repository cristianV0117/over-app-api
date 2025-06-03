// src/seeder.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../../../../app.module";
import { getModelToken } from "@nestjs/mongoose";
import { StatusModel } from "../schemas/status.schema";
import { Model } from "mongoose";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const statusModel = app.get<Model<StatusModel>>(getModelToken("StatusModel"));

  const existing = await statusModel.countDocuments();

  if (existing === 0) {
    await statusModel.insertMany([{ name: "active" }, { name: "disable" }]);
    console.log("✅ Estados sembrados correctamente.");
  } else {
    console.log("⚠️ Ya existen estados, no se insertó nada.");
  }

  await app.close();
}
bootstrap();
