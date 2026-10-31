import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  AnimeEntryModel,
  AnimeEntrySchema,
} from "src/shared/infrastructure/mongo/schemas/anime-entry.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { AnilistClient } from "../../application/anilist.client";
import { AnimeService } from "../../application/anime.service";
import { AnimeController } from "../controllers/anime.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnimeEntryModel.name, schema: AnimeEntrySchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [AnimeController],
  providers: [JwtStrategy, JwtAuthGuard, AnilistClient, AnimeService],
})
export class AnimeModule {}
