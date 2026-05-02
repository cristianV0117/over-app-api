#!/usr/bin/env node
/**
 * Genera un módulo NestJS en arquitectura hexagonal (domain / application / infrastructure).
 *
 * Uso:
 *   npm run generate:hex -- <nombre-base>
 *
 * Ejemplos:
 *   npm run generate:hex -- login-log     → src/login-logs/ (usa schema login-log si existe)
 *   npm run generate:hex -- loginLog
 *   npm run generate:hex -- webhook       → src/webhooks/ + schema nuevo webhook.schema.ts
 *
 * Para eliminar un módulo creado:
 *   npm run remove:hex -- <nombre-base> [--with-schema]
 *
 * Opciones (generate):
 *   --force   Sobrescribe archivos si el directorio ya existe
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = path.join(root, "src");

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

function pluralizeKebab(kebab) {
  const parts = kebab.split("-");
  const last = parts[parts.length - 1];
  let pl = last;
  if (last === "log") pl = "logs";
  else if (last === "status") pl = "statuses";
  else if (last.endsWith("y") && last.length > 1 && !/^[aeiou]y$/.test(last))
    pl = last.slice(0, -1) + "ies";
  else if (last.endsWith("s")) pl = last;
  else pl = last + "s";
  return [...parts.slice(0, -1), pl].join("-");
}

function toSingularLastSegment(segment) {
  if (segment === "logs") return "log";
  if (segment === "statuses") return "status";
  if (segment.endsWith("ies")) return segment.slice(0, -3) + "y";
  if (segment.endsWith("s") && segment.length > 1) return segment.slice(0, -1);
  return segment;
}

function folderKebabToEntityPascal(folderKebab) {
  const parts = folderKebab.split("-");
  const lastSing = toSingularLastSegment(parts[parts.length - 1]);
  const allParts = [...parts.slice(0, -1), lastSing];
  return allParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

function pascalFromKebab(kebab) {
  return kebab
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(fullPath, content, force) {
  if (fs.existsSync(fullPath) && !force) {
    console.warn(`Omitido (ya existe): ${path.relative(root, fullPath)}`);
    return false;
  }
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content, "utf8");
  console.log(`Creado: ${path.relative(root, fullPath)}`);
  return true;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const nameArg = args.find((a) => !a.startsWith("--"));
  return { nameArg, force };
}

function resolveNames(nameArg) {
  if (!nameArg) {
    console.error(
      "Uso: npm run generate:hex -- <nombre-base> [--force]\nEjemplo: npm run generate:hex -- login-log"
    );
    process.exit(1);
  }
  let baseKebab = toKebab(nameArg);
  if (!baseKebab.includes("-") && baseKebab.length > 12) {
    console.warn(
      "Tip: si el nombre es compuesto (p. ej. loginlog), usa login-log o loginLog."
    );
  }
  const folderKebab = pluralizeKebab(baseKebab);
  const entityPascal = folderKebabToEntityPascal(folderKebab);
  const pluralPascal = pascalFromKebab(folderKebab);
  const entityKebabSingular = toKebab(entityPascal);
  const modelClass = `${entityPascal}Model`;
  const repoToken = `${pluralPascal}Repository`;
  const implClass = `${pluralPascal}MongoImplementation`;
  return {
    folderKebab,
    entityKebabSingular,
    entityPascal,
    pluralPascal,
    modelClass,
    repoToken,
    implClass,
    baseKebab,
  };
}

function schemaPath(names) {
  return path.join(
    srcDir,
    "shared/infrastructure/mongo/schemas",
    `${names.entityKebabSingular}.schema.ts`
  );
}

function schemaExists(names) {
  return fs.existsSync(schemaPath(names));
}

function detectProfile(names) {
  const p = schemaPath(names);
  if (!fs.existsSync(p)) return "generic";
  const content = fs.readFileSync(p, "utf8");
  if (content.includes("LoginLogModel")) return "loginLog";
  return "generic";
}

function renderGenericSchema(names) {
  return `import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true })
export class ${names.modelClass} {
  @Prop({ type: Types.ObjectId, ref: "UserModel", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;
}

export type ${names.entityPascal}Document = ${names.modelClass} &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };

export const ${names.entityPascal}Schema = SchemaFactory.createForClass(${names.modelClass});
`;
}

function patchAppModule(names, force) {
  const appPath = path.join(srcDir, "app.module.ts");
  let text = fs.readFileSync(appPath, "utf8");
  const moduleClass = `${names.pluralPascal}Module`;
  const importLine = `import { ${moduleClass} } from "./${names.folderKebab}/infrastructure/modules/${names.folderKebab}.module";`;
  if (text.includes(moduleClass)) {
    console.warn(`app.module.ts ya importa ${moduleClass}, no se modifica.`);
    return;
  }
  const lastModuleImport = text.lastIndexOf('from "./tasks/infrastructure/modules/tasks.module";');
  if (lastModuleImport !== -1) {
    const insertAt = text.indexOf("\n", lastModuleImport) + 1;
    text = text.slice(0, insertAt) + importLine + "\n" + text.slice(insertAt);
  } else {
    const m = text.match(/import.*Module.*from "\.\/[^"]+\.module";/g);
    if (m && m.length) {
      const last = m[m.length - 1];
      const idx = text.lastIndexOf(last);
      const insertAt = text.indexOf("\n", idx) + 1;
      text = text.slice(0, insertAt) + importLine + "\n" + text.slice(insertAt);
    } else {
      console.warn("No se encontró ancla de import en app.module.ts; añade el import a mano.");
      return;
    }
  }
  if (!text.includes(`${moduleClass},`)) {
    text = text.replace(
      /TasksModule,\s*\n/,
      `TasksModule,\n    ${moduleClass},\n`
    );
  }
  fs.writeFileSync(appPath, text, "utf8");
  console.log(`Actualizado: ${path.relative(root, appPath)}`);
}

function main() {
  const { nameArg, force } = parseArgs();
  const names = resolveNames(nameArg);
  const base = path.join(srcDir, names.folderKebab);
  if (fs.existsSync(base) && !force) {
    console.error(
      `El directorio ${path.relative(root, base)} ya existe. Usa --force para sobrescribir.`
    );
    process.exit(1);
  }

  const profile = detectProfile(names);
  console.log(`Perfil: ${profile} → carpeta src/${names.folderKebab}, entidad ${names.entityPascal}`);

  if (!schemaExists(names)) {
    writeFile(schemaPath(names), renderGenericSchema(names), force);
  } else {
    console.log(
      `Schema existente: ${path.relative(root, schemaPath(names))} (no se sobrescribe)`
    );
  }

  const domainDto =
    profile === "loginLog"
      ? `export type LoginLogDto = {
  id: string;
  userId: string;
  email: string;
  from: string;
  loginAt: Date;
};`
      : `export type ${names.entityPascal}Dto = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};`;

  const entityFile =
    profile === "loginLog"
      ? `import { LoginLogDto } from "./dtos/login-log.dto";

export class LoginLog {
  constructor(protected props: LoginLogDto) {}

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      email: this.props.email,
      from: this.props.from,
      loginAt: this.props.loginAt,
    };
  }
}
`
      : `import { ${names.entityPascal}Dto } from "./dtos/${names.entityKebabSingular}.dto";

export class ${names.entityPascal} {
  constructor(protected props: ${names.entityPascal}Dto) {}

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      title: this.props.title,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
`;

  const voFile =
    profile === "loginLog"
      ? `export class LoginLogStoreValueObject {
  constructor(
    private readonly userId: string,
    private readonly email: string,
    private readonly from: string,
    private readonly loginAt: Date = new Date()
  ) {}

  getUserId(): string {
    return this.userId;
  }
  getEmail(): string {
    return this.email;
  }
  getFrom(): string {
    return this.from;
  }
  getLoginAt(): Date {
    return this.loginAt;
  }
}
`
      : `export class ${names.entityPascal}StoreValueObject {
  constructor(
    private readonly userId: string,
    private readonly title: string
  ) {}

  getUserId(): string {
    return this.userId;
  }
  getTitle(): string {
    return this.title;
  }
}
`;

  const repoInterface = `import { ${names.entityPascal} } from "../${names.entityKebabSingular}";
import { ${names.entityPascal}StoreValueObject } from "../valueObjects/${names.entityKebabSingular}.store.valueObject";

export interface ${names.pluralPascal}Repository {
  findAllByUserId(userId: string): Promise<${names.entityPascal}[]>;
  store(vo: ${names.entityPascal}StoreValueObject): Promise<${names.entityPascal}>;
}
`;

  const exceptionFile = `import { Exceptions } from "src/shared/domain/exceptions/exceptions";

export class ${names.entityPascal}NotFoundException extends Exceptions {
  constructor(id: string) {
    super(\`${names.entityPascal} con id \${id} no encontrado\`);
    this.name = "${names.entityPascal}NotFoundException";
  }
}
`;

  const indexUseCase = `import { Inject, Injectable } from "@nestjs/common";
import { ${names.pluralPascal}Repository } from "../domain/repositories/${names.folderKebab}.repository";
import { ${names.entityPascal} } from "../domain/${names.entityKebabSingular}";

@Injectable()
export class ${names.pluralPascal}IndexUseCase {
  constructor(
    @Inject("${names.repoToken}")
    private readonly repo: ${names.pluralPascal}Repository
  ) {}

  async execute(userId: string): Promise<${names.entityPascal}[]> {
    return this.repo.findAllByUserId(userId);
  }
}
`;

  const storeUseCase = `import { Inject, Injectable } from "@nestjs/common";
import { ${names.pluralPascal}Repository } from "../domain/repositories/${names.folderKebab}.repository";
import { ${names.entityPascal} } from "../domain/${names.entityKebabSingular}";
import { ${names.entityPascal}StoreValueObject } from "../domain/valueObjects/${names.entityKebabSingular}.store.valueObject";
import { ${names.pluralPascal}StoreDTO } from "../infrastructure/dtos/${names.folderKebab}.store.dto";

@Injectable()
export class ${names.pluralPascal}StoreUseCase {
  constructor(
    @Inject("${names.repoToken}")
    private readonly repo: ${names.pluralPascal}Repository
  ) {}

  async execute(
    body: ${names.pluralPascal}StoreDTO,
    userId: string
  ): Promise<${names.entityPascal}> {
    const vo = new ${names.entityPascal}StoreValueObject(
      ${profile === "loginLog" ? `userId,
      body.email,
      body.from,
      body.loginAt ?? new Date()` : "userId, body.title"}
    );
    return this.repo.store(vo);
  }
}
`;

  const storeDto =
    profile === "loginLog"
      ? `import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";

export class ${names.pluralPascal}StoreDTO {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  from!: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  loginAt?: Date;
}
`
      : `import { IsNotEmpty, IsString } from "class-validator";

export class ${names.pluralPascal}StoreDTO {
  @IsString()
  @IsNotEmpty()
  title!: string;
}
`;

  const implFile =
    profile === "loginLog"
      ? `import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ${names.pluralPascal}Repository } from "src/${names.folderKebab}/domain/repositories/${names.folderKebab}.repository";
import { LoginLog } from "src/${names.folderKebab}/domain/${names.entityKebabSingular}";
import { LoginLogStoreValueObject } from "src/${names.folderKebab}/domain/valueObjects/${names.entityKebabSingular}.store.valueObject";
import { LoginLogModel, LoginLogDocument } from "src/shared/infrastructure/mongo/schemas/login-log.schema";

@Injectable()
export class ${names.implClass} implements ${names.pluralPascal}Repository {
  constructor(
    @InjectModel(LoginLogModel.name)
    private readonly model: Model<LoginLogDocument>
  ) {}

  async store(vo: LoginLogStoreValueObject): Promise<LoginLog> {
    const created = await this.model.create({
      userId: vo.getUserId(),
      email: vo.getEmail(),
      from: vo.getFrom(),
      loginAt: vo.getLoginAt(),
    });
    return new LoginLog({
      id: String(created._id),
      userId: created.userId,
      email: created.email,
      from: created.from,
      loginAt: created.loginAt,
    });
  }

  async findAllByUserId(userId: string): Promise<LoginLog[]> {
    const docs = await this.model
      .find({ userId })
      .sort({ loginAt: -1 })
      .lean()
      .exec();
    return docs.map(
      (d) =>
        new LoginLog({
          id: String(d._id),
          userId: d.userId,
          email: d.email,
          from: d.from,
          loginAt: d.loginAt,
        })
    );
  }
}
`
      : `import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ${names.pluralPascal}Repository } from "src/${names.folderKebab}/domain/repositories/${names.folderKebab}.repository";
import { ${names.entityPascal} } from "src/${names.folderKebab}/domain/${names.entityKebabSingular}";
import { ${names.entityPascal}StoreValueObject } from "src/${names.folderKebab}/domain/valueObjects/${names.entityKebabSingular}.store.valueObject";
import {
  ${names.modelClass},
  ${names.entityPascal}Document,
} from "src/shared/infrastructure/mongo/schemas/${names.entityKebabSingular}.schema";

@Injectable()
export class ${names.implClass} implements ${names.pluralPascal}Repository {
  constructor(
    @InjectModel(${names.modelClass}.name)
    private readonly model: Model<${names.entityPascal}Document>
  ) {}

  async store(vo: ${names.entityPascal}StoreValueObject): Promise<${names.entityPascal}> {
    const created = await this.model.create({
      userId: new Types.ObjectId(vo.getUserId()),
      title: vo.getTitle(),
    });
    return new ${names.entityPascal}({
      id: String(created._id),
      userId: (created.userId as Types.ObjectId).toString(),
      title: created.title,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findAllByUserId(userId: string): Promise<${names.entityPascal}[]> {
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map(
      (d) =>
        new ${names.entityPascal}({
          id: String(d._id),
          userId: (d.userId as Types.ObjectId).toString(),
          title: d.title,
          createdAt: (d as { createdAt: Date }).createdAt,
          updatedAt: (d as { updatedAt: Date }).updatedAt,
        })
    );
  }
}
`;

  const indexController = `import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ${names.pluralPascal}IndexUseCase } from "src/${names.folderKebab}/application/${names.folderKebab}.index.useCase";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";

@Controller("${names.folderKebab}")
export class ${names.pluralPascal}IndexController {
  constructor(private readonly indexUseCase: ${names.pluralPascal}IndexUseCase) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async index(@Req() req: RequestWithUser) {
    const rows = await this.indexUseCase.execute(req.user.id);
    return rows.map((r) => r.toJSON());
  }
}
`;

  const storeController = `import { Controller, Post, Body, Req, UseGuards } from "@nestjs/common";
import { ${names.pluralPascal}StoreUseCase } from "src/${names.folderKebab}/application/${names.folderKebab}.store.useCase";
import { ${names.pluralPascal}StoreDTO } from "../dtos/${names.folderKebab}.store.dto";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";
import { RequestWithUser } from "src/shared/infrastructure/types/request-with-user.type";

@Controller("${names.folderKebab}")
export class ${names.pluralPascal}StoreController {
  constructor(private readonly storeUseCase: ${names.pluralPascal}StoreUseCase) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async store(
    @Body() body: ${names.pluralPascal}StoreDTO,
    @Req() req: RequestWithUser
  ) {
    const row = await this.storeUseCase.execute(body, req.user.id);
    return row.toJSON();
  }
}
`;

  const mogooseFeat =
    profile === "loginLog"
      ? `import { LoginLogModel, LoginLogSchema } from "src/shared/infrastructure/mongo/schemas/login-log.schema";
`
      : `import { ${names.modelClass}, ${names.entityPascal}Schema } from "src/shared/infrastructure/mongo/schemas/${names.entityKebabSingular}.schema";
`;

  const moduleFileFixed = `import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
${mogooseFeat}import { ${names.pluralPascal}IndexController } from "../controllers/${names.folderKebab}.index.controller";
import { ${names.pluralPascal}StoreController } from "../controllers/${names.folderKebab}.store.controller";
import { ${names.pluralPascal}IndexUseCase } from "src/${names.folderKebab}/application/${names.folderKebab}.index.useCase";
import { ${names.pluralPascal}StoreUseCase } from "src/${names.folderKebab}/application/${names.folderKebab}.store.useCase";
import { ${names.implClass} } from "../implementations/mongo/${names.folderKebab}.mongo.implementation";
import { JwtStrategy } from "src/shared/infrastructure/strategies/jwt.strategy";
import { JwtAuthGuard } from "src/shared/infrastructure/guards/jwt-auth.guard";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ${profile === "loginLog" ? "LoginLogModel.name" : `${names.modelClass}.name`},
        schema: ${profile === "loginLog" ? "LoginLogSchema" : `${names.entityPascal}Schema`},
      },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "secretKey",
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [${names.pluralPascal}IndexController, ${names.pluralPascal}StoreController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    ${names.pluralPascal}IndexUseCase,
    ${names.pluralPascal}StoreUseCase,
    {
      provide: "${names.repoToken}",
      useClass: ${names.implClass},
    },
  ],
})
export class ${names.pluralPascal}Module {}
`;

  const files = [
    [path.join(base, `domain/dtos/${names.entityKebabSingular}.dto.ts`), domainDto],
    [path.join(base, `domain/${names.entityKebabSingular}.ts`), entityFile],
    [path.join(base, `domain/valueObjects/${names.entityKebabSingular}.store.valueObject.ts`), voFile],
    [path.join(base, `domain/repositories/${names.folderKebab}.repository.ts`), repoInterface],
    [
      path.join(base, `domain/exceptions/${names.entityKebabSingular}-not-found.exception.ts`),
      exceptionFile,
    ],
    [path.join(base, `application/${names.folderKebab}.index.useCase.ts`), indexUseCase],
    [path.join(base, `application/${names.folderKebab}.store.useCase.ts`), storeUseCase],
    [path.join(base, `infrastructure/dtos/${names.folderKebab}.store.dto.ts`), storeDto],
    [
      path.join(base, `infrastructure/controllers/${names.folderKebab}.index.controller.ts`),
      indexController,
    ],
    [
      path.join(base, `infrastructure/controllers/${names.folderKebab}.store.controller.ts`),
      storeController,
    ],
    [
      path.join(base, `infrastructure/implementations/mongo/${names.folderKebab}.mongo.implementation.ts`),
      implFile,
    ],
    [path.join(base, `infrastructure/modules/${names.folderKebab}.module.ts`), moduleFileFixed],
  ];

  for (const [fp, content] of files) {
    writeFile(fp, content, force);
  }

  patchAppModule(names, force);
  console.log("\nListo. Revisa rutas bajo /" + names.folderKebab + " y ejecuta npm run build.");
}

main();
