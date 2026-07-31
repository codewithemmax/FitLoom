'use client';

import { useState } from 'react';

import { createSupabaseBrowserClient } from '../../lib/supabase-browser';

const apiBaseUrl = process.env.NEXT_PUBLIC_TRUEFIT_API_BASE_URL ?? 'http://localhost:4000';

/**
 * Downloads go through the API rather than the storage URL directly: the API is
 * what burns the TrueFit watermark into the image. That also means the request
 * needs the bearer token, so this cannot be a plain anchor.
 */
export const DownloadButton = ({ path, filename, label = 'Download' }: { path: string; filename: string; label?: string }): React.ReactElement => {
  const [state, setState] = useState<'idle' | 'working' | 'error'>('idle');

  const download = async (): Promise<void> => {
    setState('working');

    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token === undefined) {
        setState('error');
        return;
      }

      const response = await fetch(`${apiBaseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });

      if (!response.ok) {
        setState('error');
        return;
      }

      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  return (
    <button className="icon-action" type="button" onClick={() => void download()} disabled={state === 'working'}>
      <span aria-hidden="true">↓</span> {state === 'working' ? 'Preparing…' : state === 'error' ? 'Try again' : label}
    </button>
  );
};

export const ShareButton = ({ postId, title }: { postId: string; title: string }): React.ReactElement => {
  const [label, setLabel] = useState('Share');

  const share = async (): Promise<void> => {
    const url = `${window.location.origin}/feed#post-${postId}`;

    // Native sheet on mobile, clipboard everywhere else.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: `${title} on TrueFit`, url });
        return;
      } catch {
        // Dismissing the share sheet is not an error; fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setLabel('Link copied');
    } catch {
      setLabel('Copy failed');
    }

    setTimeout(() => setLabel('Share'), 2000);
  };

  return (
    <button className="icon-action" type="button" onClick={() => void share()}>
      <span aria-hidden="true">↗</span> {label}
    </button>
  );
};
