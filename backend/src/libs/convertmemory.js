// In-Memory Stores 

const previewCache       = new Map();
const selectorMemory     = new Map();
const headerFooterMemory = new Map();

// URL Pattern 

export const toUrlPattern = (rawUrl) => {
  const { hostname, pathname } = new URL(rawUrl);
  const segments = pathname.replace(/\/$/, '').split('/');

  const lastSegment = segments[segments.length - 1];
  const looksLikeId = /^\d+$/.test(lastSegment) || lastSegment.length > 8;
  if (looksLikeId) segments[segments.length - 1] = '*';

  return hostname + segments.join('/');
};

// Preview Cache 

export const setPreview = (html, ttlMs = 10 * 60_000) => {
  const previewId = Math.random().toString(36).substring(7);
  previewCache.set(previewId, html);
  setTimeout(() => previewCache.delete(previewId), ttlMs);
  return previewId;
};

export const getPreviewHtml = (previewId) => previewCache.get(previewId) ?? null;

// Selector Memory 

export const saveSelectors = (sessionId, url, selectors) => {
  if (!sessionId || !selectors?.length) return;

  const pattern = toUrlPattern(url);
  if (!selectorMemory.has(sessionId)) selectorMemory.set(sessionId, new Map());
  selectorMemory.get(sessionId).set(pattern, [...selectors]);

  console.log(`Saved ${selectors.length} selectors for [${sessionId}] → ${pattern}`);
};

export const getSavedSelectors = (sessionId, url) => {
  const pattern = toUrlPattern(url);
  return selectorMemory.get(sessionId)?.get(pattern) ?? [];
};

// Header/Footer Memory

export const saveHeaderFooter = (sessionId, url, config) => {
  if (!sessionId) return;
  const pattern = toUrlPattern(url);
  if (!headerFooterMemory.has(sessionId)) headerFooterMemory.set(sessionId, new Map());
  headerFooterMemory.get(sessionId).set(pattern, config);
  console.log(`Saved header/footer for [${sessionId}] → ${pattern}`);
};

export const getSavedHeaderFooter = (sessionId, url) => {
  if (!sessionId) return null;
  const pattern = toUrlPattern(url);
  return headerFooterMemory.get(sessionId)?.get(pattern) ?? null;
};