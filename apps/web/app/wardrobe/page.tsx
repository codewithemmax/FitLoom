import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getEnv } from '../../lib/env';
import { getOnboardingStatus } from '../../lib/onboarding';
import { createSupabaseServerClient } from '../../lib/supabase-server';

type SavedTryOnRow = {
  id: string;
  result_path: string;
  garment: {
    title?: string;
    sourceUrl?: string;
    source_url?: string;
  } | null;
  fit_physics_note: {
    summary?: string;
    uncertainty?: string;
    disclaimer?: string;
  } | null;
  created_at: string;
};

type WardrobeItem = {
  id: string;
  imageUrl: string | null;
  title: string;
  sourceUrl: string | null;
  savedDate: string;
  notePreview: string;
};

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));

const toWardrobeItem = async (row: SavedTryOnRow, supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<WardrobeItem> => {
  const env = getEnv();
  const { data } = await supabase.storage.from(env.SUPABASE_RESULTS_BUCKET).createSignedUrl(row.result_path, 60 * 10);

  return {
    id: row.id,
    imageUrl: data?.signedUrl ?? null,
    title: row.garment?.title ?? 'Saved try-on',
    sourceUrl: row.garment?.sourceUrl ?? row.garment?.source_url ?? null,
    savedDate: formatDate(row.created_at),
    notePreview: row.fit_physics_note?.summary ?? row.fit_physics_note?.uncertainty ?? 'Fit guidance saved with this item.',
  };
};

const WardrobePage = async (): Promise<React.ReactElement> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user === null) {
    redirect('/auth');
  }

  const onboarding = await getOnboardingStatus(data.user.id, supabase);
  if (!onboarding.isComplete) {
    redirect(onboarding.hasConsent ? '/onboarding/profile' : '/onboarding');
  }

  const { data: rows, error } = await supabase
    .from('saved_try_ons')
    .select('id,result_path,garment,fit_physics_note,created_at')
    .eq('user_id', data.user.id)
    .order('created_at', { ascending: false });

  if (error !== null) {
    throw new Error('Unable to load wardrobe.');
  }

  const items = await Promise.all(((rows ?? []) as SavedTryOnRow[]).map((row) => toWardrobeItem(row, supabase)));

  return (
    <section className="panel" aria-labelledby="wardrobe-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Private wardrobe</p>
          <h1 id="wardrobe-title">Saved try-on results</h1>
          <p className="lede">Only items owned by your signed-in account are shown here.</p>
        </div>
        <Link className="button secondary" href="/onboarding/profile">Update profile</Link>
      </div>

      {items.length === 0 ? (
        <div className="empty-state" tabIndex={0}>
          <h2>No saved results yet</h2>
          <p>Try-ons stay temporary until you explicitly save them from the extension or API flow.</p>
        </div>
      ) : (
        <ul className="gallery" aria-label="Saved wardrobe results">
          {items.map((item) => (
            <li className="wardrobe-card" key={item.id}>
              {item.imageUrl === null ? (
                <div className="image-fallback" role="img" aria-label="Image unavailable">Image unavailable</div>
              ) : (
                <img src={item.imageUrl} alt={`Saved try-on for ${item.title}`} />
              )}
              <div className="card-body">
                <h2>{item.title}</h2>
                <p className="meta">Saved {item.savedDate}</p>
                <p>{item.notePreview}</p>
                {item.sourceUrl === null ? null : <a href={item.sourceUrl}>View source garment</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default WardrobePage;
