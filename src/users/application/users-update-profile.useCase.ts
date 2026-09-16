import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import * as path from "path";
import { IStorageService } from "src/shared/infrastructure/storage/storage.interface";
import { IUploadedFile } from "src/shared/infrastructure/storage/uploaded-file.interface";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { User } from "../domain/user";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

@Injectable()
export class UsersUpdateProfileUseCase {
  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository,
    @Inject("StorageService")
    private readonly storage: IStorageService
  ) {}

  async execute(
    userId: string,
    data: { name?: string },
    file?: IUploadedFile
  ): Promise<User | null> {
    const update: { name?: string; avatarUrl?: string } = { ...data };

    if (file) {
      this.assertAvatar(file);
      update.avatarUrl = await this.storage.save(file, "avatars");
    }

    if (Object.keys(update).length === 0) return null;
    return this.usersLoginRepository.updateProfile(userId, update);
  }

  private assertAvatar(file: IUploadedFile): void {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime) && !ALLOWED_EXT.has(ext)) {
      throw new BadRequestException("El avatar debe ser JPG, PNG o WEBP");
    }
  }
}
