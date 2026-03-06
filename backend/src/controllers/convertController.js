import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename);

const loadCSS = (filename) => {
  const css = path.join(__dirname, '../config', filename);
  try{
    return fs.readFileSync(css, 'utf-8');
  } catch(error){
    console.error(`Failed to load CSS: ${filename}`, error);
    return '';
  }
}

const createFilename = (url) => { return new URL(url).hostname.replace(/^www\./, '').split('.')[0] + '.pdf';};

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Launch a Puppeteer browser 
const launchBrowser = (extraArgs = []) => puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', ...extraArgs],
  protocolTimeout: 45_000,
});

//  Configure a new page (timeout, user-agent, viewport)
const setupPage = async (browser, { width = 1600, height = 1200 } = {}) => {
  const page = await browser.newPage();
  page.setDefaultTimeout(120_000);
  page.setDefaultNavigationTimeout(120_000);
  await page.setUserAgent(DEFAULT_USER_AGENT);
  await page.setViewport({ width, height });
  return page;
};

const gotoPage = (page, url) => page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

const closeBrowser = async (browser) => {
  if (browser) {
    try {
      await browser.close();
    } catch (_) {}
  }
};

const withBrowser = async (fn, { extraArgs = [], viewport } = {}) => {
  const browser = await launchBrowser(extraArgs);
  try {
    const page = await setupPage(browser, viewport);
    return await fn(browser, page);
  } finally {
    await closeBrowser(browser);
  }
};

const toUrlPattern = (rawUrl) => {
  const { hostname, pathname } = new URL(rawUrl);
  const segments = pathname.replace(/\/$/, '').split('/');

  // Nếu segment cuối trông như ID (số, hoặc chuỗi dài > 8 ký tự) → thay bằng *
  const lastSegment = segments[segments.length - 1];
  const looksLikeId = /^\d+$/.test(lastSegment) || lastSegment.length > 8;
  if (looksLikeId) segments[segments.length - 1] = '*';

  return hostname + segments.join('/');
};

const saveSelectors = (sessionId, url, selectors) => {
  if (!sessionId || !selectors?.length) return;

  const pattern = toUrlPattern(url);

  if (!selectorMemory.has(sessionId)) selectorMemory.set(sessionId, new Map());
  const sessionMap = selectorMemory.get(sessionId);

  sessionMap.set(pattern, [...selectors]);

  console.log(`Saved ${selectors.length} selectors for [${sessionId}] → ${pattern}`);
};

const getSavedSelectors = (sessionId, url) => {
  const pattern = toUrlPattern(url);
  return selectorMemory.get(sessionId)?.get(pattern) ?? [];
};

const previewCache = new Map();

const selectorMemory = new Map();

// ─────────────────────────────────────────────
// Header / Footer Memory
// ─────────────────────────────────────────────

/**
 * Lưu header/footer config theo: sessionId → urlPattern → config
 * config = { headerText, footerText, logoBase64, logoMime }
 */
const headerFooterMemory = new Map();

const saveHeaderFooter = (sessionId, url, config) => {
  if (!sessionId) return;
  const pattern = toUrlPattern(url);
  if (!headerFooterMemory.has(sessionId)) headerFooterMemory.set(sessionId, new Map());
  headerFooterMemory.get(sessionId).set(pattern, config);
  console.log(`Saved header/footer for [${sessionId}] → ${pattern}`);
};

const getSavedHeaderFooter = (sessionId, url) => {
  if (!sessionId) return null;
  const pattern = toUrlPattern(url);
  return headerFooterMemory.get(sessionId)?.get(pattern) ?? null;
};

/**
 * Build HTML string cho header hoặc footer dùng trong page.pdf()
 * Puppeteer yêu cầu inline style, không dùng được class ngoài
 */
const buildHeaderTemplate = ({ headerText, logoBase64, logoMime } = {}) => {
  const logo = logoBase64
    ? `<img src="data:${logoMime};base64,${logoBase64}" style="height:28px;object-fit:contain;margin-right:8px;" />`
    : '';
  const text = headerText
    ? `<span style="font-size:9px;color:#444;">${headerText}</span>`
    : '';

  if (!logo && !text) return '<span></span>';

  return `
    <div style="width:100%;display:flex;align-items:center;padding:4px 40px;border-bottom:1px solid #ddd;">
      ${logo}${text}
    </div>`;
};

const buildFooterTemplate = ({ footerText } = {}, currentDate) => {
  const left = footerText
    ? `<span style="font-size:9px;color:#666;">${footerText}</span>`
    : `<span style="font-size:9px;color:#666;">${currentDate}</span>`;

  return `
    <div style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:4px 40px;">
      ${left}
      <span style="font-size:9px;color:#666;">Page <span class="pageNumber"></span></span>
    </div>`;
};

export const previewWebsite = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ 
    error: 'URL is required' 
  });

  try {
    console.log('Interactive preview:', url);

    const html = await withBrowser(async (_browser, page) => {
      await gotoPage(page, url);
      await new Promise((r) => setTimeout(r, 2_000));
      console.log('Website loaded');

      // Inline all the CSS of the website
      await page.evaluate(() => {
        const styles = [...document.querySelectorAll('style')].map((s) => s.textContent);

        for (const sheet of document.styleSheets) {
          try {
            const css = [...(sheet.cssRules ?? [])].map((r) => r.cssText).join('\n');
            if (css) styles.push(css);
          } catch (_) {}
        }
        // Remove link
        document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => l.remove());
        // Add all in tag 'style'
        const combined = document.createElement('style');
        combined.textContent = styles.join('\n');
        document.head.insertBefore(combined, document.head.firstChild);
      });

      // Add <base> tag 
      await page.evaluate((baseUrl) => {
        document.querySelectorAll('base').forEach((b) => b.remove());
        const base = document.createElement('base');
        base.href = baseUrl;
        document.head.insertBefore(base, document.head.firstChild);
      }, url);

      // Fix absolute url, remove scripts, disable links
      await page.evaluate((baseUrl) => {
        document.querySelectorAll('img').forEach((img) => {
          if (img.src && !img.src.startsWith('data:'))
            img.src = new URL(img.src, baseUrl).href;
        });

        document.querySelectorAll('[style*="background"]').forEach((el) => {
          el.setAttribute(
            'style',
            (el.getAttribute('style') ?? '').replace(
              /url\(['"]?([^'")]+)['"]?\)/g,
              (match, u) => (u.startsWith('data:') ? match : `url('${new URL(u, baseUrl).href}')`)
            )
          );
        });

        document.querySelectorAll('script').forEach((s) => s.remove());
        document.querySelectorAll('a').forEach((a) => (a.href = 'javascript:void(0)'));
      }, url);

      // Inject interaction-highlight styles
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.id = 'BLOCKER_STYLES_INJECTED';
        style.textContent = `
          .iframe-hover-highlight {
            outline: 5px solid #ff0000 !important;
            outline-offset: 2px !important;
            cursor: pointer !important;
            background: rgba(255, 0, 0, 0.2) !important;
            z-index: 999999 !important;
          }
          .iframe-blocked { display: none !important; }
        `;
        document.head.appendChild(style);
      });

      return page.content();
    });

    const previewId = Math.random().toString(36).substring(7);
    previewCache.set(previewId, html);
    setTimeout(() => previewCache.delete(previewId), 10 * 60_000);

    console.log('Preview cached:', previewId);
    res.json({ previewId });
  } catch (error) {
    console.error('Preview error:', error.message);
    res.status(500).json({ error: 'Preview failed', message: error.message });
  }
};

// Get HTML from cache
export const getPreview = (req, res) => {
  const html = previewCache.get(req.params.id);
  if (!html) return res.status(404).send('Preview not found or expired');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.send(html);
};

// GET /header-footer/suggest?url=...
export const getSuggestedHeaderFooter = (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param is required' });

  const sessionId = req.cookies?.sessionId;
  const config = getSavedHeaderFooter(sessionId, url);
  const pattern = toUrlPattern(url);

  console.log(`Suggest header/footer [${sessionId}] → ${pattern}`);
  res.json({ config, pattern });
};

export const getSuggestedSelectors = (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url query param is required' });

  const sessionId = req.cookies?.sessionId;
  if (!sessionId) return res.json({ selectors: [], pattern: null });

  const pattern = toUrlPattern(url);
  const selectors = getSavedSelectors(sessionId, url);

  console.log(`Suggest [${sessionId}] → ${pattern}: ${selectors.length} selectors`);
  res.json({ selectors, pattern });
};

export const urlToPdf = async (req, res) => {
  const { url, options = {}, blockedSelectors = [] } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  
  // Create session
  let sessionId = req.cookies?.sessionId;
  if(!sessionId){
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    console.log('New session created:', sessionId);
  }

  const filename = options.filename || createFilename(url);
  console.log('Converting:', url);
  console.log('Blocked selectors:', blockedSelectors);

  // Header/footer config — từ request hoặc từ memory nếu không gửi lên
  const { headerFooter } = req.body;
  const savedHf = getSavedHeaderFooter(sessionId, url);
  const hfConfig = headerFooter ?? savedHf;
  if (hfConfig) saveHeaderFooter(sessionId, url, hfConfig);

  try {
    const pdfBuffer = await withBrowser(
      async (_browser, page) => {
        // Spoof automation flags
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          window.navigator.chrome = { runtime: {}, app: {} };
          Object.defineProperty(navigator, 'plugins', {
            get: () => [{ name: 'Chrome PDF Plugin' }],
          });
        });

        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });

        console.log('📡 Loading page...');
        await gotoPage(page, url);
        console.log('Page loaded');

        if (options.acceptCookies !== false) await acceptCookies(page);

        // Hide blocked elements
        if (blockedSelectors.length > 0) {
          console.log(`Hiding ${blockedSelectors.length} blocked elements`);
          await page.evaluate((selectors) => {
            selectors.forEach((selector) => {
              try {
                const els = document.querySelectorAll(selector);
                els.forEach((el) => el.style.setProperty('display', 'none', 'important'));
                console.log(`Hidden: ${selector} (${els.length} elements)`);
              } catch (err) {
                console.error(`Failed to hide: ${selector}`, err);
              }
            });
          }, blockedSelectors);
          await new Promise((r) => setTimeout(r, 500));
          console.log('Blocked elements hidden');

          // Wait for browser to finish reflow after hiding many elements —
          // rAF x2 ensures the browser has painted before we generate the PDF
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await new Promise((r) => setTimeout(r, 800));
        }

        // Inject custom CSS
        const customCSS = buildCSS(options);
        if (customCSS) {
          await page.addStyleTag({ content: customCSS });
          await new Promise((r) => setTimeout(r, 1_000));
          console.log('CSS injected');
        }

        const pageTitle = await page.title();
        const currentDate = new Date().toLocaleDateString();

        // hfConfig từ closure — có thể là từ request hoặc từ memory
        console.log('Generating PDF');
        return page.pdf({
          format: options.format || 'A4',
          printBackground: options.printBackground !== false,
          landscape: options.landscape || false,
          scale: options.scale || 1.0,
          margin: {
            top: options.marginTop || '80px',
            right: options.marginRight || '40px',
            bottom: options.marginBottom || '80px',
            left: options.marginLeft || '40px',
          },
          displayHeaderFooter: options.displayHeaderFooter !== false,
          headerTemplate: buildHeaderTemplate(hfConfig ?? { headerText: pageTitle }),
          footerTemplate: buildFooterTemplate(hfConfig ?? {}, currentDate),
        });
      },
      {
        extraArgs: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
        ],
      }
    );

    console.log('PDF generated successfully');
    if (sessionId) saveSelectors(sessionId, url, blockedSelectors);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Conversion failed', message: error.message });
  }
};

const acceptCookies = async (page) => {
  try {
    await new Promise(r => setTimeout(r, 1000));
    const clicked = await Promise.race([
      page.evaluate(() => {
        const texts = ['accept', 'хорошо', 'принять', 'согласен', 'ok'];
        const elements = document.querySelectorAll('button, a, [role="button"]');
        
        for (const element of elements) {
          if (texts.some(t => element.textContent.toLowerCase().includes(t))) {
            element.click();
            return true;
          }
        }
        return false;
      }),
      new Promise(resolve => setTimeout(() => resolve(false), 1000))
    ]).catch(() => false);
    
    if (clicked) {
      console.log('Cookie accepted');
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (error) {}
};

const buildCSS = (options) => {
  let css = '';
  const cssFiles = [
    { condition: options.removeHeader, file: 'remove-header.css' },
    { condition: options.removeFooter, file: 'remove-footer.css' },
  ];

  cssFiles.forEach(({ condition, file }) => {
    if (condition) {
      css += loadCSS(file) + '\n';
    }
  });

  if (options.customCSS) {
    css += options.customCSS + '\n';
  }

  return css;
};