/**
 * Shape of an uploaded file (Multer-compatible).
 * Use this instead of Express.Multer.File to avoid global type issues.
 */
export interface IUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}
