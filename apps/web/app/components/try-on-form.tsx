'use client';

import { useState } from 'react';

import { createSupabaseBrowserClient } from '../../lib/supabase-browser';

type FitPhysicsNote = {
  summary: string;
  stretch: string;
  structure: string;
  pressurePoints: string[];
  uncertainty: string;
  disclaimer: string;
};

type TryOnResult = {
  resultId: string;
  imageBase64: string;
  mimeType: string;
  fitPhysicsNote: FitPhysicsNote;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_TRUEFIT_API_BASE_URL ?? 'http://localhost:4000';

export const TryOnForm = (): React.ReactElement => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'blocked' | 'error'>('idle');
  const [message, setMessage] = useState('Upload one clear photo of yourself and one or more product photos.');
  const [result, setResult] = useState<TryOnResult | null>(null);

  const submitTryOn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus('loading');
    setResult(null);
    setMessage('Validating person and product photos, then generating only after moderation passes.');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token === undefined) {
      setStatus('error');
      setMessage('Sign in again before generating a try-on.');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/try-ons`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await response.json() as { data: TryOnResult | null; error: { code: string; message: string } | null };

      if (!response.ok || payload.data === null) {
        setStatus(payload.error?.code === 'PERSON_PHOTO_INVALID' || payload.error?.code === 'SAFETY_BLOCKED' ? 'blocked' : 'error');
        setMessage(payload.error?.message ?? 'Try-on generation failed.');
        return;
      }

      setResult(payload.data);
      setStatus('success');
      setMessage('Approved result ready. Save from the extension or API save flow when you choose to keep it.');
    } catch {
      setStatus('error');
      setMessage('Try-on generation failed. Check your connection and try again.');
    }
  };

  return (
    <section className="panel" aria-labelledby="tryon-title">
      <p className="eyebrow">Photo try-on</p>
      <h1 id="tryon-title">Upload yourself and product photos</h1>
      <p className="lede">Use a real front-facing photo that clearly shows your face and body. Random images or photos without a detectable face are blocked before generation.</p>

      <form className="form" onSubmit={(event) => void submitTryOn(event)}>
        <label htmlFor="basePhoto">Your photo</label>
        <input id="basePhoto" name="basePhoto" type="file" accept="image/png,image/jpeg,image/webp" required />
        <p className="hint">Front-facing, fully clothed, well lit, and with your face visible.</p>

        <label htmlFor="garmentImages">Product photos</label>
        <input id="garmentImages" name="garmentImages" type="file" accept="image/png,image/jpeg,image/webp" multiple required />
        <p className="hint">Upload one or more product images. The first approved image is used for generation; all are safety checked.</p>

        <label htmlFor="garmentCategory">Product category</label>
        <select id="garmentCategory" name="garmentCategory" required>
          <option value="top">Top</option>
          <option value="outerwear">Outerwear</option>
        </select>

        <label htmlFor="garmentTitle">Product title</label>
        <input id="garmentTitle" name="garmentTitle" type="text" maxLength={200} required />

        <label htmlFor="garmentSourceUrl">Product source URL</label>
        <input id="garmentSourceUrl" name="garmentSourceUrl" type="url" required />
        <input name="garmentConfirmed" type="hidden" value="true" />

        <label htmlFor="composition">Fabric or material details</label>
        <textarea id="composition" name="composition" rows={3} placeholder="Optional: cotton, wool, stretch blend…" />

        <button type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Generating…' : 'Generate try-on'}</button>
      </form>

      <p className={status === 'blocked' || status === 'error' ? 'error' : 'hint'} role="status" aria-live="polite">{message}</p>

      {status === 'loading' ? <div className="skeleton-card" aria-hidden="true" /> : null}
      {result === null ? null : (
        <div className="result-preview">
          <img src={`data:${result.mimeType};base64,${result.imageBase64}`} alt="Generated approved try-on result" />
          <article>
            <h2>Fit-Physics Note</h2>
            <p>{result.fitPhysicsNote.summary}</p>
            <p>{result.fitPhysicsNote.disclaimer}</p>
          </article>
        </div>
      )}
    </section>
  );
};
