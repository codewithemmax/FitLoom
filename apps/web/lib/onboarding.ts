import { z } from 'zod';

export const profileSchema = z.object({
  height: z.string().trim().min(2, 'Enter your height.').max(80, 'Use 80 characters or fewer.'),
  usualSize: z.string().trim().min(1, 'Enter your usual size.').max(80, 'Use 80 characters or fewer.'),
  fitPreferences: z.string().trim().min(2, 'Share at least one fit preference.').max(1000, 'Use 1000 characters or fewer.'),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export type OnboardingStatus = {
  hasConsent: boolean;
  hasProfile: boolean;
  isComplete: boolean;
};

export const getOnboardingStatus = async (userId: string, supabase: ReturnType<typeof import('@supabase/ssr').createServerClient>): Promise<OnboardingStatus> => {
  const [{ data: consent }, { data: profile }] = await Promise.all([
    supabase.from('photo_consents').select('accepted_at').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('height,usual_size,fit_preferences,onboarding_complete').eq('user_id', userId).maybeSingle(),
  ]);

  const hasConsent = consent?.accepted_at !== undefined && consent.accepted_at !== null;
  const hasProfile = Boolean(profile?.height && profile.usual_size && profile.fit_preferences && profile.onboarding_complete === true);

  return { hasConsent, hasProfile, isComplete: hasConsent && hasProfile };
};
