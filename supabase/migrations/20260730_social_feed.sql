begin;

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  saved_try_on_id uuid not null unique references public.saved_try_ons(id) on delete cascade,
  caption text not null default '',
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.feed_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists feed_posts_published_idx on public.feed_posts(published_at desc);
create index if not exists feed_likes_post_idx on public.feed_likes(post_id);
create index if not exists feed_comments_post_created_idx on public.feed_comments(post_id, created_at);

alter table public.feed_posts enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_comments enable row level security;

drop policy if exists "Authenticated users can view results used by published posts" on public.saved_try_ons;
create policy "Authenticated users can view results used by published posts"
on public.saved_try_ons for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.feed_posts
    where feed_posts.saved_try_on_id = saved_try_ons.id
      and feed_posts.published_at <= now()
  )
);

drop policy if exists "Anyone signed in can view published posts" on public.feed_posts;
create policy "Anyone signed in can view published posts"
on public.feed_posts for select to authenticated
using (published_at <= now());

drop policy if exists "Users can publish their saved try-ons" on public.feed_posts;
create policy "Users can publish their saved try-ons"
on public.feed_posts for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.saved_try_ons
    where saved_try_ons.id = saved_try_on_id
      and saved_try_ons.user_id = auth.uid()
  )
);

drop policy if exists "Users can edit their own posts" on public.feed_posts;
create policy "Users can edit their own posts"
on public.feed_posts for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.feed_posts;
create policy "Users can delete their own posts"
on public.feed_posts for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Signed in users can view likes on published posts" on public.feed_likes;
create policy "Signed in users can view likes on published posts"
on public.feed_likes for select to authenticated
using (exists (select 1 from public.feed_posts where feed_posts.id = post_id and feed_posts.published_at <= now()));

drop policy if exists "Users can like published posts" on public.feed_likes;
create policy "Users can like published posts"
on public.feed_likes for insert to authenticated
with check (auth.uid() = user_id and exists (select 1 from public.feed_posts where feed_posts.id = post_id and feed_posts.published_at <= now()));

drop policy if exists "Users can remove their own likes" on public.feed_likes;
create policy "Users can remove their own likes"
on public.feed_likes for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "Signed in users can view comments on published posts" on public.feed_comments;
create policy "Signed in users can view comments on published posts"
on public.feed_comments for select to authenticated
using (exists (select 1 from public.feed_posts where feed_posts.id = post_id and feed_posts.published_at <= now()));

drop policy if exists "Users can comment on published posts" on public.feed_comments;
create policy "Users can comment on published posts"
on public.feed_comments for insert to authenticated
with check (auth.uid() = user_id and exists (select 1 from public.feed_posts where feed_posts.id = post_id and feed_posts.published_at <= now()));

drop policy if exists "Authenticated users can view published result images" on storage.objects;
create policy "Authenticated users can view published result images"
on storage.objects for select to authenticated
using (
  bucket_id = 'wardrobe'
  and exists (
    select 1
    from public.feed_posts
    join public.saved_try_ons on saved_try_ons.id = feed_posts.saved_try_on_id
    where saved_try_ons.result_path = name
      and feed_posts.published_at <= now()
  )
);

drop policy if exists "Users can delete their own comments" on public.feed_comments;
create policy "Users can delete their own comments"
on public.feed_comments for delete to authenticated
using (auth.uid() = user_id);

commit;
