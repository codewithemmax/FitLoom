'use client';

const WardrobeError = ({ reset }: { reset: () => void }): React.ReactElement => (
  <section className="panel narrow" role="alert">
    <p className="eyebrow">Something went wrong</p>
    <h1>We could not load your wardrobe</h1>
    <p>Please try again. Your saved items remain private to your account.</p>
    <button type="button" onClick={reset}>Retry</button>
  </section>
);

export default WardrobeError;
