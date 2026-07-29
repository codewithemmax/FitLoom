import { redirect } from 'next/navigation';

import { getOnboardingStatus } from '../../lib/onboarding';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { TryOnForm } from '../components/try-on-form';

const TryOnPage = async (): Promise<React.ReactElement> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user === null) {
    redirect('/auth');
  }

  const onboarding = await getOnboardingStatus(data.user.id, supabase);
  if (!onboarding.isComplete) {
    redirect(onboarding.hasConsent ? '/onboarding/profile' : '/onboarding');
  }

  return <TryOnForm />;
};

export default TryOnPage;
