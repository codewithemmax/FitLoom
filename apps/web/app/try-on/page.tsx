import { redirect } from 'next/navigation';

import { getOnboardingStatus } from '../../lib/onboarding';
import { createSupabaseServerClient } from '../../lib/supabase-server';
import { PhotoUpload } from '../components/photo-upload';

const TryOnPage = async (): Promise<React.ReactElement> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user === null) redirect('/auth');
  const status = await getOnboardingStatus(data.user.id, supabase);
  if (!status.hasConsent) redirect('/onboarding');
  return <PhotoUpload />;
};

export default TryOnPage;
