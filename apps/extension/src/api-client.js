import { TRUEFIT_API_BASE_URL } from './config.js';

const jsonOrSafeError = async (response) => {
  try {
    return await response.json();
  } catch {
    return { data: null, error: { code: 'INVALID_RESPONSE', message: 'TrueFit returned an unreadable response.' } };
  }
};

export const requestTryOn = async ({ token, candidate, basePhoto }) => {
  const garmentBlob = await fetch(candidate.imageUrl, { credentials: 'omit', cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error('Unable to fetch garment image.');
    return response.blob();
  });

  const formData = new FormData();
  formData.set('garmentCategory', candidate.category);
  formData.set('garmentTitle', candidate.title);
  formData.set('garmentSourceUrl', candidate.sourceUrl);
  formData.set('garmentConfirmed', 'true');
  if (candidate.metadata) formData.set('composition', candidate.metadata);
  if (candidate.sizeHints) formData.set('sizeChartHints', candidate.sizeHints);
  formData.set('basePhoto', basePhoto, basePhoto.name || 'base-photo.jpg');
  formData.set('garmentImage', garmentBlob, 'garment-image.jpg');

  const response = await fetch(`${TRUEFIT_API_BASE_URL}/api/v1/try-ons`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: formData,
  });
  const payload = await jsonOrSafeError(response);
  if (!response.ok) throw payload.error ?? { code: 'TRY_ON_FAILED', message: 'Try-on request failed.' };
  return payload.data;
};

export const saveToWardrobe = async ({ token, resultId }) => {
  const response = await fetch(`${TRUEFIT_API_BASE_URL}/api/v1/wardrobe`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ resultId }),
  });
  const payload = await jsonOrSafeError(response);
  if (!response.ok) throw payload.error ?? { code: 'SAVE_FAILED', message: 'Save failed.' };
  return payload.data;
};
