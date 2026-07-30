'use client';

import { useActionState } from 'react';

import { addPostComment, togglePostLike, type ActionState } from '../actions';

const initialState: ActionState = { message: '' };

export const PostEngagement = ({ postId, likeCount, liked, comments }: { postId: string; likeCount: number; liked: boolean; comments: Array<{ id: string; body: string; created_at: string }> }): React.ReactElement => {
  const [state, action, isPending] = useActionState(addPostComment, initialState);
  return <div className="post-engagement"><form action={togglePostLike}><input type="hidden" name="postId" value={postId} /><button className={`like-button ${liked ? 'is-liked' : ''}`} type="submit" aria-label={liked ? 'Unlike this post' : 'Like this post'}>{liked ? '♥' : '♡'} <span>{likeCount}</span></button></form><div className="comments"><div className="comment-list">{comments.map((comment) => <p key={comment.id}><strong>community</strong> {comment.body}</p>)}</div><form className="comment-form" action={action}><input type="hidden" name="postId" value={postId} /><label className="sr-only" htmlFor={`comment-${postId}`}>Add a comment</label><input id={`comment-${postId}`} name="body" maxLength={500} placeholder="Add a thoughtful comment" /><button type="submit" disabled={isPending}>Send</button></form>{state.message ? <p className="error" role="alert">{state.message}</p> : null}</div></div>;
};
