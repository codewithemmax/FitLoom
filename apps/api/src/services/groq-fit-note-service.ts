import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import { validateVendorResponse } from '../middleware/validate.js';
import { buildPrompt, fitPhysicsNoteSchema, type FitNoteInput, type FitNoteService, type FitPhysicsNote } from './fit-note-service.js';

// GroqCloud exposes an OpenAI-compatible chat completions API.
const groqResponseSchema = z.object({
  choices: z
    .array(z.object({ message: z.object({ content: z.string().min(1) }) }))
    .min(1),
});

const DISCLAIMER = 'Guidance only; not a physical-fit or size guarantee.';

// Mirrors the shape of fitPhysicsNoteSchema so the model is constrained to a
// directly parseable note. Strict mode requires every property to be listed in
// `required` with `additionalProperties: false`, and ignores length/size
// keywords such as minLength and maxItems — fitPhysicsNoteSchema still enforces
// those bounds after parsing.
const fitPhysicsNoteJsonSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Concise overall fit-confidence guidance, at most 500 characters.' },
    stretch: { type: 'string', description: 'How the fabric is likely to stretch, at most 500 characters.' },
    structure: { type: 'string', description: 'How the garment is likely to hold its shape, at most 500 characters.' },
    pressurePoints: {
      type: 'array',
      items: { type: 'string', description: 'A likely pressure point, at most 200 characters.' },
      description: 'Between 1 and 5 likely pressure points.',
    },
    uncertainty: { type: 'string', description: 'What this guidance cannot determine, at most 500 characters.' },
    disclaimer: { type: 'string', enum: [DISCLAIMER], description: 'Must be returned verbatim.' },
  },
  required: ['summary', 'stretch', 'structure', 'pressurePoints', 'uncertainty', 'disclaimer'],
  additionalProperties: false,
};

export const createGroqFitNoteService = (options: { apiKey: string; model: string; baseUrl: string }): FitNoteService => ({
  async createFitNote(input: FitNoteInput): Promise<FitPhysicsNote> {
    try {
      const url = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      console.debug('[Groq] createFitNote →', url, { model: options.model, garment: input.garment });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: 'user', content: buildPrompt(input) }],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'fit_physics_note', strict: true, schema: fitPhysicsNoteJsonSchema },
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Groq] HTTP error:', response.status, errText.slice(0, 300));
        throw new AppError(502, 'FIT_NOTE_FAILED', 'Fit guidance could not be generated. Please try again later.');
      }

      const payload: unknown = await response.json();
      const parsed = validateVendorResponse(groqResponseSchema, payload);
      const text = parsed.choices[0]?.message.content;

      if (text === undefined) {
        console.error('[Groq] no content in response:', JSON.stringify(payload).slice(0, 300));
        throw new AppError(502, 'FIT_NOTE_FAILED', 'Fit guidance could not be generated. Please try again later.');
      }

      console.debug('[Groq] raw response text:', text.slice(0, 300));
      const note = validateVendorResponse(fitPhysicsNoteSchema, JSON.parse(text) as unknown);
      console.debug('[Groq] fit note validated OK');
      return note;
    } catch (error: unknown) {
      if (error instanceof AppError && error.code === 'FIT_NOTE_FAILED') {
        throw error;
      }

      console.error('[Groq] unexpected error:', error);
      throw new AppError(502, 'FIT_NOTE_FAILED', 'Fit guidance could not be generated. Please try again later.');
    }
  },
});
