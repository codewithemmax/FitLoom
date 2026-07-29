import { redirect } from 'next/navigation';

import { getOnboardingStatus } from '../../lib/onboarding';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { ConsentForm } from '../components/consent-form';

const OnboardingPage = async (): Promise<React.ReactElement> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user === null) {
    redirect('/auth');
  }

  const status = await getOnboardingStatus(data.user.id, supabase);
  if (status.isComplete) {
    redirect('/wardrobe');
  }

  return (
    <section className="panel onboarding-panel" aria-labelledby="consent-title">
      <p className="eyebrow">Start a try-on</p>
      <h1 id="consent-title">See it on you.</h1>
      <p className="lede">Upload one clear photo of yourself and one or more photos of the product. TrueFit creates a visual preview so you can decide whether the piece is worth trying.</p>
      <div className="guidance-grid">
        <article>
          <h2>Your photo</h2>
          <ul>
            <li>Stand front-facing in even lighting.</li>
            <li>Show one person clearly with the face visible.</li>
            <li>Use a well-lit, front-facing photo.</li>
          </ul>
          <p>We check for a detectable face and reject random or unreadable images before generation.</p>
        </article>
        <ConsentForm />
      </div>
    </section>
  );
};

export default OnboardingPage;
