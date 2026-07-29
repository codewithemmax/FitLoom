import type { UploadedMemoryFile } from '../middleware/memory-upload.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
      uploadedFiles?: Partial<Record<UploadedMemoryFile['fieldName'], UploadedMemoryFile>>;
      uploadedFileLists?: Partial<Record<UploadedMemoryFile['fieldName'], UploadedMemoryFile[]>>;
      uploadedFields?: Record<string, string>;
    }
  }
}

export {};
