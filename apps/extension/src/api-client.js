import { FITLOOM_API_BASE_URL } from './config.js';

const jsonOrSafeError = async (response) => {
  try {
    return await response.json();
  } catch {
    return { data: null, error: { code: 'INVALID_RESPONSE', message: 'FitLoom returned an unreadable response.' } };
  }
};

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_GARMENT_BYTES = 10 * 1024 * 1024;

/**
 * Retailer CDNs commonly reject requests without their own cookies, so the
 * garment fetch retries with credentials before giving up. This runs from the
 * extension origin, which needs the manifest host permission to bypass CORS.
 */
const fetchGarmentImage = async (imageUrl) => {
  let response;

  try {
    response = await fetch(imageUrl, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('retry');
  } catch {
    try {
      response = await fetch(imageUrl, { credentials: 'include', cache: 'no-store' });
    } catch {
      throw { code: 'GARMENT_FETCH_FAILED', message: 'The product image could not be downloaded from this site.' };
    }
  }

  if (!response.ok) {
    throw { code: 'GARMENT_FETCH_FAILED', message: 'The product image could not be downloaded from this site.' };
  }

  const blob = await response.blob();

  if (blob.size === 0 || blob.size > MAX_GARMENT_BYTES) {
    throw { code: 'GARMENT_FETCH_FAILED', message: 'The product image is empty or too large to use.' };
  }

  if (!allowedImageTypes.has(blob.type)) {
    throw { code: 'GARMENT_FETCH_FAILED', message: 'The product image is not a supported JPG, PNG, or WebP file.' };
  }

  return blob;
};

export const requestTryOn = async ({ token, candidate, basePhoto }) => {
  const garmentBlob = await fetchGarmentImage(candidate.imageUrl);
  const extension = garmentBlob.type.split('/')[1] ?? 'jpg';

  const formData = new FormData();
  formData.set('garmentCategory', candidate.category);
  formData.set('garmentTitle', candidate.title);
  formData.set('garmentSourceUrl', candidate.sourceUrl);
  formData.set('garmentConfirmed', 'true');
  if (candidate.metadata) formData.set('composition', candidate.metadata);
  if (candidate.sizeHints) formData.set('sizeChartHints', candidate.sizeHints);
  formData.set('basePhoto', basePhoto, basePhoto.name || 'base-photo.jpg');
  formData.set('garmentImage', garmentBlob, `garment-image.${extension}`);

  let response;

  try {
    response = await fetch(`${FITLOOM_API_BASE_URL}/api/v1/try-ons`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw { code: 'NETWORK_ERROR', message: 'FitLoom could not be reached. Check that the API is running and try again.' };
  }

  const payload = await jsonOrSafeError(response);
  if (!response.ok) throw payload.error ?? { code: 'TRY_ON_FAILED', message: 'Try-on request failed.' };
  return payload.data;
};

export const saveToWardrobe = async ({ token, resultId }) => {
  let response;

  try {
    response = await fetch(`${FITLOOM_API_BASE_URL}/api/v1/wardrobe`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ resultId }),
    });
  } catch {
    throw { code: 'NETWORK_ERROR', message: 'FitLoom could not be reached. Check that the API is running and try again.' };
  }

  const payload = await jsonOrSafeError(response);
  if (!response.ok) throw payload.error ?? { code: 'SAVE_FAILED', message: 'Save failed.' };
  return payload.data;
};
