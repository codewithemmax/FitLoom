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
    <section className="panel" aria-labelledby="consent-title">
      <p className="eyebrow">Step 1 of 2</p>
      <h1 id="consent-title">Consent and photo safety</h1>
      <p className="lede">TrueFit processes try-on photos transiently. Saved wardrobe items are stored only when you explicitly choose to save a result.</p>
      <div className="guidance-grid">
        <article>
          <h2>Base-photo setup</h2>
          <ul>
            <li>Stand front-facing in even lighting.</li>
            <li>Stay fully clothed.</li>
            <li>Tie hair back when possible.</li>
          </ul>
          <p>These steps improve garment segmentation and reduce ambiguous moderation or try-on results.</p>
        </article>
        <ConsentForm />
      </div>
    </section>
  );
};

export default OnboardingPage;
