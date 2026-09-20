import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PortfolioModel,
  PortfolioSchema,
} from "src/shared/infrastructure/mongo/schemas/portfolio.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { PortfolioService } from "../../application/portfolio.service";
import { PortfolioController } from "../controllers/portfolio.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PortfolioModel.name, schema: PortfolioSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [PortfolioController],
  providers: [JwtStrategy, JwtAuthGuard, PortfolioService],
})
export class PortfolioModule {}
