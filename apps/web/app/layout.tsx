import type { Metadata } from 'next';
import Link from 'next/link';

import { signOut } from './actions';
import './styles.css';

export const metadata: Metadata = {
  title: 'TrueFit Wardrobe',
  description: 'Consent-first virtual try-on wardrobe.',
  icons: {
    icon: '/truefit-logo.png',
    shortcut: '/truefit-logo.png',
    apple: '/truefit-logo.png',
  },
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement => (
  <html lang="en">
    <body>
      <header className="site-header">
        <div className="app-shell site-header-inner">
          {/* The logo is a full lockup that already carries the wordmark, so the
              header shows it at its own 669x373 ratio instead of a second
              "TrueFit" set in a different typeface. */}
          <Link className="brand" href="/wardrobe" aria-label="TrueFit wardrobe">
            <img className="brand-logo" src="/truefit-logo.png" alt="" width="669" height="373" />
            <span className="brand-tagline">AI try-on wardrobe</span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link className="nav-link" href="/onboarding">Onboarding</Link>
            <Link className="nav-link" href="/wardrobe">Wardrobe</Link>
            <Link className="nav-link" href="/try-on">Try on</Link>
            <Link className="nav-link" href="/feed">Community</Link>
            <form action={signOut}>
              <button className="link-button" type="submit">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="app-shell">{children}</main>
    </body>
  </html>
);

export default RootLayout;
