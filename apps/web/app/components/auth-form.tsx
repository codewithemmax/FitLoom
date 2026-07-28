'use client';

import { useActionState, useState } from 'react';

import { type ActionState, signIn, signUp } from '../actions';

const initialState: ActionState = { message: '' };

export const AuthForm = (): React.ReactElement => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [signInState, signInAction, isSigningIn] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, isSigningUp] = useActionState(signUp, initialState);
  const state = mode === 'sign-in' ? signInState : signUpState;

  return (
    <div>
      <div className="segmented" role="tablist" aria-label="Authentication mode">
        <button type="button" aria-pressed={mode === 'sign-in'} onClick={() => setMode('sign-in')}>Sign in</button>
        <button type="button" aria-pressed={mode === 'sign-up'} onClick={() => setMode('sign-up')}>Create account</button>
      </div>
      <form className="form" action={mode === 'sign-in' ? signInAction : signUpAction}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required minLength={8} />
        {state.message ? <p className="error" role="alert">{state.message}</p> : null}
        <button type="submit" disabled={isSigningIn || isSigningUp}>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
      </form>
    </div>
  );
};
