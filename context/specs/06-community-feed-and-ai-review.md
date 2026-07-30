# Unit 06: Community Feed and Detailed AI Review

## Goal

Let a user explicitly publish a saved try-on to a community feed. Every post includes the approved generated image and the complete structured AI Fit-Physics Review. Signed-in users can like posts and add short comments.

## Product rules

- Publishing is always explicit; completing a try-on or saving it does not publish it automatically.
- Only the owner of a saved try-on can publish it.
- A post shows the generated image and the AI review fields: summary, stretch, structure, pressure points, uncertainty, and the guidance-only disclaimer.
- Feed images are visible only for published posts. Source photos and unsaved generated results remain transient.
- Likes are one per user per post and can be removed.
- Comments are limited to 500 characters and can be deleted by their author.
- The AI review is guidance, not a physical-fit, identity, age, or size guarantee.

## Database

- `feed_posts` links one-to-one to an owner-scoped `saved_try_ons` row.
- `feed_likes` uses `(post_id, user_id)` as its primary key.
- `feed_comments` belongs to a post and a verified user.
- RLS restricts publishing to saved-result owners and engagement to authenticated users on published posts.
- Published post storage access is granted only through the private result bucket policy for images referenced by a published post.

## Verification

- [ ] A user can publish one saved try-on with an optional caption.
- [ ] A second publish attempt for the same saved try-on is rejected.
- [ ] The feed renders the full AI review and signed image.
- [ ] Like/unlike is idempotent per user.
- [ ] Comment length and ownership rules are enforced.
- [ ] Unpublished results and source photos are not visible to other users.
