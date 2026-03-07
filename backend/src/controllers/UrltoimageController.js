import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ConversionHistory from '../models/ConversionHistory.js';
import { withBrowser } from './websiteController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../uploads/conversions');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

// POST /api/convert/url-to-image
export const urlToImage = async (req, res) => {
  const { url, options = {} } = req.body;

  if (!url) return res.status(400).json({ message: 'url is required' });

  const format = options.format || 'png';
  const width = options.width || 1600;
  const height = options.height || 900;
  const fullPage = options.fullPage ?? true;
  const quality = options.quality || 90;

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').split('.')[0];
    const filename = options.filename || `${hostname}-${Date.now()}.${format}`;

    const imageBuffer = await withBrowser(
      async (browser, page) => {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

        const screenshotOptions = {
          type: format,
          fullPage,
          ...(format !== 'png' ? { quality } : {}),
        };

        return page.screenshot(screenshotOptions);
      },
      { viewport: { width, height } }
    );

    // Lưu file nếu user đã đăng nhập
    if (req.user?._id) {
      const filePath = path.join(UPLOADS_DIR, `${req.user?._id}-${Date.now()}.${format}`);
      fs.writeFileSync(filePath, imageBuffer);
      await ConversionHistory.create({
        userId: req.user?._id,
        type: 'url-to-image',
        filename,
        sourceUrl: url,
        filePath,
      });
    }

    res.setHeader('Content-Type', MIME[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('Error urlToImage', error);
    res.status(500).json({ message: 'Screenshot failed' });
  }
};