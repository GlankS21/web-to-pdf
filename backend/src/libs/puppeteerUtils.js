import puppeteer from 'puppeteer';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const launchBrowser = (extraArgs = []) =>
  puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', ...extraArgs],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });

const setupPage = async (browser, { width = 1600, height = 1200 } = {}) => {
  const page = await browser.newPage();
  page.setDefaultTimeout(120_000);
  page.setDefaultNavigationTimeout(120_000);
  await page.setUserAgent(DEFAULT_USER_AGENT);
  await page.setViewport({ width, height });
  return page;
};

const closeBrowser = async (browser) => {
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
};

export const withBrowser = async (fn, { extraArgs = [], viewport } = {}) => {
  const browser = await launchBrowser(extraArgs);
  try {
    const page = await setupPage(browser, viewport);
    return await fn(browser, page);
  } finally {
    await closeBrowser(browser);
  }
};

// Domains to block — slow or unreachable in restricted networks
const BLOCKED_ORIGINS = [
  'fonts.googleapis.com', 'fonts.gstatic.com',
  'accounts.google.com', 'apis.google.com',
  'www.google-analytics.com', 'analytics.google.com',
  'googletagmanager.com', 'www.googletagservices.com',
  'ssl.google-analytics.com', 'www.recaptcha.net', 'recaptcha.google.com',
  'connect.facebook.net', 'www.facebook.com',
  'platform.twitter.com', 'syndication.twitter.com',
  'cdnjs.cloudflare.com', 'ajax.cloudflare.com',
  'cdn.jsdelivr.net', 'unpkg.com',
  'use.typekit.net', 'p.typekit.net',
  'mc.yandex.ru', 'counter.yadro.ru',
  'top-fwz1.mail.ru', 'top.mail.ru',
  'code.jivosite.com', 'widget.jivosite.com',
];

const shouldBlock = (reqUrl) => {
  try {
    const host = new URL(reqUrl).hostname;
    return BLOCKED_ORIGINS.some((b) => host === b || host.endsWith('.' + b));
  } catch { return false; }
};

const enableBlocking = async (page) => {
  await page.setRequestInterception(true);
  page.on('request', (req) => (shouldBlock(req.url()) ? req.abort() : req.continue()));
};

export const loadPage = async (page, url, { timeout = 60_000 } = {}) => {
  await enableBlocking(page);

  // Navigate — try networkidle2, fall back to domcontentloaded
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout });
    console.log('[load] networkidle2');
  } catch (_) {
    console.warn('[load] networkidle2 timed out, falling back to domcontentloaded');
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      console.log('[load] domcontentloaded');
    } catch (e) {
      console.error('[load] navigation failed:', e.message);
      throw e;
    }
  }

  // Wait for main-thread idle
  try {
    await page.evaluate(
      (ms) => new Promise((resolve) => {
        const id = setTimeout(resolve, ms);
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => { clearTimeout(id); resolve(); }, { timeout: ms });
        }
      }),
      4_000
    );
  } catch (_) {}

  // Scroll to trigger lazy-loaded content
  try {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let last = -1;
        const step = () => {
          window.scrollBy(0, window.innerHeight);
          const cur = window.scrollY;
          if (cur === last) { window.scrollTo(0, 0); resolve(); return; }
          last = cur;
          setTimeout(step, 300);
        };
        step();
      });
    });
  } catch (_) {}

  // Wait for all images to finish loading
  try {
    await Promise.race([
      page.evaluate(() =>
        Promise.allSettled([
          ...Array.from(document.images)
            .filter((img) => !img.complete)
            .map((img) => new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            })),
          document.fonts?.ready ?? Promise.resolve(),
        ])
      ),
      new Promise((r) => setTimeout(r, 8_000)),
    ]);
    console.log('[load] images loaded');
  } catch (_) {}

  // Flush pending animation frames
  try {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  } catch (_) {}

  await new Promise((r) => setTimeout(r, 600));
  console.log('[load] done');
};

export const gotoPage = (page, url) => loadPage(page, url);
