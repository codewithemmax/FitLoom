import { randomUUID } from 'node:crypto';

import type { FitPhysicsNote } from './fit-note-service.js';

export type CurrentTryOnResult = {
  id: string;
  userId: string;
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  fitPhysicsNote: FitPhysicsNote;
  garment: {
    category: 'top' | 'outerwear';
    title: string;
    sourceUrl: string;
    cut?: string;
    composition?: string;
    sizeChartHints?: string;
  };
  createdAt: string;
};

export type CurrentResultStore = {
  put(result: Omit<CurrentTryOnResult, 'id' | 'createdAt'>): CurrentTryOnResult;
  getForUser(userId: string, resultId: string): CurrentTryOnResult | null;
  deleteForUser(userId: string, resultId: string): void;
};

export const createInMemoryCurrentResultStore = (): CurrentResultStore => {
  const results = new Map<string, CurrentTryOnResult>();

  return {
    put(result): CurrentTryOnResult {
      const stored = { ...result, id: randomUUID(), createdAt: new Date().toISOString() };
      results.set(stored.id, stored);
      return stored;
    },
    getForUser(userId, resultId): CurrentTryOnResult | null {
      const result = results.get(resultId);
      return result?.userId === userId ? result : null;
    },
    deleteForUser(userId, resultId): void {
      const result = results.get(resultId);
      if (result?.userId === userId) {
        results.delete(resultId);
      }
    },
  };
};
