export const supportedCategories = ['top', 'outerwear'];

export const sanitizeText = (value, maxLength = 500) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').replace(/[<>]/g, '').trim().slice(0, maxLength);
};

export const sanitizeUrl = (value) => {
  try {
    const url = new URL(value, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
};

export const classifyGarment = ({ title, metadata }) => {
  const text = `${title} ${metadata}`.toLowerCase();
  const unsupported = ['dress', 'skirt', 'pants', 'jeans', 'shorts', 'shoe', 'sneaker', 'swim', 'bikini', 'tank top', 'singlet'];
  if (unsupported.some((term) => text.includes(term))) return { supported: false, category: null, reason: 'This item appears outside the MVP scope.' };

  const outerwear = ['jacket', 'coat', 'blazer', 'hoodie', 'cardigan', 'parka', 'vest', 'outerwear'];
  if (outerwear.some((term) => text.includes(term))) return { supported: true, category: 'outerwear', reason: '' };

  const tops = ['shirt', 'tee', 't-shirt', 'top', 'blouse', 'sweater', 'pullover', 'button-down', 'button down'];
  if (tops.some((term) => text.includes(term))) return { supported: true, category: 'top', reason: '' };

  return { supported: false, category: null, reason: 'TrueFit could not confidently classify this as a supported top or outerwear item.' };
};

export const validateCandidate = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return { ok: false, error: 'No garment candidate was found.' };
  const imageUrl = sanitizeUrl(candidate.imageUrl);
  const title = sanitizeText(candidate.title, 200);
  const metadata = sanitizeText(candidate.metadata, 1000);
  const sizeHints = sanitizeText(candidate.sizeHints, 2000);
  const sourceUrl = sanitizeUrl(candidate.sourceUrl);
  const classification = classifyGarment({ title, metadata });

  if (!imageUrl || !title || !sourceUrl) return { ok: false, error: 'The detected product is missing an image, title, or source URL.' };
  if (!classification.supported) return { ok: false, error: classification.reason };

  return {
    ok: true,
    candidate: {
      imageUrl,
      title,
      sourceUrl,
      metadata,
      sizeHints,
      category: classification.category,
    },
  };
};
