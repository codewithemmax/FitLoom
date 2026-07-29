import type { Metadata } from 'next';
import Link from 'next/link';

import { signOut } from './actions';
import './styles.css';

export const metadata: Metadata = {
  title: 'TrueFit Wardrobe',
  description: 'Consent-first virtual try-on wardrobe.',
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement => (
  <html lang="en">
    <body>
      <header className="site-header">
        <Link className="brand" href="/wardrobe">TrueFit</Link>
        <nav aria-label="Primary navigation">
          <Link href="/onboarding">Onboarding</Link>
          <Link href="/try-on">Try-on</Link>
          <Link href="/wardrobe">Wardrobe</Link>
          <form action={signOut}>
            <button className="link-button" type="submit">Sign out</button>
          </form>
        </nav>
      </header>
      <main>{children}</main>
    </body>
  </html>
);

export default RootLayout;
