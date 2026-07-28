import { z } from 'zod';

export const errorCodes = [
  'AUTH_REQUIRED',
  'INVALID_REQUEST',
  'NOT_FOUND',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export const apiErrorSchema = z.object({
  code: z.enum(errorCodes),
  message: z.string().min(1),
});

export const successEnvelope = <T extends z.ZodType>(data: T): z.ZodObject<{ data: T; error: z.ZodNull }> =>
  z.object({ data, error: z.null() });

export const errorEnvelope = z.object({
  data: z.null(),
  error: apiErrorSchema,
});

export const createSuccess = <T>(data: T): ApiSuccess<T> => ({ data, error: null });

export const createFailure = (code: ErrorCode, message: string): ApiFailure => ({
  data: null,
  error: { code, message },
});

export const generateTryOnRequestSchema = z.object({
  consentAccepted: z.literal(true),
  garment: z.object({
    category: z.enum(['top', 'outerwear']),
    title: z.string().trim().min(1).max(200),
    sourceUrl: z.string().url().max(2048),
    composition: z.string().trim().max(1000).optional(),
    sizeChartHints: z.string().trim().max(2000).optional(),
  }),
});

export type GenerateTryOnRequest = z.infer<typeof generateTryOnRequestSchema>;

export const generateTryOnResponseSchema = z.object({
  imageUrl: z.string().url(),
  fitPhysicsNote: z.object({
    summary: z.string().min(1),
    guidance: z.array(z.string().min(1)),
    disclaimer: z.literal('Guidance only; not a physical-fit or size guarantee.'),
  }),
});

export type GenerateTryOnResponse = z.infer<typeof generateTryOnResponseSchema>;

export type ApiSuccess<T> = { data: T; error: null };
export type ApiFailure = { data: null; error: { code: ErrorCode; message: string } };
