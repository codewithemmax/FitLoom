'use client';

import { useActionState } from 'react';

import { saveProfile, type ActionState } from '../actions';

const initialState: ActionState = { message: '' };

const FieldError = ({ errors }: { errors: string[] | undefined }): React.ReactElement | null => {
  if (errors === undefined || errors.length === 0) {
    return null;
  }

  return <p className="error" role="alert">{errors.join(' ')}</p>;
};

export const ProfileForm = (): React.ReactElement => {
  const [state, action, isPending] = useActionState(saveProfile, initialState);

  return (
    <form className="form" action={action} noValidate>
      <label htmlFor="height">Height</label>
      <input id="height" name="height" type="text" inputMode="text" autoComplete="off" aria-describedby="height-hint" required />
      <p id="height-hint" className="hint">Example: 5 ft 8 in or 173 cm.</p>
      <FieldError errors={state.fieldErrors?.height} />

      <label htmlFor="usualSize">Usual size</label>
      <input id="usualSize" name="usualSize" type="text" autoComplete="off" required />
      <FieldError errors={state.fieldErrors?.usualSize} />

      <label htmlFor="fitPreferences">Fit preferences</label>
      <textarea id="fitPreferences" name="fitPreferences" rows={5} required aria-describedby="fit-hint" />
      <p id="fit-hint" className="hint">For example: relaxed shoulders, cropped length, avoids tight sleeves.</p>
      <FieldError errors={state.fieldErrors?.fitPreferences} />

      {state.message ? <p className="error" role="alert">{state.message}</p> : null}
      <button type="submit" disabled={isPending}>Save profile and open wardrobe</button>
    </form>
  );
};
