const textFromSelectors = (selectors) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const text = element?.textContent?.replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return '';
};

const scoreImage = (image) => {
  const rect = image.getBoundingClientRect();
  const area = rect.width * rect.height;
  const alt = image.alt?.toLowerCase() ?? '';
  const productHint = /(shirt|jacket|coat|blazer|sweater|tee|top|hoodie|blouse|product|garment)/u.test(alt) ? 100000 : 0;
  const visible = rect.width >= 180 && rect.height >= 180 ? 50000 : 0;
  return area + productHint + visible;
};

const findPrimaryImage = () => {
  const candidates = [...document.images]
    .filter((image) => image.currentSrc || image.src)
    .map((image) => ({ image, score: scoreImage(image) }))
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.image ?? null;
};

const collectNearbyMetadata = (image) => {
  const nearby = image.closest('main, article, section, div')?.textContent ?? '';
  const normalized = nearby.replace(/\s+/g, ' ').trim();
  const materialMatch = normalized.match(/(cotton|linen|wool|polyester|nylon|spandex|elastane|cashmere|denim|fleece|leather)[^.!?]{0,180}/iu);
  const sizeMatch = normalized.match(/(size|sizing|fits?|model is|measurements?)[^.!?]{0,220}/iu);
  return {
    metadata: materialMatch?.[0] ?? '',
    sizeHints: sizeMatch?.[0] ?? '',
  };
};

const detectCandidate = () => {
  const image = findPrimaryImage();
  if (!image) return null;
  const { metadata, sizeHints } = collectNearbyMetadata(image);
  return {
    imageUrl: image.currentSrc || image.src,
    title: textFromSelectors(['h1', '[data-testid="product-title"]', '[class*="title" i]', 'title']) || image.alt || document.title,
    metadata,
    sizeHints,
    sourceUrl: window.location.href,
  };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'TRUEFIT_DETECT_GARMENT') return false;
  sendResponse({ candidate: detectCandidate() });
  return true;
});
