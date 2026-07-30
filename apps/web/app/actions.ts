'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { profileSchema } from '../lib/onboarding';
import { createSupabaseServerClient } from '../lib/supabase-server';

export type ActionState = {
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const requireUser = async (): Promise<{ id: string }> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user === null) {
    redirect('/auth');
  }

  return { id: data.user.id };
};

export const signIn = async (_previousState: ActionState, formData: FormData): Promise<ActionState> => {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error !== null) {
    return { message: 'Sign in failed. Check your email and password.' };
  }

  redirect('/wardrobe');
};

export const signUp = async (_previousState: ActionState, formData: FormData): Promise<ActionState> => {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const { error } = await supabase.auth.signUp({ email, password });

  if (error !== null) {
    return { message: 'Sign up failed. Use a valid email and a stronger password.' };
  }

  redirect('/onboarding');
};

export const signOut = async (): Promise<void> => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/auth');
};

export const acceptConsent = async (_previousState: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const acknowledged = formData.get('photoConsent') === 'on';

  if (!acknowledged) {
    return { message: 'You must acknowledge the photo-use and safety guidance before continuing.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('photo_consents').upsert(
    {
      user_id: user.id,
      accepted_at: new Date().toISOString(),
      consent_version: '2026-07-28',
    },
    { onConflict: 'user_id' },
  );

  if (error !== null) {
    return { message: 'Consent could not be saved. Please try again.' };
  }

  redirect('/onboarding/profile');
};

export const saveProfile = async (_previousState: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    height: formData.get('height'),
    usualSize: formData.get('usualSize'),
    fitPreferences: formData.get('fitPreferences'),
  });

  if (!parsed.success) {
    return {
      message: 'Please fix the highlighted profile fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      height: parsed.data.height,
      usual_size: parsed.data.usualSize,
      fit_preferences: parsed.data.fitPreferences,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error !== null) {
    return { message: 'Profile could not be saved. Please try again.' };
  }

  redirect('/wardrobe');
};

export const publishPost = async (_previousState: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const savedTryOnId = String(formData.get('savedTryOnId') ?? '');
  const caption = String(formData.get('caption') ?? '').trim().slice(0, 280);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('feed_posts').insert({ user_id: user.id, saved_try_on_id: savedTryOnId, caption });
  if (error !== null) return { message: 'This result could not be posted. It may already be on the feed.' };
  revalidatePath('/wardrobe');
  redirect('/feed');
};

export const togglePostLike = async (formData: FormData): Promise<void> => {
  const user = await requireUser();
  const postId = String(formData.get('postId') ?? '');
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from('feed_likes').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
  if (existing === null) await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
  else await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', user.id);
  revalidatePath('/feed');
};

export const addPostComment = async (_previousState: ActionState, formData: FormData): Promise<ActionState> => {
  const user = await requireUser();
  const postId = String(formData.get('postId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  if (body.length === 0 || body.length > 500) return { message: 'Comments must be between 1 and 500 characters.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('feed_comments').insert({ post_id: postId, user_id: user.id, body });
  if (error !== null) return { message: 'Your comment could not be posted.' };
  revalidatePath('/feed');
  return { message: '' };
};
