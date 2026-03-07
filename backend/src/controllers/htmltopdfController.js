import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ConversionHistory from '../models/ConversionHistory.js';
import { withBrowser } from './websiteController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../uploads/conversions');

// Đảm bảo thư mục tồn tại
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const buildHeaderTemplate = ({ headerText, logoBase64, logoMime } = {}) => {
  const logo = logoBase64
    ? `<img src="data:${logoMime};base64,${logoBase64}" style="height:28px;object-fit:contain;margin-right:8px;" />`
    : '';
  const text = headerText
    ? `<span style="font-size:9px;color:#444;">${headerText}</span>`
    : '';
  if (!logo && !text) return '<span></span>';
  return `<div style="width:100%;display:flex;align-items:center;padding:4px 40px;border-bottom:1px solid #ddd;">${logo}${text}</div>`;
};

const buildFooterTemplate = ({ footerText } = {}, currentDate) => {
  const left = footerText
    ? `<span style="font-size:9px;color:#666;">${footerText}</span>`
    : `<span style="font-size:9px;color:#666;">${currentDate}</span>`;
  return `<div style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:4px 40px;">${left}<span style="font-size:9px;color:#666;">Page <span class="pageNumber"></span></span></div>`;
};

// POST /api/convert/html-to-pdf
export const htmlToPdf = async (req, res) => {
  const { html, options = {}, headerFooter } = req.body;

  if (!html?.trim()) {
    return res.status(400).json({ message: 'html is required' });
  }

  try {
    const currentDate = new Date().toLocaleDateString();
    const filename = options.filename || `html-export-${Date.now()}.pdf`;

    const pdfBuffer = await withBrowser(async (browser, page) => {
      // Load HTML trực tiếp vào page
      await page.setContent(html, { waitUntil: 'networkidle0' });

      return page.pdf({
        format: options.format || 'A4',
        landscape: options.landscape || false,
        scale: options.scale || 1,
        printBackground: options.printBackground ?? true,
        margin: {
          top: options.marginTop || '80px',
          right: options.marginRight || '40px',
          bottom: options.marginBottom || '80px',
          left: options.marginLeft || '40px',
        },
        displayHeaderFooter: options.displayHeaderFooter ?? true,
        headerTemplate: buildHeaderTemplate(headerFooter),
        footerTemplate: buildFooterTemplate(headerFooter ?? {}, currentDate),
      });
    });

    // Lưu file nếu user đã đăng nhập
    if (req.user?._id) {
      const filePath = path.join(UPLOADS_DIR, `${req.user?._id}-${Date.now()}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);
      await ConversionHistory.create({
        userId: req.user?._id,
        type: 'html-to-pdf',
        filename,
        filePath,
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error htmlToPdf', error);
    res.status(500).json({ message: 'PDF generation failed' });
  }
};