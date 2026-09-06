import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PayLinkModel,
  PayLinkSchema,
} from "src/shared/infrastructure/mongo/schemas/pay-link.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { PayLinksService } from "../../application/pay-links.service";
import { PayLinksController } from "../controllers/pay-links.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayLinkModel.name, schema: PayLinkSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [PayLinksController],
  providers: [JwtStrategy, JwtAuthGuard, PayLinksService],
})
export class PayLinksModule {}
