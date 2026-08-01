/**
 * Injected on demand by the popup via chrome.scripting.executeScript({ files: [...] }).
 * It is NOT registered in the manifest, so it never runs on pages the user has
 * not explicitly acted on. The completion value of the trailing IIFE is what
 * executeScript returns as `result`.
 */
(() => {
  const clean = (value, max = 2000) =>
    typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim().slice(0, max) : '';

  const absoluteUrl = (value) => {
    if (typeof value !== 'string' || value.trim() === '') return '';
    try {
      const url = new URL(value, document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
      return '';
    }
  };

  const metaContent = (selector) => clean(document.querySelector(selector)?.getAttribute('content') ?? '');

  /** Retailers publish schema.org/Product far more reliably than any DOM shape. */
  const fromJsonLd = () => {
    for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
      let parsed;

      try {
        parsed = JSON.parse(node.textContent ?? '');
      } catch {
        continue;
      }

      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length > 0) {
        const entry = queue.shift();
        if (entry === null || typeof entry !== 'object') continue;
        if (Array.isArray(entry['@graph'])) queue.push(...entry['@graph']);

        const declared = entry['@type'];
        const types = Array.isArray(declared) ? declared : [declared];
        if (!types.includes('Product')) continue;

        const rawImage = Array.isArray(entry.image) ? entry.image[0] : entry.image;
        const imageUrl = absoluteUrl(
          typeof rawImage === 'object' && rawImage !== null ? rawImage.url : rawImage,
        );
        if (imageUrl === '') continue;

        return {
          imageUrl,
          title: clean(entry.name, 200),
          metadata: clean(entry.material ?? entry.description, 1000),
        };
      }
    }

    return null;
  };

  const fromOpenGraph = () => {
    const imageUrl = absoluteUrl(metaContent('meta[property="og:image"], meta[name="og:image"]'));
    if (imageUrl === '') return null;

    return {
      imageUrl,
      title: metaContent('meta[property="og:title"], meta[name="og:title"]').slice(0, 200),
      metadata: metaContent('meta[property="og:description"], meta[name="description"]').slice(0, 1000),
    };
  };

  /**
   * Lazy-loaded and below-the-fold images report a 0x0 bounding rect, so the
   * intrinsic size is used whenever the rendered one is unavailable.
   */
  const measure = (image) => {
    const rect = image.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : image.naturalWidth;
    const height = rect.height > 0 ? rect.height : image.naturalHeight;
    return { width: width || 0, height: height || 0 };
  };

  const scoreImage = (image) => {
    const { width, height } = measure(image);
    if (width < 120 || height < 120) return -1;

    const alt = (image.alt ?? '').toLowerCase();
    const productHint = /(shirt|jacket|coat|blazer|sweater|tee|top|hoodie|blouse|product|garment)/u.test(alt) ? 100000 : 0;
    // Product shots are square or portrait; wide images are usually banners.
    const ratioPenalty = width > height * 1.6 ? -80000 : 0;
    return width * height + productHint + ratioPenalty;
  };

  const fromLargestImage = () => {
    const ranked = [...document.images]
      .filter((image) => image.currentSrc !== '' || image.src !== '')
      .map((image) => ({ image, score: scoreImage(image) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.image;
    if (best === undefined) return null;

    return {
      imageUrl: absoluteUrl(best.currentSrc || best.src),
      title: clean(best.alt, 200),
      metadata: '',
      element: best,
    };
  };

  const textFromSelectors = (selectors) => {
    for (const selector of selectors) {
      const text = clean(document.querySelector(selector)?.textContent ?? '', 200);
      if (text !== '') return text;
    }
    return '';
  };

  /** Fabric and sizing wording, read from the product container when known. */
  const collectNearbyMetadata = (element) => {
    const scope = element?.closest('main, article, [class*="product" i], section') ?? document.body;
    const normalized = clean(scope.textContent ?? '', 20000);
    const material = normalized.match(/(cotton|linen|wool|polyester|nylon|spandex|elastane|cashmere|denim|fleece|leather)[^.!?]{0,180}/iu);
    const sizing = normalized.match(/(size|sizing|fits?|model is|measurements?)[^.!?]{0,220}/iu);
    return { metadata: clean(material?.[0] ?? '', 1000), sizeHints: clean(sizing?.[0] ?? '', 2000) };
  };

  const detected = fromJsonLd() ?? fromOpenGraph() ?? fromLargestImage();
  if (detected === null || detected.imageUrl === '') return null;

  const nearby = collectNearbyMetadata(detected.element);

  return {
    imageUrl: detected.imageUrl,
    title:
      detected.title ||
      textFromSelectors(['h1', '[data-testid="product-title"]', '[class*="title" i]']) ||
      clean(document.title, 200),
    metadata: detected.metadata || nearby.metadata,
    sizeHints: nearby.sizeHints,
    sourceUrl: window.location.href,
  };
})();
