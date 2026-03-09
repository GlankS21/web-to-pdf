import fs from 'fs';
import path from 'path';
import { withBrowser, loadPage } from '../libs/puppeteerUtils.js';
import { saveHistory, UPLOADS_DIR } from '../libs/fileUtils.js';
import { MOBILE_UA, MOBILE_VP } from '../libs/pdfUtils.js';

const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

export const urlToImage = async (req, res) => {
  const { url, options = {}, blockedSelectors = [] } = req.body;
  if (!url) return res.status(400).json({ message: 'url is required' });

  const format   = options.format   || 'png';
  const width    = options.mobile ? MOBILE_VP : (options.width  || 1600);
  const height   = options.mobile ? 844        : (options.height || 900);
  const fullPage = options.fullPage ?? true;
  const quality  = options.quality  || 90;

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
    const filename = options.filename || `${hostname}-${Date.now()}.${format}`;

    const imageBuffer = await withBrowser(
      async (_browser, page) => {
        if (options.mobile) await page.setUserAgent(MOBILE_UA);
        await loadPage(page, url);

        if (blockedSelectors.length > 0) {
          await page.evaluate((selectors) => {
            selectors.forEach((sel) => {
              document.querySelectorAll(sel).forEach((el) =>
                el.style.setProperty('display', 'none', 'important'));
            });
          }, blockedSelectors);
          await new Promise((r) => setTimeout(r, 300));
        }

        return page.screenshot({
          type: format,
          fullPage,
          ...(format !== 'png' ? { quality } : {}),
        });
      },
      { viewport: { width, height } }
    );

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