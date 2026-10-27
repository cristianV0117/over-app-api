import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  CvModel,
  CvSchema,
} from "src/shared/infrastructure/mongo/schemas/cv.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { CvService } from "../../application/cv.service";
import { CvController } from "../controllers/cv.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CvModel.name, schema: CvSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [CvController],
  providers: [JwtStrategy, JwtAuthGuard, CvService],
})
export class CvModule {}
