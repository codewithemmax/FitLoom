const WardrobeLoading = (): React.ReactElement => (
  <section className="panel" aria-busy="true" aria-live="polite">
    <p className="eyebrow">Loading</p>
    <h1>Opening your wardrobe…</h1>
    <div className="gallery" aria-hidden="true">
      <div className="skeleton-card" />
      <div className="skeleton-card" />
      <div className="skeleton-card" />
    </div>
  </section>
);

export default WardrobeLoading;
