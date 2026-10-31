import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";
import { ANIME_WATCH_STATUSES } from "src/shared/infrastructure/mongo/schemas/anime-entry.schema";
import { AnimeService } from "../../application/anime.service";
import { AnimeAddDto } from "../dtos/anime-add.dto";
import { AnimeUpdateDto } from "../dtos/anime-update.dto";

@Controller("anime")
@UseGuards(JwtAuthGuard)
export class AnimeController {
  constructor(private readonly anime: AnimeService) {}

  @Get("search")
  search(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("genre") genre?: string,
    @Query("format") format?: string,
    @Query("sort") sort?: string,
    @Query("mainOnly") mainOnly?: string
  ) {
    return this.anime.search(q ?? "", page ? Number(page) : 1, {
      genre,
      format,
      sort,
      mainOnly: mainOnly === "1" || mainOnly === "true",
    });
  }

  @Get("media/:anilistId")
  detail(@Param("anilistId") anilistId: string) {
    return this.anime.detail(Number(anilistId));
  }

  @Get("genres")
  genres() {
    return this.anime.genres();
  }

  @Get("me/stats")
  stats(@Req() req: RequestWithUser) {
    return this.anime.stats(req.user.id);
  }

  @Get("me/recommendations")
  recommend(@Req() req: RequestWithUser) {
    return this.anime.recommend(req.user.id);
  }

  @Get("me")
  list(
    @Req() req: RequestWithUser,
    @Query("status") status?: string,
    @Query("genre") genre?: string,
    @Query("favorite") favorite?: string,
    @Query("q") q?: string
  ) {
    const watchStatus = ANIME_WATCH_STATUSES.includes(status as never)
      ? (status as (typeof ANIME_WATCH_STATUSES)[number])
      : undefined;
    return this.anime.list(req.user.id, {
      watchStatus,
      genre,
      favorite: favorite === "1" || favorite === "true",
      q,
    });
  }

  @Post("me")
  add(@Req() req: RequestWithUser, @Body() body: AnimeAddDto) {
    return this.anime.add(req.user.id, body);
  }

  @Patch("me/:id")
  update(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: AnimeUpdateDto
  ) {
    return this.anime.update(req.user.id, id, body);
  }

  @Delete("me/all")
  clear(@Req() req: RequestWithUser) {
    return this.anime.clear(req.user.id);
  }

  @Delete("me/:id")
  remove(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.anime.remove(req.user.id, id);
  }
}
