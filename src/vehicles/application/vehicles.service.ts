import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as fs from "fs";
import * as path from "path";
import {
  VEHICLE_DOC_KINDS,
  VehicleDocKind,
  VehicleDocument,
  VehicleDocumentFile,
  VehicleModel,
} from "src/shared/infrastructure/mongo/schemas/vehicle.schema";
import { IStorageService } from "src/shared/infrastructure/storage/storage.interface";
import { IUploadedFile } from "src/shared/infrastructure/storage/uploaded-file.interface";
import {
  VehicleCreateDto,
  VehicleUpdateDto,
} from "../infrastructure/dtos/vehicle-write.dto";

export type VehicleFileDto = {
  fileName: string;
  mimeType: string;
  uploadedAt: string;
};

export type VehicleDto = {
  id: string;
  type: "moto" | "carro";
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string;
  notes: string;
  soatExpiresAt: string | null;
  technoExpiresAt: string | null;
  licenseExpiresAt: string | null;
  documents: {
    soat: VehicleFileDto | null;
    tecnomecanica: VehicleFileDto | null;
    tarjetaPropiedad: VehicleFileDto | null;
    licencia: VehicleFileDto | null;
  };
  createdAt: string;
};

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(VehicleModel.name)
    private readonly model: Model<VehicleDocument>,
    @Inject("StorageService")
    private readonly storage: IStorageService
  ) {}

  async list(userId: string): Promise<VehicleDto[]> {
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDto(d));
  }

  async create(userId: string, body: VehicleCreateDto): Promise<VehicleDto> {
    const created = await this.model.create({
      userId: new Types.ObjectId(userId),
      type: body.type,
      plate: this.normalizePlate(body.plate),
      brand: body.brand?.trim() ?? "",
      model: body.model?.trim() ?? "",
      year: body.year,
      color: body.color?.trim() ?? "",
      notes: body.notes?.trim() ?? "",
      soatExpiresAt: this.parseDate(body.soatExpiresAt),
      technoExpiresAt: this.parseDate(body.technoExpiresAt),
      licenseExpiresAt: this.parseDate(body.licenseExpiresAt),
      documents: {},
    });
    return this.toDto(created);
  }

  async update(
    userId: string,
    id: string,
    body: VehicleUpdateDto
  ): Promise<VehicleDto> {
    const $set: Record<string, unknown> = {};
    if (body.type) $set.type = body.type;
    if (body.plate !== undefined) $set.plate = this.normalizePlate(body.plate);
    if (body.brand !== undefined) $set.brand = body.brand.trim();
    if (body.model !== undefined) $set.model = body.model.trim();
    if (body.year !== undefined) $set.year = body.year;
    if (body.color !== undefined) $set.color = body.color.trim();
    if (body.notes !== undefined) $set.notes = body.notes.trim();
    if (body.soatExpiresAt !== undefined) {
      $set.soatExpiresAt = this.parseDate(body.soatExpiresAt);
    }
    if (body.technoExpiresAt !== undefined) {
      $set.technoExpiresAt = this.parseDate(body.technoExpiresAt);
    }
    if (body.licenseExpiresAt !== undefined) {
      $set.licenseExpiresAt = this.parseDate(body.licenseExpiresAt);
    }

    const doc = await this.model
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set },
        { new: true }
      )
      .exec();
    if (!doc) throw new NotFoundException("Vehículo no encontrado");
    return this.toDto(doc);
  }

  async remove(userId: string, id: string): Promise<void> {
    const doc = await this.model
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
    if (!doc) throw new NotFoundException("Vehículo no encontrado");
    for (const kind of VEHICLE_DOC_KINDS) {
      const file = doc.documents?.[kind];
      if (file?.url) this.deleteLocalFile(file.url);
    }
    await this.model.deleteOne({ _id: doc._id }).exec();
  }

  async uploadDocument(
    userId: string,
    id: string,
    kind: string,
    file: IUploadedFile
  ): Promise<VehicleDto> {
    const docKind = this.assertKind(kind);
    if (!file) throw new BadRequestException("Adjunta un archivo");
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException("Solo se permiten PDF o imágenes (jpg, png, webp)");
    }

    const vehicle = await this.model
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
    if (!vehicle) throw new NotFoundException("Vehículo no encontrado");

    const previous = vehicle.documents?.[docKind];
    if (previous?.url) this.deleteLocalFile(previous.url);

    const folder = path.join("vehicles", userId, String(vehicle._id)).replace(
      /\\/g,
      "/"
    );
    const url = await this.storage.save(file, folder, `${docKind}${path.extname(file.originalname) || ".pdf"}`);

    const next: VehicleDocumentFile = {
      url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };

    vehicle.documents = vehicle.documents || {};
    vehicle.documents[docKind] = next;
    vehicle.markModified("documents");
    await vehicle.save();
    return this.toDto(vehicle);
  }

  async removeDocument(
    userId: string,
    id: string,
    kind: string
  ): Promise<VehicleDto> {
    const docKind = this.assertKind(kind);
    const vehicle = await this.model
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
    if (!vehicle) throw new NotFoundException("Vehículo no encontrado");

    const previous = vehicle.documents?.[docKind];
    if (previous?.url) this.deleteLocalFile(previous.url);
    if (vehicle.documents) {
      vehicle.documents[docKind] = undefined;
      vehicle.markModified("documents");
    }
    await vehicle.save();
    return this.toDto(vehicle);
  }

  async getDocumentFile(
    userId: string,
    id: string,
    kind: string
  ): Promise<{ filepath: string; fileName: string; mimeType: string }> {
    const docKind = this.assertKind(kind);
    const vehicle = await this.model
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!vehicle) throw new NotFoundException("Vehículo no encontrado");
    const file = vehicle.documents?.[docKind];
    if (!file?.url) throw new NotFoundException("Documento no encontrado");
    const filepath = this.resolveLocalPath(file.url);
    if (!filepath || !fs.existsSync(filepath)) {
      throw new NotFoundException("El archivo no está en el servidor");
    }
    return {
      filepath,
      fileName: file.fileName,
      mimeType: file.mimeType,
    };
  }

  private assertKind(kind: string): VehicleDocKind {
    if (!VEHICLE_DOC_KINDS.includes(kind as VehicleDocKind)) {
      throw new BadRequestException("Tipo de documento inválido");
    }
    return kind as VehicleDocKind;
  }

  private normalizePlate(plate: string): string {
    return plate.replace(/\s+/g, "").toUpperCase();
  }

  private parseDate(value?: string | null): Date | null {
    if (value === undefined) return null;
    if (value === null || value === "") return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private resolveLocalPath(url: string): string | null {
    const idx = url.indexOf("/uploads/");
    const relative = idx >= 0 ? url.slice(idx) : url.startsWith("/uploads/") ? url : null;
    if (!relative) return null;
    const safe = path.normalize(relative.replace(/^\/+/, ""));
    if (safe.startsWith("..") || !safe.startsWith("uploads/")) return null;
    return path.join(process.cwd(), safe);
  }

  private deleteLocalFile(url: string): void {
    const filepath = this.resolveLocalPath(url);
    if (!filepath) return;
    try {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch {
      // ignore missing files
    }
  }

  private toFileDto(file?: VehicleDocumentFile | null): VehicleFileDto | null {
    if (!file?.url) return null;
    return {
      fileName: file.fileName,
      mimeType: file.mimeType,
      uploadedAt: new Date(file.uploadedAt).toISOString(),
    };
  }

  private toDto(doc: {
    _id: unknown;
    type: "moto" | "carro";
    plate: string;
    brand?: string;
    model?: string;
    year?: number;
    color?: string;
    notes?: string;
    soatExpiresAt?: Date | null;
    technoExpiresAt?: Date | null;
    licenseExpiresAt?: Date | null;
    documents?: {
      soat?: VehicleDocumentFile;
      tecnomecanica?: VehicleDocumentFile;
      tarjetaPropiedad?: VehicleDocumentFile;
      licencia?: VehicleDocumentFile;
    };
    createdAt?: Date;
  }): VehicleDto {
    return {
      id: String(doc._id),
      type: doc.type,
      plate: doc.plate,
      brand: doc.brand ?? "",
      model: doc.model ?? "",
      year: doc.year ?? null,
      color: doc.color ?? "",
      notes: doc.notes ?? "",
      soatExpiresAt: doc.soatExpiresAt
        ? new Date(doc.soatExpiresAt).toISOString()
        : null,
      technoExpiresAt: doc.technoExpiresAt
        ? new Date(doc.technoExpiresAt).toISOString()
        : null,
      licenseExpiresAt: doc.licenseExpiresAt
        ? new Date(doc.licenseExpiresAt).toISOString()
        : null,
      documents: {
        soat: this.toFileDto(doc.documents?.soat),
        tecnomecanica: this.toFileDto(doc.documents?.tecnomecanica),
        tarjetaPropiedad: this.toFileDto(doc.documents?.tarjetaPropiedad),
        licencia: this.toFileDto(doc.documents?.licencia),
      },
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    };
  }
}
