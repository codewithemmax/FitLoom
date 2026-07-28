import { z } from 'zod';

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});

export const successEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({ data, error: z.null() });

export const errorEnvelope = z.object({
  data: z.null(),
  error: apiErrorSchema,
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
export type ApiFailure = { data: null; error: { code: string; message: string } };
