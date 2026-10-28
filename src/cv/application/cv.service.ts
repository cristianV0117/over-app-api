import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  CvDocument,
  CvModel,
  CvSectionModel,
} from "src/shared/infrastructure/mongo/schemas/cv.schema";
import { CvCreateDto } from "../infrastructure/dtos/cv-create.dto";
import { CvWriteDto } from "../infrastructure/dtos/cv-write.dto";
import {
  DEFAULT_CV_THEME,
  defaultCvHeader,
  defaultCvSections,
} from "./cv.defaults";

export type CvThemeDto = {
  sidebarBg: string;
  sidebarText: string;
  sidebarMuted: string;
  accent: string;
  pageBg: string;
  heading: string;
  body: string;
  chipBg: string;
  chipText: string;
  fontFamily: string;
  repeatSidebar: boolean;
  fontScale: number;
};

export type CvHeaderDto = {
  fullName: string;
  role: string;
  location: string;
  phone: string;
  email: string;
  photoDataUrl: string;
  showPhoto: boolean;
};

export type CvSectionDto = {
  id: string;
  type: string;
  column: "sidebar" | "main";
  order: number;
  visible: boolean;
  title: string;
  config: Record<string, unknown>;
};

export type CvSummaryDto = {
  id: string;
  name: string;
  locale: "es" | "en";
  sectionCount: number;
  updatedAt: string;
};

export type CvDto = CvSummaryDto & {
  theme: CvThemeDto;
  header: CvHeaderDto;
  sections: CvSectionDto[];
  translatedFromId: string | null;
};

@Injectable()
export class CvService {
  constructor(
    @InjectModel(CvModel.name)
    private readonly model: Model<CvDocument>
  ) {}

  async listMine(userId: string): Promise<CvSummaryDto[]> {
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return docs.map((doc) => this.toSummaryDto(doc));
  }

  async getById(userId: string, cvId: string): Promise<CvDto> {
    const doc = await this.findOwned(userId, cvId);
    return this.toDto(doc);
  }

  async create(
    userId: string,
    body: CvCreateDto,
    user: { name?: string; email?: string }
  ): Promise<CvDto> {
    const name = (body.name?.trim() || "Mi CV").slice(0, 80);
    const doc = await this.model.create({
      userId: new Types.ObjectId(userId),
      name,
      locale: "es",
      translatedFromId: null,
      theme: DEFAULT_CV_THEME,
      header: defaultCvHeader(user.name ?? "", user.email ?? ""),
      sections: defaultCvSections(),
    });
    return this.toDto(doc);
  }

  async save(userId: string, cvId: string, body: CvWriteDto): Promise<CvDto> {
    const existing = await this.findOwned(userId, cvId);
    if (body.name != null) {
      existing.name = body.name.trim().slice(0, 80) || existing.name;
    }
    if (body.locale) existing.locale = body.locale;
    existing.theme = {
      ...DEFAULT_CV_THEME,
      ...this.themeToPlain(existing.theme),
      ...(body.theme ?? {}),
    };
    existing.header = {
      ...this.headerToPlain(existing.header),
      ...(body.header ?? {}),
    };
    if (body.sections) {
      existing.sections = this.normalizeSections(body.sections);
    }
    await existing.save();
    return this.toDto(existing);
  }

  async delete(userId: string, cvId: string): Promise<{ ok: true }> {
    const doc = await this.findOwned(userId, cvId);
    await doc.deleteOne();
    return { ok: true };
  }

  async translateToEnglish(userId: string, cvId: string): Promise<CvDto> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Falta OPENAI_API_KEY en el servidor. Configúrala para traducir el CV."
      );
    }

    const source = await this.findOwned(userId, cvId);
    const sourceHeader = this.headerToPlain(source.header);
    const sourceSections = this.normalizeSections(source.sections);
    const payload = {
      header: { ...sourceHeader, photoDataUrl: "" },
      sections: stripHeavyImages(sourceSections),
    };

    const translated = await this.callTranslate(payload, apiKey);
    const name = `${source.name.replace(/\s*\(EN\)\s*$/i, "")} (EN)`.slice(0, 80);

    const doc = await this.model.create({
      userId: source.userId,
      name,
      locale: "en",
      translatedFromId: source._id,
      theme: this.themeToPlain(source.theme),
      header: {
        ...translated.header,
        photoDataUrl: sourceHeader.photoDataUrl,
        showPhoto: sourceHeader.showPhoto,
      },
      sections: restoreProjectImages(
        this.normalizeSections(translated.sections),
        sourceSections
      ),
    });
    return this.toDto(doc);
  }

  private normalizeSections(
    sections: Array<{
      id: string;
      type: string;
      column?: "sidebar" | "main";
      order?: number;
      visible?: boolean;
      title?: string;
      config?: Record<string, unknown>;
    }>
  ): CvSectionModel[] {
    return sections.map((s, index) => ({
      id: s.id,
      type: s.type as CvSectionModel["type"],
      column: s.column === "main" ? "main" : "sidebar",
      order: s.order ?? index,
      visible: s.visible !== false,
      title: (s.title ?? "").slice(0, 80),
      config: s.config ?? {},
    }));
  }

  private async callTranslate(
    payload: { header: CvHeaderDto; sections: CvSectionDto[] },
    apiKey: string
  ): Promise<{ header: CvHeaderDto; sections: CvSectionDto[] }> {
    const baseUrl = (
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You translate CVs from Spanish to English. Return ONLY valid JSON with the same schema: { header, sections }. Translate titles, labels, descriptions, taglines and section titles. Keep company names, URLs, emails, phones, startMonth, endMonth, current, imageDataUrl, photoDataUrl, showPhoto, institution names, course providers, and tech tags (NestJS, MongoDB, PHP, etc.). If a section type is icons, keep config.items as the same icon ids. Do not invent experience or projects.",
          },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new ServiceUnavailableException(
        err.slice(0, 280) || "El proveedor de IA no respondió"
      );
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = (data.choices?.[0]?.message?.content || "").trim();
    const jsonText = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    try {
      const parsed = JSON.parse(jsonText) as {
        header?: CvHeaderDto;
        sections?: CvSectionDto[];
      };
      return {
        header: { ...payload.header, ...(parsed.header ?? {}) },
        sections: Array.isArray(parsed.sections)
          ? parsed.sections
          : payload.sections,
      };
    } catch {
      throw new ServiceUnavailableException(
        "No pude interpretar la traducción. Inténtalo de nuevo."
      );
    }
  }

  private async findOwned(userId: string, cvId: string): Promise<CvDocument> {
    if (!Types.ObjectId.isValid(cvId)) {
      throw new NotFoundException("CV no encontrado");
    }
    const doc = await this.model.findOne({
      _id: new Types.ObjectId(cvId),
      userId: new Types.ObjectId(userId),
    });
    if (!doc) throw new NotFoundException("CV no encontrado");
    return doc;
  }

  private themeToPlain(theme: CvModel["theme"]): CvThemeDto {
    return {
      ...DEFAULT_CV_THEME,
      ...(theme
        ? {
            sidebarBg: theme.sidebarBg,
            sidebarText: theme.sidebarText,
            sidebarMuted: theme.sidebarMuted,
            accent: theme.accent,
            pageBg: theme.pageBg,
            heading: theme.heading,
            body: theme.body,
            chipBg: theme.chipBg,
            chipText: theme.chipText,
            fontFamily: theme.fontFamily || DEFAULT_CV_THEME.fontFamily,
            repeatSidebar: Boolean(theme.repeatSidebar),
            fontScale: Math.min(
              125,
              Math.max(80, Number(theme.fontScale) || DEFAULT_CV_THEME.fontScale || 100)
            ),
          }
        : {}),
    };
  }

  private headerToPlain(header: CvModel["header"]): CvHeaderDto {
    return {
      fullName: header?.fullName ?? "",
      role: header?.role ?? "",
      location: header?.location ?? "",
      phone: header?.phone ?? "",
      email: header?.email ?? "",
      photoDataUrl: header?.photoDataUrl ?? "",
      showPhoto: Boolean(header?.showPhoto),
    };
  }

  private toSummaryDto(doc: {
    _id: unknown;
    name?: string;
    locale?: string;
    sections?: unknown[];
    updatedAt?: Date;
  }): CvSummaryDto {
    return {
      id: String(doc._id),
      name: doc.name || "Mi CV",
      locale: doc.locale === "en" ? "en" : "es",
      sectionCount: Array.isArray(doc.sections) ? doc.sections.length : 0,
      updatedAt: (doc.updatedAt ?? new Date()).toISOString(),
    };
  }

  private toDto(doc: CvDocument): CvDto {
    const lean = doc.toObject ? doc.toObject() : doc;
    return {
      ...this.toSummaryDto(lean),
      theme: this.themeToPlain(lean.theme),
      header: this.headerToPlain(lean.header),
      sections: this.normalizeSections(lean.sections ?? []),
      translatedFromId: lean.translatedFromId
        ? String(lean.translatedFromId)
        : null,
    };
  }
}

function projectItems(
  config: Record<string, unknown> | undefined
): Array<Record<string, unknown>> {
  const items = config?.items;
  return Array.isArray(items) ? (items as Array<Record<string, unknown>>) : [];
}

function stripHeavyImages(sections: CvSectionModel[]): CvSectionModel[] {
  return sections.map((section) => {
    if (section.type !== "projects") return section;
    return {
      ...section,
      config: {
        ...section.config,
        items: projectItems(section.config).map((item) => ({
          ...item,
          imageDataUrl: "",
        })),
      },
    };
  });
}

function restoreProjectImages(
  translated: CvSectionModel[],
  source: CvSectionModel[]
): CvSectionModel[] {
  return translated.map((section) => {
    if (section.type !== "projects") return section;
    const original = source.find((s) => s.id === section.id);
    const originals = projectItems(original?.config);
    return {
      ...section,
      config: {
        ...section.config,
        items: projectItems(section.config).map((item, i) => ({
          ...item,
          imageDataUrl: String(
            originals[i]?.imageDataUrl ?? item.imageDataUrl ?? ""
          ),
        })),
      },
    };
  });
}
