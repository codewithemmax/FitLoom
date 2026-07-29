'use client';

import { useActionState } from 'react';

import { acceptConsent, type ActionState } from '../actions';

const initialState: ActionState = { message: '' };

export const ConsentForm = (): React.ReactElement => {
  const [state, action, isPending] = useActionState(acceptConsent, initialState);

  return (
    <form className="form card" action={action}>
      <h2>Required acknowledgement</h2>
      <label className="checkbox" htmlFor="photoConsent">
        <input id="photoConsent" name="photoConsent" type="checkbox" required />
        <span>I understand try-on photos are processed for this request and results are saved only when I explicitly save them.</span>
      </label>
      {state.message ? <p className="error" role="alert">{state.message}</p> : null}
      <button type="submit" disabled={isPending}>Continue to profile</button>
    </form>
  );
};
