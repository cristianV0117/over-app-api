import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  DriveNodeModel,
  DriveNodeSchema,
} from "src/shared/infrastructure/mongo/schemas/drive-node.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { StorageModule } from "src/shared/infrastructure/storage/storage.module";
import { FilesService } from "../../application/files.service";
import { FilesController } from "../controllers/files.controller";

@Module({
  imports: [
    StorageModule,
    MongooseModule.forFeature([
      { name: DriveNodeModel.name, schema: DriveNodeSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [FilesController],
  providers: [JwtStrategy, JwtAuthGuard, FilesService],
})
export class FilesModule {}
