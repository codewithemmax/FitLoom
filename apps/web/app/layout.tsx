import type { Metadata } from 'next';
import Link from 'next/link';

import { signOut } from './actions';
import './styles.css';

export const metadata: Metadata = {
  title: 'FitLoom Wardrobe',
  description: 'Consent-first virtual try-on wardrobe.',
  icons: {
    icon: '/fitloom-logo.png',
    shortcut: '/fitloom-logo.png',
    apple: '/fitloom-logo.png',
  },
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement => (
  <html lang="en">
    <body>
      <header className="site-header">
        <div className="app-shell site-header-inner">
          {/* The logo is a full lockup that already carries the wordmark, so the
              header shows it at its own 669x373 ratio instead of a second
              "FitLoom" set in a different typeface. */}
          <Link className="brand" href="/wardrobe" aria-label="FitLoom wardrobe">
            <img className="brand-logo" src="/fitloom-logo.png" alt="" width="669" height="373" />
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
