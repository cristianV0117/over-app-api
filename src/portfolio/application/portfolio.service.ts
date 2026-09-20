import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  PortfolioDocument,
  PortfolioModel,
  PortfolioSectionModel,
} from "src/shared/infrastructure/mongo/schemas/portfolio.schema";
import { PortfolioCreateDto } from "../infrastructure/dtos/portfolio-create.dto";
import { PortfolioWriteDto } from "../infrastructure/dtos/portfolio-write.dto";

const RESERVED_SLUGS = new Set([
  "dashboard",
  "cristiandev",
  "login",
  "register",
  "api",
  "google-callback",
  "reset-password",
  "admin",
  "settings",
  "profile",
  "portafolio",
]);

const GRID_COLS = 12;

const DEFAULT_HEIGHTS: Record<string, number> = {
  hero: 5,
  text: 3,
  list: 4,
  accordion: 6,
  embed: 8,
  github: 4,
  image: 4,
  button: 2,
  button_group: 2,
  project: 8,
  contact: 4,
  about: 4,
  experience: 6,
  projects: 8,
  github_stats: 4,
  custom: 3,
};

export type PortfolioThemeDto = {
  background: string;
  accentFrom: string;
  accentTo: string;
  muted: string;
  line: string;
};

export type PortfolioSectionDto = {
  id: string;
  type: string;
  order: number;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  config: Record<string, unknown>;
};

export type PortfolioSummaryDto = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  publicUrl: string | null;
  blockCount: number;
  updatedAt: string;
};

export type PortfolioDto = PortfolioSummaryDto & {
  theme: PortfolioThemeDto;
  sections: PortfolioSectionDto[];
};

const DEFAULT_THEME: PortfolioThemeDto = {
  background: "#060608",
  accentFrom: "#6b2fb8",
  accentTo: "#c94b6d",
  muted: "rgba(255,255,255,0.62)",
  line: "rgba(255,255,255,0.06)",
};

const DEFAULT_SECTIONS: PortfolioSectionModel[] = [
  {
    id: "hero-1",
    type: "hero",
    order: 0,
    x: 0,
    y: 0,
    w: 12,
    h: 5,
    minW: 4,
    minH: 3,
    config: {
      greeting: "HI THERE 👋",
      title: "Tu nombre — rol",
      subtitle: "Bienvenido a mi portafolio",
      description: "Presentación personal configurable desde OVER APP.",
      imageUrl: "",
      logoUrl: "",
    },
  },
  {
    id: "list-1",
    type: "list",
    order: 1,
    x: 0,
    y: 5,
    w: 6,
    h: 4,
    minW: 3,
    minH: 2,
    config: {
      title: "Sobre mí",
      items: ["Desarrollador full stack.", "Apasionado por el backend."],
    },
  },
  {
    id: "github-1",
    type: "github",
    order: 2,
    x: 6,
    y: 5,
    w: 6,
    h: 4,
    minW: 3,
    minH: 2,
    config: { title: "GitHub", username: "" },
  },
  {
    id: "contact-1",
    type: "contact",
    order: 3,
    x: 0,
    y: 9,
    w: 12,
    h: 4,
    minW: 3,
    minH: 2,
    config: { title: "Contacto", email: "", links: [] },
  },
];

function defaultHeight(type: string): number {
  return DEFAULT_HEIGHTS[type] ?? 4;
}

function normalizeSections(
  sections: Array<Partial<PortfolioSectionModel> & { id: string; type: string; order?: number; config?: Record<string, unknown> }>
): PortfolioSectionModel[] {
  const sorted = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let stackY = 0;

  return sorted.map((s, index) => {
    const h = s.h ?? defaultHeight(s.type);
    const hasLayout =
      typeof s.x === "number" &&
      typeof s.y === "number" &&
      typeof s.w === "number" &&
      typeof s.h === "number";

    const y = hasLayout ? s.y! : stackY;
    if (!hasLayout) stackY += h;

    return {
      id: s.id,
      type: s.type as PortfolioSectionModel["type"],
      order: s.order ?? index,
      x: s.x ?? 0,
      y,
      w: s.w ?? GRID_COLS,
      h,
      minW: s.minW ?? 2,
      minH: s.minH ?? 2,
      config: s.config ?? {},
    };
  });
}

@Injectable()
export class PortfolioService implements OnModuleInit {
  constructor(
    @InjectModel(PortfolioModel.name)
    private readonly model: Model<PortfolioDocument>
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.model.collection.dropIndex("userId_1");
    } catch {
      /* índice legacy único por usuario — ignorar si no existe */
    }
  }

  async listMine(userId: string): Promise<PortfolioSummaryDto[]> {
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return docs.map((doc) => this.toSummaryDto(doc));
  }

  async getById(userId: string, portfolioId: string): Promise<PortfolioDto> {
    const doc = await this.findOwned(userId, portfolioId);
    return this.toDto(doc);
  }

  async create(userId: string, body: PortfolioCreateDto = {}): Promise<PortfolioDto> {
    const slug = await this.generateUniqueSlug(body.slug, userId);
    const name = (body.name?.trim() || "Mi portafolio").slice(0, 80);

    const doc = await this.model.create({
      userId: new Types.ObjectId(userId),
      name,
      slug,
      published: false,
      theme: DEFAULT_THEME,
      sections: DEFAULT_SECTIONS,
    });

    return this.toDto(doc);
  }

  async save(userId: string, portfolioId: string, body: PortfolioWriteDto): Promise<PortfolioDto> {
    const slug = body.slug.trim().toLowerCase();
    this.assertSlugAllowed(slug);

    const existing = await this.findOwned(userId, portfolioId);

    const slugTaken = await this.model
      .findOne({
        slug,
        _id: { $ne: existing._id },
      })
      .lean()
      .exec();
    if (slugTaken) {
      throw new ConflictException("Ese slug ya está en uso");
    }

    const rawSections = body.sections ?? existing.sections ?? DEFAULT_SECTIONS;
    const sections = normalizeSections(
      rawSections.map((s, index) => ({
        id: s.id,
        type: s.type as PortfolioSectionModel["type"],
        order: s.order ?? index,
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        minW: s.minW,
        minH: s.minH,
        config: s.config ?? {},
      }))
    );

    const theme = {
      ...DEFAULT_THEME,
      ...(existing.theme ? this.themeToPlain(existing.theme) : {}),
      ...(body.theme ?? {}),
    };

    existing.name = body.name?.trim()?.slice(0, 80) || existing.name || "Mi portafolio";
    existing.slug = slug;
    existing.published = body.published ?? existing.published;
    existing.theme = theme as PortfolioModel["theme"];
    existing.sections = sections;

    await existing.save();
    return this.toDto(existing);
  }

  async publish(userId: string, portfolioId: string): Promise<PortfolioDto> {
    const doc = await this.findOwned(userId, portfolioId);
    this.assertSlugAllowed(doc.slug);

    const slugTaken = await this.model
      .findOne({
        slug: doc.slug,
        _id: { $ne: doc._id },
        published: true,
      })
      .lean()
      .exec();
    if (slugTaken) {
      throw new ConflictException("Ese slug ya está publicado por otro portafolio");
    }

    doc.published = true;
    await doc.save();
    return this.toDto(doc);
  }

  async unpublish(userId: string, portfolioId: string): Promise<PortfolioDto> {
    const doc = await this.findOwned(userId, portfolioId);
    doc.published = false;
    await doc.save();
    return this.toDto(doc);
  }

  async delete(userId: string, portfolioId: string): Promise<{ ok: true }> {
    const doc = await this.findOwned(userId, portfolioId);
    await doc.deleteOne();
    return { ok: true };
  }

  async getPublic(slug: string): Promise<PortfolioDto> {
    const normalized = slug.trim().toLowerCase();
    const doc = await this.model
      .findOne({ slug: normalized, published: true })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException("Portafolio no encontrado");
    return this.toDto(doc);
  }

  private async findOwned(userId: string, portfolioId: string): Promise<PortfolioDocument> {
    if (!Types.ObjectId.isValid(portfolioId)) {
      throw new NotFoundException("Portafolio no encontrado");
    }
    const doc = await this.model
      .findOne({
        _id: new Types.ObjectId(portfolioId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!doc) throw new NotFoundException("Portafolio no encontrado");
    return doc;
  }

  private async generateUniqueSlug(requested: string | undefined, userId: string): Promise<string> {
    const base = requested?.trim().toLowerCase() || `portafolio-${Date.now().toString(36)}`;
    let slug = base;
    let attempt = 0;

    while (attempt < 20) {
      this.assertSlugAllowed(slug);
      const exists = await this.model.findOne({ slug }).lean().exec();
      if (!exists) return slug;
      attempt += 1;
      slug = `${base}-${attempt}`;
    }

    return `portafolio-${userId.slice(-6)}-${Date.now().toString(36)}`;
  }

  private assertSlugAllowed(slug: string): void {
    if (RESERVED_SLUGS.has(slug)) {
      throw new BadRequestException("Ese slug está reservado");
    }
  }

  private themeToPlain(theme: PortfolioModel["theme"]): PortfolioThemeDto {
    return {
      background: theme.background ?? DEFAULT_THEME.background,
      accentFrom: theme.accentFrom ?? DEFAULT_THEME.accentFrom,
      accentTo: theme.accentTo ?? DEFAULT_THEME.accentTo,
      muted: theme.muted ?? DEFAULT_THEME.muted,
      line: theme.line ?? DEFAULT_THEME.line,
    };
  }

  private toSummaryDto(doc: {
    _id?: unknown;
    name?: string;
    slug: string;
    published: boolean;
    sections?: PortfolioSectionModel[];
    updatedAt?: Date;
  }): PortfolioSummaryDto {
    return {
      id: doc._id ? String(doc._id) : "",
      name: doc.name?.trim() || doc.slug,
      slug: doc.slug,
      published: doc.published,
      publicUrl: doc.published ? `/${doc.slug}` : null,
      blockCount: doc.sections?.length ?? 0,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
    };
  }

  private toDto(doc: {
    _id?: unknown;
    name?: string;
    slug: string;
    published: boolean;
    theme: PortfolioModel["theme"];
    sections: PortfolioSectionModel[];
    updatedAt?: Date;
  }): PortfolioDto {
    const theme = this.themeToPlain(doc.theme);
    const sections = normalizeSections(doc.sections ?? []).map((s) => ({
      id: s.id,
      type: s.type,
      order: s.order,
      x: s.x,
      y: s.y,
      w: s.w,
      h: s.h,
      minW: s.minW,
      minH: s.minH,
      config: (s.config ?? {}) as Record<string, unknown>,
    }));

    return {
      ...this.toSummaryDto(doc),
      theme,
      sections,
    };
  }
}
