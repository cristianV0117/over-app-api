import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MongooseModule } from "@nestjs/mongoose";
import { SharedModule } from "./shared/infrastructure/modules/shared.module";
import { UsersModule } from "./users/infrastructure/modules/users.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { TasksModule } from "./tasks/infrastructure/modules/tasks.module";

@Module({
  imports: [
    //Se carga todas las variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    //Se inicia mongo
    MongooseModule.forRoot(process.env.MONGO_STRING ?? "", {
      dbName: process.env.MONGO_DATABASE,
    }),
    //Se inicia el mailer
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      },
      defaults: {
        from: process.env.MAIL_FROM,
      },
    }),
    SharedModule,
    UsersModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
