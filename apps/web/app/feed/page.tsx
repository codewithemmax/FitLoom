import { redirect } from 'next/navigation';

import { PostEngagement } from '../components/post-engagement';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { getEnv } from '../../lib/env';

type FeedRow = {
  id: string;
  caption: string;
  published_at: string;
  saved_try_ons: { result_path: string; garment: Record<string, unknown> | null; fit_physics_note: { summary?: string; stretch?: string; structure?: string; pressurePoints?: string[]; uncertainty?: string; disclaimer?: string } | null } | null;
  feed_likes: Array<{ user_id: string }>;
  feed_comments: Array<{ id: string; body: string; created_at: string }>;
};

const FeedPage = async (): Promise<React.ReactElement> => {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user === null) redirect('/auth');
  const { data, error } = await supabase.from('feed_posts').select('id,caption,published_at,saved_try_ons(result_path,garment,fit_physics_note),feed_likes(user_id),feed_comments(id,body,created_at)').order('published_at', { ascending: false });
  if (error !== null) throw new Error('Unable to load the community feed.');
  const posts = (data ?? []) as unknown as FeedRow[];
  const env = getEnv();

  const postCards = await Promise.all(posts.map(async (post) => {
    if (post.saved_try_ons === null) return null;
    const { data: image } = await supabase.storage.from(env.SUPABASE_RESULTS_BUCKET).createSignedUrl(post.saved_try_ons.result_path, 60 * 10);
    const garment = post.saved_try_ons.garment ?? {};
    const note = post.saved_try_ons.fit_physics_note;
    return { post, imageUrl: image?.signedUrl ?? null, title: typeof garment.title === 'string' ? garment.title : 'Saved look', note };
  }));

  return <section className="panel feed-page" aria-labelledby="feed-title"><div className="section-heading"><div><p className="eyebrow">The fitting room / community</p><h1 id="feed-title">Looks worth talking about.</h1><p className="lede">See how the TrueFit community is exploring pieces, and read the detailed fit review behind every shared look.</p></div></div>{postCards.filter((card): card is NonNullable<typeof card> => card !== null).length === 0 ? <div className="empty-state"><h2>The feed is waiting for its first look.</h2><p>Save a try-on from your wardrobe, then share it with the community.</p></div> : <div className="feed-list">{postCards.filter((card): card is NonNullable<typeof card> => card !== null).map(({ post, imageUrl, title, note }) => <article className="feed-post" key={post.id}><div className="feed-post-image">{imageUrl === null ? <div className="image-fallback">Image unavailable</div> : <img src={imageUrl} alt={`Community try-on for ${title}`} />}</div><div className="feed-post-content"><div className="feed-post-meta"><span>TrueFit community</span><time dateTime={post.published_at}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(post.published_at))}</time></div><h2>{title}</h2>{post.caption ? <p className="post-caption">{post.caption}</p> : null}{note === null ? null : <section className="ai-review" aria-labelledby={`review-${post.id}`}><p className="eyebrow">AI fit review</p><h3 id={`review-${post.id}`}>{note.summary}</h3><dl><div><dt>Stretch</dt><dd>{note.stretch}</dd></div><div><dt>Structure</dt><dd>{note.structure}</dd></div><div><dt>Pressure points</dt><dd>{note.pressurePoints?.join(' ')}</dd></div><div><dt>Uncertainty</dt><dd>{note.uncertainty}</dd></div></dl><p className="review-disclaimer">{note.disclaimer}</p></section>}<PostEngagement postId={post.id} likeCount={post.feed_likes.length} liked={post.feed_likes.some((like) => like.user_id === userData.user.id)} comments={post.feed_comments} /></div></article>)}</div>}</section>;
};

export default FeedPage;
