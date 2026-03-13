import fs from 'fs';
import path from 'path';

import { withBrowser, gotoPage } from '../libs/puppeteerUtils.js';
import { buildHeaderTemplate, buildFooterTemplate } from '../libs/pdftemplates.js';
import { createFilename, saveHistory, UPLOADS_DIR } from '../libs/fileutils.js';
import { toUrlPattern, setPreview, getPreviewHtml, saveSelectors, getSavedSelectors, saveHeaderFooter, getSavedHeaderFooter } from '../libs/convertmemory.js';
import { MOBILE_UA, MOBILE_VP, PAPER_W, PAPER_H, injectPdfPreset, disableAnimationsOnNewDocument, removeBlankPages } from '../libs/pdfUtils.js';

export const previewWebsite = async (req, res) => {
  const { url, mobile } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // SSE streaming — disable proxy buffering
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (type, payload) => {
    res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };
  const log = (msg) => { console.log(msg); send('log', { message: msg }); };

  try {
    log(`[preview] ${url}${mobile ? ' (mobile)' : ''}`);
    log('[preview] launching browser...');

    const html = await withBrowser(async (_browser, page) => {
      log('[preview] browser launched, loading page...');
      if (mobile) await page.setUserAgent(MOBILE_UA);

      await gotoPage(page, url, { log });
      log('[preview] accepting cookies...');
      await acceptCookies(page);
      await new Promise((r) => setTimeout(r, 2_000));

      log('[preview] processing HTML...');
      await page.evaluate((baseUrl) => {
        const abs = (u) => {
          if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('#')) return u;
          try { return new URL(u, baseUrl).href; } catch { return u; }
        };

        document.querySelectorAll('base').forEach((b) => b.remove());
        const base = document.createElement('base');
        base.href = baseUrl;
        document.head.insertBefore(base, document.head.firstChild);

        document.querySelectorAll('link[href]').forEach((l) => { if (l.href) l.href = abs(l.href); });
        document.querySelectorAll('img[src]').forEach((img) => { img.src = abs(img.src); });
        document.querySelectorAll('img[srcset], source[srcset]').forEach((el) => {
          el.srcset = el.srcset
            .split(',')
            .map((part) => { const [u, ...rest] = part.trim().split(/\s+/); return [abs(u), ...rest].join(' '); })
            .join(', ');
        });
        document.querySelectorAll('source[src]').forEach((s) => { s.src = abs(s.src); });

        document.querySelectorAll('[style*="background"]').forEach((el) => {
          el.setAttribute('style', (el.getAttribute('style') ?? '').replace(
            /url\(['"]?([^'")]+)['"]?\)/g, (_m, u) => `url('${abs(u)}')`
          ));
        });

        document.querySelectorAll('style').forEach((style) => {
          style.textContent = style.textContent.replace(
            /url\(['"]?([^'")]+)['"]?\)/g, (_m, u) => `url('${abs(u)}')`
          );
        });

        document.querySelectorAll('*').forEach((el) => {
          const s = window.getComputedStyle(el);
          if (s.display === 'none') {
            el.style.setProperty('display', 'none', 'important');
          } else if (s.visibility === 'hidden') {
            el.style.setProperty('visibility', 'hidden', 'important');
          } else if (s.opacity === '0') {
            el.style.setProperty('opacity', '0', 'important');
          } else if (
            s.overflow === 'hidden' &&
            el.scrollHeight > el.clientHeight &&
            el.clientHeight < 5
          ) {
            el.style.setProperty('display', 'none', 'important');
          }
        });

        document.querySelectorAll('script').forEach((s) => s.remove());
        document.querySelectorAll('a[href]').forEach((a) => (a.href = 'javascript:void(0)'));
        document.querySelectorAll('form').forEach((f) => f.setAttribute('action', 'javascript:void(0)'));
      }, url);

      await page.evaluate(() => {
        const style = document.createElement('style');
        style.id = 'BLOCKER_STYLES_INJECTED';
        style.textContent = `
          .iframe-hover-highlight {
            outline: 2px solid #ff0000 !important;
            outline-offset: 1px !important;
            cursor: pointer !important;
            background: rgba(255,0,0,0.2) !important;
            z-index: 999999 !important;
          }
          .iframe-blocked { display: none !important; }
        `;
        document.head.appendChild(style);
      });

      if (mobile) {
        await page.evaluate(() => {
          let vp = document.querySelector('meta[name="viewport"]');
          if (!vp) {
            vp = document.createElement('meta');
            vp.setAttribute('name', 'viewport');
            document.head.insertBefore(vp, document.head.firstChild);
          }
          vp.setAttribute('content', 'width=480, initial-scale=1');
        });
      }

      log('[preview] inlining fonts...');
      // Inline @font-face fonts as base64 to avoid CORS issues in srcDoc iframe
      await page.evaluate(async (baseUrl) => {
        const abs = (u) => {
          if (!u || u.startsWith('data:') || u.startsWith('blob:')) return u;
          try { return new URL(u, baseUrl).href; } catch { return u; }
        };

        // Collect all @font-face rules from accessible stylesheets
        const fontRules = [];
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSFontFaceRule) {
                fontRules.push(rule.cssText);
              }
            }
          } catch (_) {} // cross-origin sheets throw SecurityError
        }

        // Also fetch and parse cross-origin stylesheets (e.g. Google Fonts)
        for (const link of document.querySelectorAll('link[rel="stylesheet"][href]')) {
          const href = link.href;
          if (!href || href.startsWith('data:')) continue;
          // Check if we already read this sheet's rules above
          let alreadyRead = false;
          for (const sheet of document.styleSheets) {
            try { if (sheet.href === href && sheet.cssRules) { alreadyRead = true; break; } } catch (_) {}
          }
          if (alreadyRead) continue;
          try {
            const cssText = await fetch(abs(href)).then((r) => r.ok ? r.text() : '');
            const faces = cssText.match(/@font-face\s*\{[^}]+\}/gi) || [];
            fontRules.push(...faces);
          } catch (_) {}
        }

        if (!fontRules.length) return;

        // For each font rule, fetch font URLs and convert to base64
        const inlined = [];
        for (const rule of fontRules) {
          let css = rule;
          const urlMatches = [...rule.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)];
          for (const [full, rawUrl] of urlMatches) {
            if (rawUrl.startsWith('data:')) continue;
            try {
              const fontUrl = abs(rawUrl);
              const resp = await fetch(fontUrl);
              if (!resp.ok) continue;
              const blob = await resp.blob();
              const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              css = css.replace(full, `url('${dataUrl}')`);
            } catch (_) {}
          }
          inlined.push(css);
        }

        if (inlined.length) {
          const style = document.createElement('style');
          style.id = 'INLINED_FONTS';
          style.textContent = inlined.join('\n');
          document.head.appendChild(style);
        }
      }, url);

      return page.content();
    }, mobile ? { viewport: { width: MOBILE_VP, height: 844 } } : {});

    const previewId = setPreview(html);
    log(`[preview] cached → ${previewId}`);
    send('done', { previewId });
    res.end();
  } catch (error) {
    console.error('[preview] error:', error.message);
    send('error', { message: error.message });
    res.end();
  }
};

export const getPreview = (req, res) => {
  const html = getPreviewHtml(req.params.id);
  if (!html) return res.status(404).send('Preview not found or expired');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

export const getSuggestedHeaderFooter = (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param is required' });
  const sessionId = req.cookies?.sessionId;
  const config = getSavedHeaderFooter(sessionId, url);
  res.json({ config, pattern: toUrlPattern(url) });
};

export const getSuggestedSelectors = (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param is required' });
  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return res.json({ selectors: [], pattern: null });
  const selectors = getSavedSelectors(sessionId, url);
  res.json({ selectors, pattern: toUrlPattern(url) });
};

export const urlToPdf = async (req, res) => {
  const { url, options = {}, blockedSelectors = [], headerFooter } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    res.cookie('sessionId', sessionId, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  const filename = options.filename || createFilename(url);
  const savedHf  = getSavedHeaderFooter(sessionId, url);
  const hfConfig = headerFooter ?? savedHf;
  if (hfConfig) saveHeaderFooter(sessionId, url, hfConfig);

  console.log(`[urlToPdf] ${url}`);

  try {
    const pdfBuffer = await withBrowser(async (_browser, page) => {
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.navigator.chrome = { runtime: {}, app: {} };
        Object.defineProperty(navigator, 'plugins', { get: () => [{ name: 'Chrome PDF Plugin' }] });
      });

      await disableAnimationsOnNewDocument(page);

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      const format      = options.format || 'A4';
      const landscape   = options.landscape || false;
      const marginLeft  = parseInt(options.marginLeft  || '40') || 40;
      const marginRight = parseInt(options.marginRight || '40') || 40;
      const paperW      = landscape ? (PAPER_H[format] ?? 1123) : (PAPER_W[format] ?? 794);
      const contentW    = Math.max(paperW - marginLeft - marginRight, 200);

      if (options.mobile) {
        await page.setUserAgent(MOBILE_UA);
        await page.setViewport({ width: MOBILE_VP, height: 844 });
      }

      await gotoPage(page, url);

      if (options.acceptCookies !== false) await acceptCookies(page);

      if (blockedSelectors.length > 0) {
        await page.evaluate((selectors) => {
          selectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => el.style.setProperty('display', 'none', 'important'));
          });
        }, blockedSelectors);
        await new Promise((r) => setTimeout(r, 500));
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await new Promise((r) => setTimeout(r, 800));
      }

      await injectPdfPreset(page);

      const pageTitle = await page.title();
      const currentDate = new Date().toLocaleDateString();
      const pdfScale = options.mobile ? Math.min(contentW / MOBILE_VP, 2) : (options.scale || 1.0);

      const raw = await page.pdf({
        format,
        landscape,
        scale: pdfScale,
        printBackground: options.printBackground !== false,
        margin: {
          top: options.marginTop || '80px',
          right: marginRight + 'px',
          bottom: options.marginBottom || '80px',
          left: marginLeft + 'px',
        },
        displayHeaderFooter: options.displayHeaderFooter !== false,
        headerTemplate: buildHeaderTemplate(hfConfig ?? { headerText: pageTitle }),
        footerTemplate: buildFooterTemplate(hfConfig ?? {}, currentDate),
      });
      return removeBlankPages(raw);
    }, {
      extraArgs: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
    });

    if (sessionId) saveSelectors(sessionId, url, blockedSelectors);

    if (req.user?._id) {
      const filePath = path.join(UPLOADS_DIR, `${req.user._id}-${Date.now()}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);
      await saveHistory(req.user._id, 'url-to-pdf', filename, filePath, url);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[urlToPdf] error:', error.message);
    res.status(500).json({ error: 'Conversion failed', message: error.message });
  }
};

const acceptCookies = async (page) => {
  try {
    await new Promise((r) => setTimeout(r, 1500));
    const clicked = await Promise.race([
      page.evaluate(() => {
        const texts = [
          'accept all', 'accept cookies', 'allow all', 'allow cookies',
          'i agree', 'agree', 'accept', 'ok', 'got it', 'i understand',
          'continue', 'consent', 'confirm',
          'принять все', 'принять', 'согласен', 'хорошо', 'ок',
        ];
        const selectors = [
          '[id*="cookie"] button', '[class*="cookie"] button',
          '[id*="consent"] button', '[class*="consent"] button',
          '[id*="gdpr"] button', '[class*="gdpr"] button',
          '[id*="banner"] button', '[class*="banner"] button',
          '[id*="notice"] button', '[class*="notice"] button',
          'button', 'a[role="button"]', '[role="button"]',
        ];
        for (const sel of selectors) {
          for (const el of document.querySelectorAll(sel)) {
            const t = el.textContent.trim().toLowerCase();
            if (t && texts.some((kw) => t.includes(kw))) { el.click(); return true; }
          }
        }
        return false;
      }),
      new Promise((r) => setTimeout(() => r(false), 2000)),
    ]).catch(() => false);

    if (clicked) await new Promise((r) => setTimeout(r, 1000));
  } catch (_) {}
};
