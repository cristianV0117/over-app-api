import { IUploadedFile } from "./uploaded-file.interface";

export interface IStorageService {
  /**
   * Saves a file and returns the public URL or path to access it.
   */
  save(
    file: IUploadedFile,
    folder: string,
    filename?: string
  ): Promise<string>;
}
