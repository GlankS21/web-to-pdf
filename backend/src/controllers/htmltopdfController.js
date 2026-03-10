import fs from 'fs';
import path from 'path';

import { withBrowser } from '../libs/puppeteerUtils.js';
import { buildHeaderTemplate, buildFooterTemplate } from '../libs/pdfTemplates.js';
import { saveHistory, UPLOADS_DIR } from '../libs/fileUtils.js';
import { MOBILE_UA, MOBILE_VP, PAPER_W, PAPER_H, injectPdfStyles, removeBlankPages } from '../libs/pdfUtils.js';

export const htmlToPdf = async (req, res) => {
  const { html, options = {}, headerFooter } = req.body;
  if (!html?.trim()) return res.status(400).json({ message: 'html is required' });

  try {
    const currentDate = new Date().toLocaleDateString();
    const filename = options.filename || `html-export-${Date.now()}.pdf`;

    const format      = options.format || 'A4';
    const landscape   = options.landscape || false;
    const marginLeft  = parseInt(options.marginLeft  || '40') || 40;
    const marginRight = parseInt(options.marginRight || '40') || 40;
    const mobile      = options.mobile === true;

    const paperW   = landscape ? (PAPER_H[format] ?? 1123) : (PAPER_W[format] ?? 794);
    const contentW = Math.max(paperW - marginLeft - marginRight, 200);
    const vpWidth  = mobile ? MOBILE_VP : contentW;
    const pdfScale = mobile ? Math.min(contentW / MOBILE_VP, 2) : (options.scale || 1);

    console.log(`[htmlToPdf] format=${format} mobile=${mobile} vpWidth=${vpWidth} scale=${pdfScale}`);

    const pdfBuffer = await withBrowser(async (_browser, page) => {
      await page.emulateMediaType('screen');
      if (mobile) await page.setUserAgent(MOBILE_UA);
      await page.setViewport({ width: vpWidth, height: 900, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'networkidle2', timeout: 60_000 });

      await injectPdfStyles(page);

      const raw = await page.pdf({
        format,
        landscape,
        scale: pdfScale,
        printBackground: options.printBackground ?? true,
        margin: {
          top: options.marginTop || '80px',
          right: marginRight + 'px',
          bottom: options.marginBottom || '80px',
          left: marginLeft + 'px',
        },
        displayHeaderFooter: options.displayHeaderFooter ?? true,
        headerTemplate: buildHeaderTemplate(headerFooter),
        footerTemplate: buildFooterTemplate(headerFooter ?? {}, currentDate),
      });
      return removeBlankPages(raw);
    });

    if (req.user?._id) {
      const filePath = path.join(UPLOADS_DIR, `${req.user._id}-${Date.now()}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);
      await saveHistory(req.user._id, 'html-to-pdf', filename, filePath);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[htmlToPdf] error:', error.message);
    res.status(500).json({ message: 'PDF generation failed' });
  }
};
