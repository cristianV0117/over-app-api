import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as fs from "fs";
import * as path from "path";
import {
  DriveNodeDocument,
  DriveNodeModel,
} from "src/shared/infrastructure/mongo/schemas/drive-node.schema";
import { IStorageService } from "src/shared/infrastructure/storage/storage.interface";
import { IUploadedFile } from "src/shared/infrastructure/storage/uploaded-file.interface";
import {
  CreateFolderDto,
  RenameNodeDto,
} from "../infrastructure/dtos/file-write.dto";

export type DriveNodeDto = {
  id: string;
  parentId: string | null;
  kind: "folder" | "file";
  name: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
  children: DriveNodeDto[];
};

const ALLOWED_EXT = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".txt",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".zip",
]);

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(DriveNodeModel.name)
    private readonly model: Model<DriveNodeDocument>,
    @Inject("StorageService")
    private readonly storage: IStorageService
  ) {}

  async tree(userId: string): Promise<DriveNodeDto[]> {
    const docs = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    return this.buildTree(docs);
  }

  async createFolder(
    userId: string,
    body: CreateFolderDto
  ): Promise<DriveNodeDto> {
    const name = this.normalizeName(body.name);
    const parentId = await this.resolveParent(userId, body.parentId ?? null);
    try {
      const created = await this.model.create({
        userId: new Types.ObjectId(userId),
        parentId,
        kind: "folder",
        name,
      });
      return this.toDto(created.toObject(), []);
    } catch (err) {
      this.throwIfDuplicate(err);
      throw err;
    }
  }

  async rename(
    userId: string,
    id: string,
    body: RenameNodeDto
  ): Promise<DriveNodeDto> {
    const node = await this.findOwned(userId, id);
    node.name = this.normalizeName(body.name);
    try {
      await node.save();
    } catch (err) {
      this.throwIfDuplicate(err);
      throw err;
    }
    return this.toDto(node.toObject(), []);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const node = await this.findOwned(userId, id);
    const nodeId = new Types.ObjectId(String(node._id));
    const descendants = await this.collectDescendants(userId, nodeId);
    const all = [node.toObject(), ...descendants];
    for (const item of all) {
      if (item.kind === "file" && item.url) this.deleteLocalFile(item.url);
    }
    await this.model.deleteMany({
      userId: new Types.ObjectId(userId),
      _id: { $in: all.map((n) => n._id) },
    });
    return { ok: true };
  }

  async upload(
    userId: string,
    parentIdRaw: string | null | undefined,
    file: IUploadedFile
  ): Promise<DriveNodeDto> {
    this.assertAllowedFile(file);
    const parentId = await this.resolveParent(userId, parentIdRaw ?? null);
    const name = await this.nextAvailableName(
      userId,
      parentId,
      this.uniqueFileName(file.originalname)
    );
    const id = new Types.ObjectId();
    const ext = path.extname(file.originalname || "").toLowerCase() || ".bin";
    const url = await this.storage.save(
      file,
      `files/${userId}`,
      `${id.toString()}${ext}`
    );
    try {
      const created = await this.model.create({
        _id: id,
        userId: new Types.ObjectId(userId),
        parentId,
        kind: "file",
        name,
        url,
        mimeType: file.mimetype || "application/octet-stream",
        size: file.size ?? null,
      });
      return this.toDto(created.toObject(), []);
    } catch (err) {
      this.deleteLocalFile(url);
      this.throwIfDuplicate(err);
      throw err;
    }
  }

  async getFile(userId: string, id: string): Promise<{
    filepath: string;
    mimeType: string;
    fileName: string;
  }> {
    const node = await this.findOwned(userId, id);
    if (node.kind !== "file" || !node.url) {
      throw new BadRequestException("Ese elemento no es un archivo");
    }
    const filepath = this.resolveLocalPath(node.url);
    if (!filepath || !fs.existsSync(filepath)) {
      throw new NotFoundException("Archivo no encontrado en disco");
    }
    return {
      filepath,
      mimeType: node.mimeType || "application/octet-stream",
      fileName: node.name,
    };
  }

  private async resolveParent(
    userId: string,
    parentId: string | null
  ): Promise<Types.ObjectId | null> {
    if (!parentId) return null;
    if (!Types.ObjectId.isValid(parentId)) {
      throw new BadRequestException("Carpeta destino inválida");
    }
    const parent = await this.model
      .findOne({
        _id: new Types.ObjectId(parentId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!parent) throw new NotFoundException("Carpeta no encontrada");
    if (parent.kind !== "folder") {
      throw new BadRequestException("Solo puedes guardar dentro de una carpeta");
    }
    return new Types.ObjectId(String(parent._id));
  }

  private async findOwned(userId: string, id: string): Promise<DriveNodeDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Identificador inválido");
    }
    const node = await this.model
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!node) throw new NotFoundException("No encontrado");
    return node;
  }

  private async collectDescendants(
    userId: string,
    parentId: Types.ObjectId
  ): Promise<Array<Record<string, any>>> {
    const uid = new Types.ObjectId(userId);
    const acc: Array<Record<string, any>> = [];
    const queue: Types.ObjectId[] = [parentId];
    while (queue.length) {
      const current = queue.shift()!;
      const children = await this.model
        .find({ userId: uid, parentId: current })
        .lean()
        .exec();
      for (const child of children) {
        acc.push(child);
        if (child.kind === "folder") {
          queue.push(new Types.ObjectId(String(child._id)));
        }
      }
    }
    return acc;
  }

  private buildTree(docs: Array<Record<string, any>>): DriveNodeDto[] {
    const byParent = new Map<string, Array<Record<string, any>>>();
    for (const doc of docs) {
      const key = doc.parentId ? String(doc.parentId) : "root";
      const list = byParent.get(key) ?? [];
      list.push(doc);
      byParent.set(key, list);
    }
    const sortNodes = (a: Record<string, any>, b: Record<string, any>) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return String(a.name).localeCompare(String(b.name), "es", {
        sensitivity: "base",
      });
    };
    const walk = (parentKey: string): DriveNodeDto[] => {
      const children = (byParent.get(parentKey) ?? []).sort(sortNodes);
      return children.map((doc) =>
        this.toDto(doc, walk(String(doc._id)))
      );
    };
    return walk("root");
  }

  private toDto(
    doc: Record<string, any>,
    children: DriveNodeDto[]
  ): DriveNodeDto {
    return {
      id: String(doc._id),
      parentId: doc.parentId ? String(doc.parentId) : null,
      kind: doc.kind,
      name: doc.name,
      mimeType: doc.mimeType ?? null,
      size: typeof doc.size === "number" ? doc.size : null,
      createdAt: doc.createdAt
        ? new Date(doc.createdAt).toISOString()
        : "",
      updatedAt: doc.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : "",
      children,
    };
  }

  private normalizeName(raw: string): string {
    const name = raw.replace(/[\\/]/g, " ").replace(/\s+/g, " ").trim();
    if (!name) throw new BadRequestException("El nombre es obligatorio");
    if (name === "." || name === "..") {
      throw new BadRequestException("Nombre no permitido");
    }
    return name.slice(0, 120);
  }

  private uniqueFileName(original: string): string {
    const base = path.basename(original || "archivo");
    return this.normalizeName(base);
  }

  private async nextAvailableName(
    userId: string,
    parentId: Types.ObjectId | null,
    desired: string
  ): Promise<string> {
    const siblings = await this.model
      .find({
        userId: new Types.ObjectId(userId),
        parentId,
      })
      .select("name")
      .lean()
      .exec();
    const taken = new Set(
      siblings.map((s) => String(s.name).toLowerCase())
    );
    if (!taken.has(desired.toLowerCase())) return desired;
    const ext = path.extname(desired);
    const stem = ext ? desired.slice(0, -ext.length) : desired;
    let i = 2;
    while (taken.has(`${stem} (${i})${ext}`.toLowerCase())) i += 1;
    return `${stem} (${i})${ext}`;
  }

  private assertAllowedFile(file: IUploadedFile): void {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mimeOk = ALLOWED_MIME.has(file.mimetype);
    const extOk = ALLOWED_EXT.has(ext);
    if (!mimeOk && !extOk) {
      throw new BadRequestException(
        "Tipo de archivo no permitido. Usa PDF, imagen, Word, Excel, CSV, TXT o ZIP"
      );
    }
    if (!extOk) {
      throw new BadRequestException("Extensión de archivo no permitida");
    }
  }

  private throwIfDuplicate(err: unknown): void {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      throw new ConflictException(
        "Ya existe un elemento con ese nombre en esta carpeta"
      );
    }
  }

  private resolveLocalPath(url: string): string | null {
    const idx = url.indexOf("/uploads/");
    const relative =
      idx >= 0 ? url.slice(idx) : url.startsWith("/uploads/") ? url : null;
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
}
