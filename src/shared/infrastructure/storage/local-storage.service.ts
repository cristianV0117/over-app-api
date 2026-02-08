import { Injectable } from "@nestjs/common";
import { IStorageService } from "./storage.interface";
import { IUploadedFile } from "./uploaded-file.interface";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), "uploads");
  }

  async save(
    file: IUploadedFile,
    folder: string,
    customFilename?: string
  ): Promise<string> {
    const dir = path.join(this.uploadsDir, folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || ".jpg";
    const filename =
      customFilename || `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const relativePath = `/${path.join("uploads", folder, filename).replace(/\\/g, "/")}`;
    const baseUrl = process.env.BACKEND_URL;
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, "")}${relativePath}`;
    }
    return relativePath;
  }
}
