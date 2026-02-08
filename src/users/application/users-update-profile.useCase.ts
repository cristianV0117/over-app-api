import { Inject, Injectable } from "@nestjs/common";
import { IStorageService } from "src/shared/infrastructure/storage/storage.interface";
import { IUploadedFile } from "src/shared/infrastructure/storage/uploaded-file.interface";
import { UsersLoginRepository } from "../domain/repositories/users-login.repository";
import { User } from "../domain/user";

@Injectable()
export class UsersUpdateProfileUseCase {
  constructor(
    @Inject("UsersLoginRepository")
    private readonly usersLoginRepository: UsersLoginRepository,
    @Inject("StorageService")
    private readonly storage: IStorageService
  ) { }

  async execute(
    userId: string,
    data: { name?: string },
    file?: IUploadedFile
  ): Promise<User | null> {
    const update: { name?: string; avatarUrl?: string } = { ...data };

    if (file) {
      const avatarUrl = await this.storage.save(file, "avatars");
      update.avatarUrl = avatarUrl;
    }

    if (Object.keys(update).length === 0) return null;
    return this.usersLoginRepository.updateProfile(userId, update);
  }
}
