import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL, // frontend
    credentials: true,
  });
  app.use(cookieParser());

  const express = require("express") as typeof import("express");
  app.use("/uploads", express.static(join(process.cwd(), "uploads")));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
