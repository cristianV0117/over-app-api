import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import {
  VehicleModel,
  VehicleSchema,
} from "src/shared/infrastructure/mongo/schemas/vehicle.schema";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { StorageModule } from "src/shared/infrastructure/storage/storage.module";
import { VehiclesService } from "../../application/vehicles.service";
import { VehiclesController } from "../controllers/vehicles.controller";

@Module({
  imports: [
    StorageModule,
    MongooseModule.forFeature([
      { name: VehicleModel.name, schema: VehicleSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [VehiclesController],
  providers: [JwtStrategy, JwtAuthGuard, VehiclesService],
})
export class VehiclesModule {}
