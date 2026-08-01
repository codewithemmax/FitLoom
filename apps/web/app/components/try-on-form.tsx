'use client';

import { useState } from 'react';

import { publishPost } from '../actions';
import { createSupabaseBrowserClient } from '../../lib/supabase-browser';
import { DownloadButton } from './image-actions';

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

const apiBaseUrl = process.env.NEXT_PUBLIC_FITLOOM_API_BASE_URL ?? 'http://localhost:4000';

type PreviewFile = { file: File; url: string };

type TryOnFormProps = {
  prefillBasePhoto?: PreviewFile;
  prefillGarmentImages?: PreviewFile[];
  onBack?: () => void;
};

export const TryOnForm = ({ prefillBasePhoto, prefillGarmentImages, onBack }: TryOnFormProps = {}): React.ReactElement => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'blocked' | 'error'>('idle');
  const [message, setMessage] = useState('Upload one clear photo of yourself and one or more product photos.');
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [caption, setCaption] = useState('');
  const [postStatus, setPostStatus] = useState<'idle' | 'working' | 'error'>('idle');

  /**
   * Posting needs a saved try-on row, so this saves to the wardrobe first and
   * then publishes that record to the feed. publishPost redirects to /feed, so
   * it is deliberately called outside the try/catch — catching it here would
   * swallow the redirect.
   */
  const postToCommunity = async (): Promise<void> => {
    if (result === null) return;
    setPostStatus('working');
    let savedTryOnId: string | null = null;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token === undefined) {
        setPostStatus('error');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/v1/wardrobe`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ resultId: result.resultId }),
      });
      const payload = await response.json() as { data: { id: string } | null };

      if (!response.ok || payload.data === null) {
        setPostStatus('error');
        return;
      }

      savedTryOnId = payload.data.id;
    } catch {
      setPostStatus('error');
      return;
    }

    const formData = new FormData();
    formData.set('savedTryOnId', savedTryOnId);
    formData.set('caption', caption);
    await publishPost({ message: '' }, formData);
  };

  const submitTryOn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus('loading');
    setResult(null);
    setMessage('Validating person and product photos, then generating only after moderation passes.');

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (prefillBasePhoto !== undefined && !formData.has('basePhoto')) {
      formData.set('basePhoto', prefillBasePhoto.file, prefillBasePhoto.file.name);
    }
    if (prefillGarmentImages !== undefined && prefillGarmentImages.length > 0 && !formData.has('garmentImages')) {
      prefillGarmentImages.forEach((p) => formData.append('garmentImages', p.file, p.file.name));
    }
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

  const hasPrefill = prefillBasePhoto !== undefined && prefillGarmentImages !== undefined && prefillGarmentImages.length > 0;

  return (
    <section className="panel review-panel" aria-labelledby="tryon-title">
      <div className="photo-intake-heading">
        <div>
          <p className="eyebrow">Photo try-on</p>
          <h1 id="tryon-title">{hasPrefill ? 'Confirm the garment.' : 'Upload yourself and the product.'}</h1>
          <p className="lede">
            {hasPrefill
              ? 'Your photo set is locked in below. Describe the garment so the Fit-Physics Note can reason about stretch, structure, and pressure points.'
              : 'Use a real front-facing photo that clearly shows your face and body. Photos without a detectable face are blocked before generation.'}
          </p>
        </div>
        {hasPrefill ? <span className="photo-step">02 / 02</span> : null}
      </div>

      <form className="review-form" onSubmit={(event) => void submitTryOn(event)}>
        <div className="review-grid">
          <div className="upload-block">
            <div className="upload-label"><span>01</span><h2>Photo set</h2><p>{hasPrefill ? 'Locked from the previous step' : 'Choose your source images'}</p></div>

            {prefillBasePhoto === undefined ? (
              <>
                <label htmlFor="basePhoto">Your photo</label>
                <input id="basePhoto" name="basePhoto" type="file" accept="image/png,image/jpeg,image/webp" required />
                <p className="hint">Front-facing, fully clothed, well lit, and with your face visible.</p>
              </>
            ) : (
              <figure className="photo-set-main">
                <img src={prefillBasePhoto.url} alt="Your selected photo" />
                <figcaption>{prefillBasePhoto.file.name}</figcaption>
              </figure>
            )}

            {prefillGarmentImages === undefined || prefillGarmentImages.length === 0 ? (
              <>
                <label htmlFor="garmentImages">Product photos</label>
                <input id="garmentImages" name="garmentImages" type="file" accept="image/png,image/jpeg,image/webp" multiple required />
                <p className="hint">The first approved image is used for generation; all are safety checked.</p>
              </>
            ) : (
              <>
                <p className="photo-set-title">Product photos · {prefillGarmentImages.length}</p>
                <div className="photo-strip">
                  {prefillGarmentImages.map((photo) => (
                    <figure key={photo.url}><img src={photo.url} alt={photo.file.name} /></figure>
                  ))}
                </div>
                <p className="hint">The first image is used for generation; all are safety checked.</p>
              </>
            )}
          </div>

          <div className="upload-block">
            <div className="upload-label"><span>02</span><h2>Garment details</h2><p>Used for the Fit-Physics Note</p></div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="garmentCategory">Category</label>
                <select id="garmentCategory" name="garmentCategory" required>
                  <option value="top">Top</option>
                  <option value="outerwear">Outerwear</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="garmentTitle">Product title</label>
                <input id="garmentTitle" name="garmentTitle" type="text" maxLength={200} placeholder="Structured cotton tee" required />
              </div>
            </div>

            <div className="field">
              <label htmlFor="garmentSourceUrl">Product source URL</label>
              <input id="garmentSourceUrl" name="garmentSourceUrl" type="url" placeholder="https://" required />
            </div>
            <input name="garmentConfirmed" type="hidden" value="true" />

            <div className="field">
              <label htmlFor="composition">Fabric or material details</label>
              <textarea id="composition" name="composition" rows={3} placeholder="Optional: cotton, wool, stretch blend…" />
              <p className="hint">The more specific the fabric, the more useful the stretch and structure guidance.</p>
            </div>
          </div>
        </div>

        <div className="review-footer">
          {onBack === undefined ? <span /> : <button type="button" className="secondary" onClick={onBack}>← Back to photos</button>}
          <button type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Generating…' : 'Generate try-on'}</button>
        </div>
      </form>

      <p className={status === 'blocked' || status === 'error' ? 'error' : 'hint'} role="status" aria-live="polite">{message}</p>

      {status === 'loading' ? <div className="skeleton-card" aria-hidden="true" /> : null}
      {result === null ? null : (
        <div className="result-preview">
          <img src={`data:${result.mimeType};base64,${result.imageBase64}`} alt="Generated approved try-on result" />
          <article className="fit-sheet">
            <p className="eyebrow">Fit-Physics Note</p>
            <h2>{result.fitPhysicsNote.summary}</h2>
            <dl>
              <dt>Stretch</dt><dd>{result.fitPhysicsNote.stretch}</dd>
              <dt>Structure</dt><dd>{result.fitPhysicsNote.structure}</dd>
              <dt>Pressure points</dt>
              <dd>
                <ul>{result.fitPhysicsNote.pressurePoints.map((point) => <li key={point}>{point}</li>)}</ul>
              </dd>
              <dt>Uncertainty</dt><dd>{result.fitPhysicsNote.uncertainty}</dd>
            </dl>
            <p className="fit-disclaimer">{result.fitPhysicsNote.disclaimer}</p>

            <div className="result-actions">
              <DownloadButton
                path={`/api/v1/try-ons/${result.resultId}/download`}
                filename="fitloom-try-on.jpg"
                label="Download"
              />
              <span className="result-actions-note">Downloads carry the FitLoom watermark.</span>
            </div>

            <div className="post-to-feed">
              <label htmlFor="post-caption">Post to community <span>optional note</span></label>
              <textarea
                id="post-caption"
                maxLength={280}
                rows={2}
                placeholder="What did you notice about this look?"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
              <button type="button" onClick={() => void postToCommunity()} disabled={postStatus === 'working'}>
                {postStatus === 'working' ? 'Posting…' : 'Post to community'} <span aria-hidden="true">↗</span>
              </button>
              {postStatus === 'error' ? <p className="error" role="alert">This look could not be posted. Please try again.</p> : null}
            </div>
          </article>
        </div>
      )}
    </section>
  );
};
