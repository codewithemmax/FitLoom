export const supportedCategories = ['top', 'outerwear'];

export const sanitizeText = (value, maxLength = 500) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').replace(/[<>]/g, '').trim().slice(0, maxLength);
};

export const sanitizeUrl = (value, base) => {
  try {
    const url = base === undefined ? new URL(value) : new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
};

/**
 * Matching is word-boundary based and specific terms win over generic ones, so
 * "dress shirt" classifies as a top instead of being rejected by the bare
 * "dress" rule. Order matters: supported phrases are checked before the
 * out-of-scope list.
 */
const hasTerm = (text, term) => new RegExp(`(^|[^a-z])${term.replace(/[-\s]/g, '[-\\s]')}([^a-z]|$)`, 'iu').test(text);

const outerwearTerms = ['jacket', 'coat', 'blazer', 'hoodie', 'cardigan', 'parka', 'gilet', 'outerwear'];
const topTerms = ['dress shirt', 'shirt', 'tee', 't-shirt', 'top', 'blouse', 'sweater', 'sweatshirt', 'pullover', 'jumper', 'polo', 'button-down', 'button down'];
const unsupportedTerms = ['dress', 'skirt', 'pants', 'trousers', 'jeans', 'shorts', 'leggings', 'shoe', 'shoes', 'sneaker', 'boot', 'swim', 'bikini', 'tank top', 'singlet', 'sock', 'hat', 'bag'];

export const classifyGarment = ({ title, metadata }) => {
  const text = `${title} ${metadata}`.toLowerCase();

  // Specific supported phrases first: "dress shirt" must not be caught by "dress".
  if (hasTerm(text, 'dress shirt')) return { supported: true, category: 'top', reason: '' };

  const unsupported = unsupportedTerms.find((term) => hasTerm(text, term));
  const outerwear = outerwearTerms.find((term) => hasTerm(text, term));
  const top = topTerms.find((term) => hasTerm(text, term));

  // A supported match still loses to an out-of-scope match unless it is more
  // specific, which keeps "swim shorts" and "shirt dress" out of scope.
  if (unsupported !== undefined && outerwear === undefined && top === undefined) {
    return { supported: false, category: null, reason: 'This item appears outside the MVP scope.' };
  }

  if (unsupported !== undefined) {
    const supportedTerm = outerwear ?? top;
    if (supportedTerm.length <= unsupported.length) {
      return { supported: false, category: null, reason: 'This item appears outside the MVP scope.' };
    }
  }

  if (outerwear !== undefined) return { supported: true, category: 'outerwear', reason: '' };
  if (top !== undefined) return { supported: true, category: 'top', reason: '' };

  return { supported: false, category: null, reason: 'FitLoom could not confidently classify this as a supported top or outerwear item.' };
};

export const validateCandidate = (candidate) => {
  if (!candidate || typeof candidate !== 'object') return { ok: false, error: 'No garment candidate was found on this page.' };
  const sourceUrl = sanitizeUrl(candidate.sourceUrl);
  // Detection already returns absolute URLs; the page URL is the only safe base.
  const imageUrl = sanitizeUrl(candidate.imageUrl, sourceUrl === '' ? undefined : sourceUrl);
  const title = sanitizeText(candidate.title, 200);
  const metadata = sanitizeText(candidate.metadata, 1000);
  const sizeHints = sanitizeText(candidate.sizeHints, 2000);
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
