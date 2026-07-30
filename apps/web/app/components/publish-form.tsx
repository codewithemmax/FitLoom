'use client';

import { useActionState } from 'react';

import { publishPost, type ActionState } from '../actions';

const initialState: ActionState = { message: '' };

export const PublishForm = ({ savedTryOnId }: { savedTryOnId: string }): React.ReactElement => {
  const [state, action, isPending] = useActionState(publishPost, initialState);
  return <form className="publish-form" action={action}><input type="hidden" name="savedTryOnId" value={savedTryOnId} /><label htmlFor={`caption-${savedTryOnId}`}>Share a note <span>optional</span></label><textarea id={`caption-${savedTryOnId}`} name="caption" maxLength={280} placeholder="What did you notice about this look?" rows={2} /><button type="submit" disabled={isPending}>Post to feed <span aria-hidden="true">↗</span></button>{state.message ? <p className="error" role="alert">{state.message}</p> : null}</form>;
};
