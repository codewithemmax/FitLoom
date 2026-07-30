import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import { validateVendorResponse } from '../middleware/validate.js';

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

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().min(1) })).min(1),
        }),
      }),
    )
    .min(1),
});

const buildPrompt = (input: FitNoteInput): string => JSON.stringify({
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

export const createGeminiFitNoteService = (options: { apiKey: string; model: string }): FitNoteService => ({
  async createFitNote(input: FitNoteInput): Promise<FitPhysicsNote> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`;
      console.debug('[Gemini] createFitNote →', url.replace(/key=[^&]+/, 'key=REDACTED'), { garment: input.garment });

      const response = await fetch(url,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Gemini] HTTP error:', response.status, errText.slice(0, 300));
        throw new AppError(502, 'FIT_NOTE_FAILED', 'Fit guidance could not be generated. Please try again later.');
      }

      const payload: unknown = await response.json();
      const parsed = validateVendorResponse(geminiResponseSchema, payload);
      const text = parsed.candidates[0]?.content.parts[0]?.text;

      if (text === undefined) {
        console.error('[Gemini] no text in response:', JSON.stringify(payload).slice(0, 300));
        throw new AppError(502, 'FIT_NOTE_FAILED', 'Fit guidance could not be generated. Please try again later.');
      }

      console.debug('[Gemini] raw response text:', text.slice(0, 300));
      const note = validateVendorResponse(fitPhysicsNoteSchema, JSON.parse(text) as unknown);
      console.debug('[Gemini] fit note validated OK');
      return note;
    } catch (error: unknown) {
      if (error instanceof AppError && error.code === 'FIT_NOTE_FAILED') {
        throw error;
      }

      console.error('[Gemini] unexpected error:', error);
      throw new AppError(502, 'FIT_NOTE_FAILED', 'Fit guidance could not be generated. Please try again later.');
    }
  },
});
