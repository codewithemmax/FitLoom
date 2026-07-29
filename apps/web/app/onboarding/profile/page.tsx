import { redirect } from 'next/navigation';

import { getOnboardingStatus } from '../../../lib/onboarding';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { ProfileForm } from '../../components/profile-form';

const ProfilePage = async (): Promise<React.ReactElement> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data.user === null) {
    redirect('/auth');
  }

  const status = await getOnboardingStatus(data.user.id, supabase);
  if (!status.hasConsent) {
    redirect('/onboarding');
  }

  return (
    <section className="panel narrow profile-panel" aria-labelledby="profile-title">
      <p className="eyebrow">Step 2 of 2</p>
      <h1 id="profile-title">Fit profile</h1>
      <p className="lede">These details help the backend generate a Fit-Physics Note from garment metadata. They are not a sizing guarantee.</p>
      <ProfileForm />
    </section>
  );
};

export default ProfilePage;
