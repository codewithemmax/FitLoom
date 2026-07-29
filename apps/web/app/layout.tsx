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
      <div className="app-shell">
        <header className="site-header">
          <Link className="brand" href="/wardrobe" aria-label="TrueFit home">
            <span className="brand-mark" aria-hidden="true">TF</span>
            <span className="brand-copy"><strong>TrueFit</strong><small>style, with certainty</small></span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link className="nav-link" href="/wardrobe"><span className="nav-index">01</span>Wardrobe</Link>
            <Link className="nav-link" href="/onboarding"><span className="nav-index">02</span>Profile</Link>
            <form action={signOut}>
              <button className="link-button" type="submit">Sign out <span aria-hidden="true">↗</span></button>
            </form>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer"><span>TRUEFIT / 2026</span><span>Fit guidance, not a guarantee.</span></footer>
      </div>
    </body>
  </html>
);

export default RootLayout;
