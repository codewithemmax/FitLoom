import { requestTryOn, saveToWardrobe } from './api-client.js';
import { refreshSession, signIn, signOut, signUp } from './auth-client.js';
import { FITLOOM_WEB_APP_URL } from './config.js';
import { validateCandidate } from './contracts.js';

const SESSION_KEY = 'fitloom-session';
// chrome.storage.session is memory-only and cleared when the browser closes, so
// nothing sensitive is ever written to disk. The person photo is deliberately
// never stored, and file inputs cannot be restored programmatically anyway.
const MAX_PERSISTED_RESULT_BYTES = 2 * 1024 * 1024;
// Refresh slightly before expiry so a long try-on cannot start on a token that
// dies mid-request.
const TOKEN_REFRESH_MARGIN_MS = 60 * 1000;

const state = {
  mode: 'idle',
  authMode: 'sign-in',
  candidate: null,
  confirmed: false,
  basePhoto: null,
  session: null,
  result: null,
};

const elements = {
  status: document.querySelector('#status'),
  authPanel: document.querySelector('#authPanel'),
  accountPanel: document.querySelector('#accountPanel'),
  setupPanel: document.querySelector('#setupPanel'),
  accountEmail: document.querySelector('#accountEmail'),
  signInTab: document.querySelector('#signInTab'),
  signUpTab: document.querySelector('#signUpTab'),
  authForm: document.querySelector('#authForm'),
  authEmail: document.querySelector('#authEmail'),
  authPassword: document.querySelector('#authPassword'),
  authHint: document.querySelector('#authHint'),
  authSubmit: document.querySelector('#authSubmit'),
  signOutButton: document.querySelector('#signOutButton'),
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

const sessionStorageArea = () => {
  try {
    return chrome.storage?.session ?? null;
  } catch {
    return null;
  }
};

const persistSession = async () => {
  const area = sessionStorageArea();
  if (area === null) return;

  if (state.session === null && state.candidate === null && state.result === null) {
    await clearPersistedSession();
    return;
  }

  // Skip very large results rather than blowing the session storage quota.
  const result =
    state.result !== null && (state.result.imageBase64?.length ?? 0) <= MAX_PERSISTED_RESULT_BYTES
      ? state.result
      : null;

  try {
    await area.set({
      [SESSION_KEY]: { session: state.session, candidate: state.candidate, confirmed: state.confirmed, result },
    });
  } catch {
    // A full or unavailable session store must never break the flow.
  }
};

const clearPersistedSession = async () => {
  const area = sessionStorageArea();
  if (area === null) return;

  try {
    await area.remove(SESSION_KEY);
  } catch {
    // Nothing to recover from here.
  }
};

const setAuthHint = (message, tone = '') => {
  elements.authHint.textContent = message;
  elements.authHint.dataset.tone = tone;
};

const renderAuth = () => {
  const signedIn = state.session !== null;

  elements.authPanel.classList.toggle('hidden', signedIn);
  elements.accountPanel.classList.toggle('hidden', !signedIn);
  elements.setupPanel.classList.toggle('hidden', !signedIn);

  if (signedIn) {
    elements.accountEmail.textContent = state.session.email || 'Your FitLoom account';
    return;
  }

  const isSignIn = state.authMode === 'sign-in';
  elements.signInTab.setAttribute('aria-selected', String(isSignIn));
  elements.signUpTab.setAttribute('aria-selected', String(!isSignIn));
  elements.authSubmit.textContent = isSignIn ? 'Sign in' : 'Create account';
  elements.authPassword.autocomplete = isSignIn ? 'current-password' : 'new-password';
};

const setAuthMode = (mode) => {
  state.authMode = mode;
  setAuthHint(
    mode === 'sign-in'
      ? 'Use the same account as the FitLoom web app.'
      : 'Pick a password of at least 8 characters.',
  );
  renderAuth();
};

const applySession = async (session) => {
  state.session = session;
  renderAuth();
  await persistSession();
};

/**
 * Every authenticated call goes through here so an expired access token is
 * silently refreshed instead of surfacing as a confusing 401 mid-flow.
 */
const getAccessToken = async () => {
  if (state.session === null) return null;
  if (Date.now() < state.session.expiresAt - TOKEN_REFRESH_MARGIN_MS) return state.session.accessToken;

  if (!state.session.refreshToken) {
    await applySession(null);
    return null;
  }

  try {
    const refreshed = await refreshSession(state.session.refreshToken);
    await applySession(refreshed);
    return refreshed.accessToken;
  } catch {
    await applySession(null);
    return null;
  }
};

const showCandidate = (candidate) => {
  elements.candidateImage.src = candidate.imageUrl;
  elements.candidateTitle.textContent = candidate.title;
  elements.candidateCategory.textContent = candidate.category;
  elements.candidateMetadata.textContent = candidate.metadata || candidate.sizeHints || 'No material details detected.';
  elements.confirmPanel.classList.remove('hidden');
};

/** Clears the try-on session only. Staying signed in is handled separately. */
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
  void persistSession();
};

const handleAuthSubmit = async (event) => {
  event.preventDefault();

  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || password.length < 8) {
    setAuthHint('Enter your email and a password of at least 8 characters.', 'error');
    return;
  }

  elements.authSubmit.disabled = true;
  setAuthHint(state.authMode === 'sign-in' ? 'Signing in…' : 'Creating your account…');

  try {
    if (state.authMode === 'sign-in') {
      await applySession(await signIn({ email, password }));
    } else {
      const outcome = await signUp({ email, password });

      if (outcome.status === 'confirmation_required') {
        // setAuthMode rewrites the hint, so the confirmation notice goes last.
        setAuthMode('sign-in');
        setAuthHint('Check your email to confirm the account, then sign in.', 'success');
        return;
      }

      await applySession(outcome.session);
    }

    elements.authForm.reset();
    setStatus('Signed in. Capture a product page to start a look.', 'success');
  } catch (error) {
    setAuthHint(error?.message || 'Sign-in failed. Try again.', 'error');
  } finally {
    elements.authSubmit.disabled = false;
  }
};

const handleSignOut = async () => {
  const accessToken = state.session?.accessToken;
  clearSessionState();
  await applySession(null);
  setAuthMode('sign-in');
  setStatus('Signed out. Nothing from this session was written to disk.');
  if (accessToken) await signOut(accessToken);
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
  elements.photoHint.textContent = 'Photo selected. FitLoom will check that it shows a real person before generation.';
  elements.photoHint.dataset.tone = 'success';
  return true;
};

const activeTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('NO_ACTIVE_TAB');
  return tab;
};

/** Chrome refuses injection on its own pages, the Web Store, and the PDF viewer. */
const describeScanFailure = (error) => {
  const message = String(error?.message ?? error ?? '');
  if (message === 'NO_ACTIVE_TAB') return 'No active tab is available. Open a product page and try again.';
  if (/cannot be scripted|Cannot access|chrome:\/\/|extension:\/\/|Extension manifest/iu.test(message)) {
    return 'FitLoom cannot read this page. Open a product page on a regular website and try again.';
  }
  return 'This page could not be scanned. Reload the product page and try again.';
};

const detectGarment = async () => {
  setMode('idle');
  setStatus('Scanning this page for a supported product…');

  let injected;

  try {
    const tab = await activeTab();
    [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content-script.js'],
    });
  } catch (error) {
    state.candidate = null;
    state.confirmed = false;
    elements.confirmPanel.classList.add('hidden');
    setMode('error');
    setStatus(describeScanFailure(error), 'error');
    return;
  }

  const validation = validateCandidate(injected?.result);

  if (!validation.ok) {
    state.candidate = null;
    state.confirmed = false;
    elements.confirmPanel.classList.add('hidden');
    setMode('blocked');
    setStatus(validation.error, 'blocked');
    await persistSession();
    return;
  }

  state.candidate = validation.candidate;
  state.confirmed = false;
  showCandidate(validation.candidate);
  elements.generateButton.disabled = true;
  setMode('confirming');
  setStatus('Review the product details before bringing it into your look.');
  await persistSession();
};

const confirmCandidate = () => {
  if (!state.candidate) return;
  state.confirmed = true;
  elements.generateButton.disabled = false;
  setStatus('Product confirmed. Preview the look when you are ready.');
  void persistSession();
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

const blockedCodes = new Set(['SAFETY_BLOCKED', 'PERSON_PHOTO_INVALID']);

const generateFit = async () => {
  state.basePhoto = elements.basePhoto.files?.[0] ?? null;

  if (!state.basePhoto || !validatePersonPhoto() || !state.candidate || !state.confirmed) {
    setStatus('Confirm a supported garment and choose a person photo first.', 'blocked');
    return;
  }

  const token = await getAccessToken();

  if (token === null) {
    setStatus('Your session expired. Sign in again to preview this look.', 'blocked');
    return;
  }

  elements.resultPanel.classList.remove('hidden');
  setMode('loading');
  setStatus('Checking your photo and generating the look. This can take a moment.');

  try {
    const result = await requestTryOn({ token, candidate: state.candidate, basePhoto: state.basePhoto });
    state.result = result;
    elements.resultImage.src = `data:${result.mimeType};base64,${result.imageBase64}`;
    renderFitNote(result.fitPhysicsNote);
    setMode('success');
    setStatus('Your look is ready. Save it privately or continue in the FitLoom community.');
    await persistSession();
  } catch (error) {
    state.result = null;
    elements.resultImage.removeAttribute('src');
    elements.fitNote.replaceChildren();
    const blocked = blockedCodes.has(error?.code);
    setMode(blocked ? 'blocked' : 'error');
    setStatus(
      error?.message || 'Try-on failed. You can retry after checking the detected garment and person photo.',
      blocked ? 'blocked' : 'error',
    );
  } finally {
    state.basePhoto = null;
  }
};

const saveResult = async () => {
  if (!state.result?.resultId) return;

  const token = await getAccessToken();

  if (token === null) {
    setStatus('Your session expired. Sign in again to save this look.', 'blocked');
    return;
  }

  elements.saveButton.disabled = true;
  setStatus('Saving approved result to your private wardrobe…');

  try {
    await saveToWardrobe({ token, resultId: state.result.resultId });
    setStatus('Saved to wardrobe. Closing clears extension session media.', 'success');
  } catch (error) {
    elements.saveButton.disabled = false;
    setStatus(error?.message || 'Save failed. You can retry.', 'error');
  }
};

/**
 * Chrome destroys the popup whenever it loses focus, so the signed-in session,
 * the confirmed garment, and the last result are rehydrated here. Only the
 * person photo has to be picked again.
 */
const restoreSession = async () => {
  const area = sessionStorageArea();
  if (area === null) {
    renderAuth();
    return;
  }

  let saved;

  try {
    ({ [SESSION_KEY]: saved } = await area.get(SESSION_KEY));
  } catch {
    renderAuth();
    return;
  }

  if (!saved) {
    renderAuth();
    return;
  }

  state.session = saved.session ?? null;
  state.candidate = saved.candidate ?? null;
  state.confirmed = Boolean(saved.confirmed);
  state.result = saved.result ?? null;
  renderAuth();

  if (state.session === null) {
    setStatus('Sign in to start a look.');
    return;
  }

  if (state.candidate !== null) {
    showCandidate(state.candidate);
    elements.generateButton.disabled = !state.confirmed;
  }

  if (state.result !== null) {
    elements.resultPanel.classList.remove('hidden');
    elements.resultImage.src = `data:${state.result.mimeType};base64,${state.result.imageBase64}`;
    renderFitNote(state.result.fitPhysicsNote);
    setMode('success');
    setStatus('Restored your last look. Choose your photo again to generate a new one.');
    return;
  }

  if (state.candidate !== null) {
    setMode(state.confirmed ? 'confirming' : 'idle');
    setStatus('Restored this session. Choose your photo again to preview the look.');
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
elements.authForm.addEventListener('submit', (event) => void handleAuthSubmit(event));
elements.signInTab.addEventListener('click', () => setAuthMode('sign-in'));
elements.signUpTab.addEventListener('click', () => setAuthMode('sign-up'));
elements.signOutButton.addEventListener('click', () => void handleSignOut());
elements.communityButton.addEventListener('click', () => {
  void chrome.tabs.create({ url: `${FITLOOM_WEB_APP_URL}/feed` });
});

void restoreSession();
