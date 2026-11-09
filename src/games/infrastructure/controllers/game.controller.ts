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
import { GameService } from "../../application/game.service";
import { GameAddDto } from "../dtos/game-add.dto";
import { GameUpdateDto } from "../dtos/game-update.dto";

@Controller("games")
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly games: GameService) {}

  @Get("search")
  search(
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("genre") genre?: string,
    @Query("platform") platform?: string,
    @Query("sort") sort?: string,
    @Query("mainOnly") mainOnly?: string
  ) {
    return this.games.search(q ?? "", page ? Number(page) : 1, {
      genre,
      platform,
      sort,
      mainOnly: mainOnly === "1" || mainOnly === "true",
    });
  }

  @Get("media/:steamId")
  detail(@Param("steamId") steamId: string) {
    return this.games.detail(Number(steamId));
  }

  @Get("genres")
  genres() {
    return this.games.genres();
  }

  @Get("me/stats")
  stats(@Req() req: RequestWithUser) {
    return this.games.stats(req.user.id);
  }

  @Get("me/recommendations")
  recommend(@Req() req: RequestWithUser) {
    return this.games.recommend(req.user.id);
  }

  @Get("me")
  list(@Req() req: RequestWithUser) {
    return this.games.list(req.user.id);
  }

  @Post("me")
  add(@Req() req: RequestWithUser, @Body() body: GameAddDto) {
    return this.games.add(req.user.id, body);
  }

  @Patch("me/:id")
  update(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() body: GameUpdateDto
  ) {
    return this.games.update(req.user.id, id, body);
  }

  @Delete("me/all")
  clear(@Req() req: RequestWithUser) {
    return this.games.clear(req.user.id);
  }

  @Delete("me/:id")
  remove(@Req() req: RequestWithUser, @Param("id") id: string) {
    return this.games.remove(req.user.id, id);
  }
}
