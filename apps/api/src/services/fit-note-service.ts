import { z } from 'zod';

import { AppError } from '../errors/app-error.js';

export const fitPhysicsNoteSchema = z.object({
  summary: z.string().min(1).max(500),
  stretch: z.string().min(1).max(500),
  structure: z.string().min(1).max(500),
  pressurePoints: z.array(z.string().min(1).max(200)).min(1).max(5),
  uncertainty: z.string().min(1).max(500),
  disclaimer: z.literal('Guidance only; not a physical-fit or size guarantee.'),
});

export type FitPhysicsNote = z.infer<typeof fitPhysicsNoteSchema>;

export type FitNoteInput = {
  garment: {
    category: 'top' | 'outerwear';
    title: string;
    sourceUrl: string;
    cut?: string;
    composition?: string;
    sizeChartHints?: string;
  };
  profile?: {
    height?: string;
    usualSize?: string;
    fitPreferences?: string;
  };
};

export type FitNoteService = {
  createFitNote(input: FitNoteInput): Promise<FitPhysicsNote>;
};

export const createUnavailableFitNoteService = (): FitNoteService => ({
  async createFitNote(): Promise<FitPhysicsNote> {
    throw new AppError(502, 'FIT_NOTE_FAILED', 'Fit guidance could not be generated. Please try again later.');
  },
});

export const buildPrompt = (input: FitNoteInput): string => JSON.stringify({
  instruction:
    'Return only JSON matching the schema. Write concise fit-confidence guidance, not a size guarantee or physical simulation claim. Explain stretch, structure, likely pressure points, and uncertainty.',
  schema: {
    summary: 'string',
    stretch: 'string',
    structure: 'string',
    pressurePoints: ['string'],
    uncertainty: 'string',
    disclaimer: 'Guidance only; not a physical-fit or size guarantee.',
  },
  garment: input.garment,
  profile: input.profile ?? {},
});
