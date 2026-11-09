import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  GameEntryModel,
  GameEntrySchema,
} from "src/shared/infrastructure/mongo/schemas/game-entry.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { RawgClient } from "../../application/rawg.client";
import { GameService } from "../../application/game.service";
import { GameController } from "../controllers/game.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameEntryModel.name, schema: GameEntrySchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [GameController],
  providers: [JwtStrategy, JwtAuthGuard, RawgClient, GameService],
})
export class GameModule {}
