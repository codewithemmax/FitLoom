export const safeSearchOutcomes = ['safe', 'unsafe', 'indeterminate'] as const;
export type SafeSearchOutcome = (typeof safeSearchOutcomes)[number];

export type SafeSearchService = {
  moderateImage(image: Buffer): Promise<SafeSearchOutcome>;
};

export type SafeSearchLikelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';

export type SafeSearchAnnotation = Record<'adult' | 'spoof' | 'medical' | 'violence' | 'racy', SafeSearchLikelihood>;

const blockLikelihoods = new Set<SafeSearchLikelihood>(['POSSIBLE', 'LIKELY', 'VERY_LIKELY']);
const safeLikelihoods = new Set<SafeSearchLikelihood>(['VERY_UNLIKELY', 'UNLIKELY']);

export const classifySafeSearchAnnotation = (annotation: Partial<SafeSearchAnnotation> | null | undefined): SafeSearchOutcome => {
  if (annotation === null || annotation === undefined) {
    return 'indeterminate';
  }

  const values = [annotation.adult, annotation.spoof, annotation.medical, annotation.violence, annotation.racy];
  if (values.some((value) => value === undefined || value === 'UNKNOWN')) {
    return 'indeterminate';
  }

  if (values.some((value) => value !== undefined && blockLikelihoods.has(value))) {
    return 'unsafe';
  }

  if (values.every((value) => value !== undefined && safeLikelihoods.has(value))) {
    return 'safe';
  }

  return 'indeterminate';
};

export const createUnavailableSafeSearchService = (): SafeSearchService => ({
  async moderateImage(): Promise<SafeSearchOutcome> {
    return 'indeterminate';
  },
});
