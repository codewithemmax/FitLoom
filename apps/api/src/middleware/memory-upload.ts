import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError } from '../errors/app-error.js';

export type UploadedMemoryFile = {
  fieldName: 'basePhoto' | 'garmentImage';
  originalName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  buffer: Buffer;
};


const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedFileFields = new Set(['basePhoto', 'garmentImage']);

const parseHeaderParams = (header: string): Record<string, string> => {
  const params: Record<string, string> = {};

  for (const part of header.split(';').slice(1)) {
    const [rawKey, rawValue] = part.trim().split('=');
    if (rawKey !== undefined && rawValue !== undefined) {
      params[rawKey] = rawValue.replace(/^"|"$/g, '');
    }
  }

  return params;
};

const readBody = async (request: Request, byteLimit: number): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
    totalBytes += buffer.length;

    if (totalBytes > byteLimit) {
      throw new AppError(413, 'INVALID_REQUEST', 'The request data is invalid.');
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
};

export const createMemoryUploadMiddleware = (options: { fileSizeLimitBytes: number; totalSizeLimitBytes: number }): RequestHandler =>
  async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    try {
      const contentType = request.header('content-type') ?? '';
      const boundaryMatch = /boundary=([^;]+)/u.exec(contentType);

      if (!contentType.startsWith('multipart/form-data') || boundaryMatch?.[1] === undefined) {
        throw new AppError(400, 'INVALID_REQUEST', 'The request data is invalid.');
      }

      const boundary = `--${boundaryMatch[1]}`;
      const body = await readBody(request, options.totalSizeLimitBytes);
      const files: Partial<Record<UploadedMemoryFile['fieldName'], UploadedMemoryFile>> = {};
      const fields: Record<string, string> = {};

      for (const rawPart of body.toString('binary').split(boundary)) {
        if (rawPart === '' || rawPart === '--\r\n' || rawPart === '--') {
          continue;
        }

        const normalizedPart = rawPart.replace(/^\r\n/u, '').replace(/\r\n--$/u, '');
        const [rawHeaders, ...contentParts] = normalizedPart.split('\r\n\r\n');
        const content = contentParts.join('\r\n\r\n').replace(/\r\n$/u, '');
        const disposition = rawHeaders?.split('\r\n').find((header) => header.toLowerCase().startsWith('content-disposition'));

        if (disposition === undefined) {
          continue;
        }

        const params = parseHeaderParams(disposition);
        const fieldName = params.name;
        if (fieldName === undefined) {
          continue;
        }

        const fileName = params.filename;
        if (fileName === undefined) {
          fields[fieldName] = Buffer.from(content, 'binary').toString('utf8');
          continue;
        }

        if (!allowedFileFields.has(fieldName)) {
          throw new AppError(400, 'INVALID_REQUEST', 'The request data is invalid.');
        }

        const contentTypeHeader = rawHeaders?.split('\r\n').find((header) => header.toLowerCase().startsWith('content-type'));
        const mimeType = contentTypeHeader?.split(':')[1]?.trim();
        const fileBuffer = Buffer.from(content, 'binary');

        if (!allowedMimeTypes.has(mimeType ?? '') || fileBuffer.length > options.fileSizeLimitBytes || fileBuffer.length === 0) {
          throw new AppError(400, 'INVALID_REQUEST', 'The request data is invalid.');
        }

        files[fieldName as UploadedMemoryFile['fieldName']] = {
          fieldName: fieldName as UploadedMemoryFile['fieldName'],
          originalName: fileName,
          mimeType: mimeType as UploadedMemoryFile['mimeType'],
          buffer: fileBuffer,
        };
      }

      request.uploadedFiles = files;
      request.uploadedFields = fields;
      next();
    } catch (error: unknown) {
      next(error instanceof AppError ? error : new AppError(400, 'INVALID_REQUEST', 'The request data is invalid.'));
    }
  };
