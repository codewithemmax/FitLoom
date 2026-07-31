import { requestTryOn, saveToWardrobe } from './api-client.js';
import { TRUEFIT_WEB_APP_URL } from './config.js';
import { validateCandidate } from './contracts.js';

const state = {
  mode: 'idle',
  candidate: null,
  confirmed: false,
  basePhoto: null,
  token: '',
  result: null,
};

const elements = {
  status: document.querySelector('#status'),
  apiToken: document.querySelector('#apiToken'),
  basePhoto: document.querySelector('#basePhoto'),
  detectButton: document.querySelector('#detectButton'),
  confirmPanel: document.querySelector('#confirmPanel'),
  candidateImage: document.querySelector('#candidateImage'),
  candidateTitle: document.querySelector('#candidateTitle'),
  candidateCategory: document.querySelector('#candidateCategory'),
  candidateMetadata: document.querySelector('#candidateMetadata'),
  confirmButton: document.querySelector('#confirmButton'),
  cancelButton: document.querySelector('#cancelButton'),
  generateButton: document.querySelector('#generateButton'),
  resultPanel: document.querySelector('#resultPanel'),
  visualSkeleton: document.querySelector('#visualSkeleton'),
  noteSkeleton: document.querySelector('#noteSkeleton'),
  resultImage: document.querySelector('#resultImage'),
  fitNote: document.querySelector('#fitNote'),
  saveButton: document.querySelector('#saveButton'),
  retryButton: document.querySelector('#retryButton'),
  closeButton: document.querySelector('#closeButton'),
  communityButton: document.querySelector('#communityButton'),
  photoHint: document.querySelector('#photoHint'),
};

const setStatus = (message, tone = 'neutral') => {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
};

const setMode = (mode) => {
  state.mode = mode;
  document.body.dataset.mode = mode;
  elements.visualSkeleton.classList.toggle('hidden', mode !== 'loading');
  elements.noteSkeleton.classList.toggle('hidden', mode !== 'loading');
  elements.resultImage.classList.toggle('hidden', mode !== 'success');
  elements.saveButton.disabled = mode !== 'success' || !state.result?.resultId;
};

const clearSessionState = () => {
  state.mode = 'idle';
  state.candidate = null;
  state.confirmed = false;
  state.basePhoto = null;
  state.result = null;
  elements.basePhoto.value = '';
  elements.confirmPanel.classList.add('hidden');
  elements.resultPanel.classList.add('hidden');
  elements.resultImage.removeAttribute('src');
  elements.fitNote.replaceChildren();
  elements.generateButton.disabled = true;
  elements.saveButton.disabled = true;
  setMode('idle');
  setStatus('Session cleared. No media was written to extension storage.');
};

const validatePersonPhoto = () => {
  const photo = elements.basePhoto.files?.[0];
  if (!photo) {
    elements.photoHint.textContent = 'Front-facing, fully clothed, with enough of your outfit visible.';
    elements.photoHint.dataset.tone = '';
    return false;
  }
  if (!photo.type.startsWith('image/')) {
    elements.photoHint.textContent = 'Choose a JPG, PNG, or WebP image.';
    elements.photoHint.dataset.tone = 'error';
    return false;
  }
  if (photo.size > 10 * 1024 * 1024) {
    elements.photoHint.textContent = 'Choose an image smaller than 10 MB.';
    elements.photoHint.dataset.tone = 'error';
    return false;
  }
  elements.photoHint.textContent = 'Photo selected. TrueFit will check that it shows a real person before generation.';
  elements.photoHint.dataset.tone = 'success';
  return true;
};

const activeTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab is available.');
  return tab;
};

const detectGarment = async () => {
  setMode('idle');
  setStatus('Scanning this page for a supported product…');
  const tab = await activeTab();
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'TRUEFIT_DETECT_GARMENT' });
  const validation = validateCandidate(response?.candidate);

  if (!validation.ok) {
    state.candidate = null;
    state.confirmed = false;
    elements.confirmPanel.classList.add('hidden');
    setMode('blocked');
    setStatus(validation.error, 'blocked');
    return;
  }

  state.candidate = validation.candidate;
  state.confirmed = false;
  elements.candidateImage.src = validation.candidate.imageUrl;
  elements.candidateTitle.textContent = validation.candidate.title;
  elements.candidateCategory.textContent = validation.candidate.category;
  elements.candidateMetadata.textContent = validation.candidate.metadata || validation.candidate.sizeHints || 'No material details detected.';
  elements.confirmPanel.classList.remove('hidden');
  elements.generateButton.disabled = true;
  setMode('confirming');
  setStatus('Review the product details before bringing it into your look.');
};

const confirmCandidate = () => {
  if (!state.candidate) return;
  state.confirmed = true;
  elements.generateButton.disabled = false;
  setStatus('Product confirmed. Preview the look when you are ready.');
};

const renderFitNote = (note) => {
  elements.fitNote.replaceChildren();
  const summary = document.createElement('p');
  summary.textContent = note.summary;
  elements.fitNote.append(summary);

  for (const [label, value] of [
    ['Stretch', note.stretch],
    ['Structure', note.structure],
    ['Uncertainty', note.uncertainty],
    ['Guidance', note.disclaimer],
  ]) {
    const heading = document.createElement('h3');
    heading.textContent = label;
    const paragraph = document.createElement('p');
    paragraph.textContent = value;
    elements.fitNote.append(heading, paragraph);
  }

  if (Array.isArray(note.pressurePoints) && note.pressurePoints.length > 0) {
    const heading = document.createElement('h3');
    heading.textContent = 'Likely pressure points';
    const list = document.createElement('ul');
    for (const point of note.pressurePoints) {
      const item = document.createElement('li');
      item.textContent = point;
      list.append(item);
    }
    elements.fitNote.append(heading, list);
  }
};

const generateFit = async () => {
  state.token = elements.apiToken.value.trim();
  state.basePhoto = elements.basePhoto.files?.[0] ?? null;

  if (!state.token || !state.basePhoto || !validatePersonPhoto() || !state.candidate || !state.confirmed) {
    setStatus('Confirm a supported garment, paste a session token, and choose a person photo first.', 'blocked');
    return;
  }

  elements.resultPanel.classList.remove('hidden');
  setMode('loading');
  setStatus('Checking your photo and generating the look. This can take a moment.');

  try {
    const result = await requestTryOn({ token: state.token, candidate: state.candidate, basePhoto: state.basePhoto });
    state.result = result;
    elements.resultImage.src = `data:${result.mimeType};base64,${result.imageBase64}`;
    renderFitNote(result.fitPhysicsNote);
    setMode('success');
    setStatus('Your look is ready. Save it privately or continue in the TrueFit community.');
  } catch (error) {
    state.result = null;
    elements.resultImage.removeAttribute('src');
    elements.fitNote.replaceChildren();
    setMode(error?.code === 'SAFETY_BLOCKED' ? 'blocked' : 'error');
    setStatus(error?.message || 'Try-on failed. You can retry after checking the detected garment and person photo.', error?.code === 'SAFETY_BLOCKED' ? 'blocked' : 'error');
  } finally {
    state.basePhoto = null;
  }
};

const saveResult = async () => {
  if (!state.result?.resultId || !state.token) return;
  elements.saveButton.disabled = true;
  setStatus('Saving approved result to your private wardrobe…');

  try {
    await saveToWardrobe({ token: state.token, resultId: state.result.resultId });
    setStatus('Saved to wardrobe. Closing clears extension session media.', 'success');
  } catch (error) {
    elements.saveButton.disabled = false;
    setStatus(error?.message || 'Save failed. You can retry.', 'error');
  }
};

elements.detectButton.addEventListener('click', () => void detectGarment());
elements.confirmButton.addEventListener('click', confirmCandidate);
elements.cancelButton.addEventListener('click', clearSessionState);
elements.closeButton.addEventListener('click', clearSessionState);
elements.retryButton.addEventListener('click', () => void detectGarment());
elements.generateButton.addEventListener('click', () => void generateFit());
elements.saveButton.addEventListener('click', () => void saveResult());
elements.basePhoto.addEventListener('change', validatePersonPhoto);
elements.communityButton.addEventListener('click', () => {
  void chrome.tabs.create({ url: `${TRUEFIT_WEB_APP_URL}/feed` });
});
