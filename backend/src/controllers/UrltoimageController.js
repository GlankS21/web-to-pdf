import fs from 'fs';
import path from 'path';
import { withBrowser, gotoPage } from '../libs/puppeteerUtils.js';
import { saveHistory, UPLOADS_DIR } from '../libs/fileutils.js';
import { MOBILE_UA, MOBILE_VP, injectPdfStyles, disableAnimationsOnNewDocument } from '../libs/pdfUtils.js';

const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

export const urlToImage = async (req, res) => {
  const { url, html, options = {}, blockedSelectors = [] } = req.body;
  if (!url && !html) return res.status(400).json({ message: 'url or html is required' });

  const format   = options.format   || 'png';
  const mobile   = options.mobile ?? false;
  const width    = mobile ? MOBILE_VP : (options.width  || 1600);
  const height   = mobile ? 844       : (options.height || 900);
  const fullPage = options.fullPage ?? true;
  const quality  = options.quality  || 90;

  try {
    const hostname = html ? 'html-export' : new URL(url).hostname.replace(/^www\./, '').split('.')[0];
    const filename = options.filename || `${hostname}-${Date.now()}.${format}`;

    const imageBuffer = await withBrowser(async (_browser, page) => {
      if (mobile) await page.setUserAgent(MOBILE_UA);

      if (html) {
        await page.emulateMediaType('screen');
        await page.setContent(html, { waitUntil: 'networkidle2', timeout: 60_000 });
      } else {
        await disableAnimationsOnNewDocument(page);
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });
        await gotoPage(page, url);
      }

      if (blockedSelectors.length > 0) {
        await page.evaluate((selectors) => {
          selectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) =>
              el.style.setProperty('display', 'none', 'important'));
          });
        }, blockedSelectors);
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!html) await injectPdfStyles(page);

      return page.screenshot({
        type: format,
        fullPage,
        ...(format !== 'png' ? { quality } : {}),
      });
    }, { viewport: { width, height } });

    if (req.user?._id) {
      const filePath = path.join(UPLOADS_DIR, `${req.user._id}-${Date.now()}.${format}`);
      fs.writeFileSync(filePath, imageBuffer);
      await saveHistory(req.user._id, 'url-to-image', filename, filePath, url);
    }

    res.setHeader('Content-Type', MIME[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('[urlToImage] error:', error.message);
    res.status(500).json({ message: 'Screenshot failed' });
  }
};
