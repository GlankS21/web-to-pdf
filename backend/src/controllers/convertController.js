import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// CSS templates
const pdfStyles = {
  modern: `
    body {
      max-width: 800px !important;
      margin: 0 auto !important;
      padding: 40px 20px !important;
      line-height: 1.8 !important;
      color: #333 !important;
      background: white !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #2c3e50 !important;
      margin-top: 1.5em !important;
      margin-bottom: 0.5em !important;
      font-weight: 600 !important;
    }
    h1 {
      font-size: 2.5em !important;
      border-bottom: 3px solid #3498db !important;
      padding-bottom: 10px !important;
    }
    h2 {
      font-size: 2em !important;
      border-bottom: 2px solid #e0e0e0 !important;
      padding-bottom: 8px !important;
    }
    p {
      margin: 1em 0 !important;
      text-align: justify !important;
    }
    a {
      color: #3498db !important;
      text-decoration: none !important;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 20px auto !important;
      border-radius: 8px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
    }
    blockquote {
      border-left: 4px solid #3498db !important;
      padding-left: 20px !important;
      margin: 20px 0 !important;
      font-style: italic !important;
      color: #555 !important;
      background: #f8f9fa !important;
      padding: 15px 20px !important;
      border-radius: 4px !important;
    }
    code {
      background: #f4f4f4 !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      font-family: 'Courier New', monospace !important;
      font-size: 0.9em !important;
    }
    pre {
      background: #f4f4f4 !important;
      padding: 15px !important;
      border-radius: 5px !important;
      overflow-x: auto !important;
      border-left: 3px solid #3498db !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 20px 0 !important;
    }
    th, td {
      padding: 12px !important;
      text-align: left !important;
      border-bottom: 1px solid #ddd !important;
    }
    th {
      background: #3498db !important;
      color: white !important;
      font-weight: 600 !important;
    }
    tr:hover {
      background: #f5f5f5 !important;
    }
    ul, ol {
      padding-left: 30px !important;
      margin: 15px 0 !important;
    }
    li {
      margin: 8px 0 !important;
    }
    /* Remove unwanted elements */
    nav, header, footer, .advertisement, .ads, .sidebar, .cookie-banner, .popup {
      display: none !important;
    }
  `,
  
  minimal: `
    * {
      font-family: 'Georgia', serif !important;
    }
    body {
      max-width: 700px !important;
      margin: 0 auto !important;
      padding: 60px 20px !important;
      line-height: 1.9 !important;
      color: #1a1a1a !important;
      background: white !important;
      font-size: 16px !important;
    }
    h1, h2, h3 {
      font-family: 'Helvetica', sans-serif !important;
      color: #000 !important;
      font-weight: 700 !important;
    }
    h1 {
      font-size: 3em !important;
      margin-bottom: 0.3em !important;
      letter-spacing: -1px !important;
    }
    h2 {
      font-size: 1.8em !important;
      margin-top: 2em !important;
      margin-bottom: 0.5em !important;
    }
    p {
      margin: 1.2em 0 !important;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 30px auto !important;
    }
    nav, header, footer, aside, .advertisement, .ads, .social-share {
      display: none !important;
    }
  `,

  professional: `
    * {
      font-family: 'Arial', sans-serif !important;
    }
    body {
      max-width: 850px !important;
      margin: 0 auto !important;
      padding: 50px 30px !important;
      line-height: 1.6 !important;
      color: #2c3e50 !important;
      background: white !important;
    }
    h1 {
      color: #1a5490 !important;
      font-size: 2.8em !important;
      margin-bottom: 10px !important;
      border-bottom: 4px solid #1a5490 !important;
      padding-bottom: 15px !important;
    }
    h2 {
      color: #2980b9 !important;
      font-size: 2em !important;
      margin-top: 30px !important;
      margin-bottom: 15px !important;
      border-left: 5px solid #2980b9 !important;
      padding-left: 15px !important;
    }
    h3 {
      color: #34495e !important;
      font-size: 1.5em !important;
    }
    p {
      margin: 1em 0 !important;
      text-align: justify !important;
    }
    ul, ol {
      margin: 15px 0 !important;
      padding-left: 40px !important;
    }
    li {
      margin: 10px 0 !important;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 25px auto !important;
      border: 1px solid #ddd !important;
      padding: 5px !important;
      background: white !important;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 20px 0 !important;
      font-size: 0.95em !important;
    }
    th {
      background: #1a5490 !important;
      color: white !important;
      padding: 12px !important;
      text-align: left !important;
    }
    td {
      padding: 10px 12px !important;
      border-bottom: 1px solid #ddd !important;
    }
    tr:nth-child(even) {
      background: #f9f9f9 !important;
    }
    blockquote {
      border-left: 5px solid #3498db !important;
      margin: 20px 0 !important;
      padding: 15px 20px !important;
      background: #ecf0f1 !important;
      font-style: italic !important;
    }
    nav, header, footer, .advertisement, .sidebar, .comments {
      display: none !important;
    }
  `,

  magazine: `
    * {
      font-family: 'Playfair Display', 'Georgia', serif !important;
    }
    body {
      max-width: 900px !important;
      margin: 0 auto !important;
      padding: 60px 40px !important;
      line-height: 1.8 !important;
      color: #2c2c2c !important;
      background: white !important;
    }
    h1 {
      font-size: 3.5em !important;
      text-align: center !important;
      margin-bottom: 20px !important;
      font-weight: 700 !important;
      letter-spacing: -2px !important;
      color: #1a1a1a !important;
    }
    h2 {
      font-size: 2.2em !important;
      margin-top: 50px !important;
      margin-bottom: 20px !important;
      text-align: center !important;
      color: #333 !important;
      font-weight: 600 !important;
    }
    h3 {
      font-size: 1.6em !important;
      margin-top: 30px !important;
      color: #444 !important;
    }
    p {
      font-family: 'Lora', 'Georgia', serif !important;
      font-size: 1.1em !important;
      margin: 1.5em 0 !important;
      text-align: justify !important;
    }
    p:first-of-type::first-letter {
      font-size: 3.5em !important;
      float: left !important;
      line-height: 0.9 !important;
      margin: 0.1em 0.1em 0 0 !important;
      font-weight: bold !important;
      color: #c0392b !important;
    }
    img {
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
      margin: 40px auto !important;
    }
    figcaption {
      text-align: center !important;
      font-style: italic !important;
      color: #666 !important;
      margin-top: 10px !important;
      font-size: 0.9em !important;
    }
    blockquote {
      font-size: 1.3em !important;
      font-style: italic !important;
      text-align: center !important;
      margin: 40px 0 !important;
      padding: 20px !important;
      border-top: 2px solid #c0392b !important;
      border-bottom: 2px solid #c0392b !important;
      color: #555 !important;
    }
    nav, header, footer, .advertisement, .social-media {
      display: none !important;
    }
  `
};

// src/controllers/convertController.js
export const urlToPdf = async (req, res) => {
  let browser;
  try {
    const { url, filename, options = {} } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`📄 Converting URL to PDF: ${url}`);

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const viewport = options.viewport || {};
    await page.setViewport({
      width: viewport.width || 1920,
      height: viewport.height || 1080,
      deviceScaleFactor: viewport.deviceScaleFactor || 1,
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 90000
    });

    console.log('✅ Page loaded successfully');

    // Chờ page stable trước khi inject CSS
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ✨ REDESIGN: Inject custom CSS - WRAPPED IN TRY-CATCH
    const styleTemplate = options.styleTemplate || 'modern';
    if (pdfStyles[styleTemplate]) {
      try {
        await page.evaluate((cssContent) => {
          const style = document.createElement('style');
          style.textContent = cssContent;
          document.head.appendChild(style);
        }, pdfStyles[styleTemplate]);
        console.log(`✅ Applied ${styleTemplate} style template`);
      } catch (styleError) {
        console.warn('⚠️ Could not apply style template:', styleError.message);
      }
    }

    // ✨ REDESIGN: Custom CSS từ user
    if (options.customCSS) {
      try {
        await page.evaluate((cssContent) => {
          const style = document.createElement('style');
          style.textContent = cssContent;
          document.head.appendChild(style);
        }, options.customCSS);
        console.log('✅ Applied custom CSS');
      } catch (cssError) {
        console.warn('⚠️ Could not apply custom CSS:', cssError.message);
      }
    }

    // ✨ REDESIGN: Remove unwanted elements
    if (options.removeElements) {
      try {
        await page.evaluate((selectors) => {
          selectors.forEach(selector => {
            try {
              document.querySelectorAll(selector).forEach(el => el.remove());
            } catch (e) {}
          });
        }, options.removeElements);
        console.log('✅ Removed unwanted elements');
      } catch (removeError) {
        console.warn('⚠️ Could not remove elements:', removeError.message);
      }
    }

    // ✨ REDESIGN: Clean up ads, popups automatically
    if (options.cleanMode !== false) {
      try {
        await page.evaluate(() => {
          const unwantedSelectors = [
            '[class*="ad-"]', '[id*="ad-"]', '[class*="ads"]',
            '.advertisement', '.banner', '.popup', '.modal',
            '[class*="cookie"]', '[class*="newsletter"]',
            '.sidebar', 'aside', '.social-share'
          ];
          
          unwantedSelectors.forEach(selector => {
            try {
              document.querySelectorAll(selector).forEach(el => el.remove());
            } catch (e) {}
          });
        });
        console.log('✅ Cleaned ads and popups');
      } catch (cleanError) {
        console.warn('⚠️ Could not clean ads:', cleanError.message);
      }
    }

    // ✨ REDESIGN: Extract main content only
    if (options.mainContentOnly) {
      try {
        await page.evaluate(() => {
          const mainSelectors = [
            'main', 'article', '[role="main"]',
            '.main-content', '.article-content', '.post-content',
            '#content', '#main'
          ];
          
          let mainContent = null;
          for (const selector of mainSelectors) {
            mainContent = document.querySelector(selector);
            if (mainContent) break;
          }
          
          if (mainContent) {
            document.body.innerHTML = mainContent.innerHTML;
          }
        });
        console.log('✅ Extracted main content only');
      } catch (extractError) {
        console.warn('⚠️ Could not extract main content:', extractError.message);
      }
    }

    // Chờ render xong
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pdfOptions = {
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      landscape: options.landscape || false,
      margin: {
        top: options.marginTop || '20px',
        right: options.marginRight || '20px',
        bottom: options.marginBottom || '20px',
        left: options.marginLeft || '20px'
      },
      displayHeaderFooter: options.displayHeaderFooter || false,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || ''
    };

    if (options.pageRanges) pdfOptions.pageRanges = options.pageRanges;
    if (options.scale) pdfOptions.scale = options.scale;
    if (options.width) pdfOptions.width = options.width;
    if (options.height) pdfOptions.height = options.height;

    const pdfBuffer = await page.pdf(pdfOptions);
    await browser.close();

    console.log('✅ PDF created successfully');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename || 'document.pdf'}`
    );
    res.send(pdfBuffer);

  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Error converting URL to PDF:', error);
    res.status(500).json({
      error: 'Failed to convert URL to PDF',
      message: error.message
    });
  }
};

// Controller: Convert HTML to PDF
export const htmlToPdf = async (req, res) => {
  try {
    const { html, filename, options = {} } = req.body;

    // Validate HTML
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
  
    if (options.viewport) {
      await page.setViewport({
        width: options.viewport.width || 1920,
        height: options.viewport.height || 1080,
        deviceScaleFactor: options.viewport.deviceScaleFactor || 1,
        isMobile: options.viewport.isMobile || false,
        hasTouch: options.viewport.hasTouch || false,
        isLandscape: options.viewport.isLandscape || false
      });
      console.log('Viewport set:', options.viewport);
    }

    // Set HTML content
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // PDF options
    const pdfOptions = {
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      landscape: options.landscape || false,
      margin: {
        top: options.marginTop || '20px',
        right: options.marginRight || '20px',
        bottom: options.marginBottom || '20px',
        left: options.marginLeft || '20px'
      }
    };

    if (options.pageRanges) {
      pdfOptions.pageRanges = options.pageRanges;
    }

    if (options.scale) {
      pdfOptions.scale = options.scale;
    }

    // Generate PDF
    const pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();

    console.log('PDF created successfully');

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename || 'document.pdf'}`
    );
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error converting HTML to PDF:', error);
    res.status(500).json({
      error: 'Failed to convert HTML to PDF',
      message: error.message
    });
  }
};

// Controller: Convert URL to Image
export const urlToImage = async (req, res) => {
  try {
    const { url, filename, fullPage = true, type = 'png', viewport } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`📸 Taking screenshot: ${url}`);

    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport (nếu có)
    if (viewport) {
      await page.setViewport({
        width: viewport.width || 1920,
        height: viewport.height || 1080,
        deviceScaleFactor: viewport.deviceScaleFactor || 1,
        isMobile: viewport.isMobile || false,
        hasTouch: viewport.hasTouch || false,
        isLandscape: viewport.isLandscape || false
      });
      console.log('✅ Viewport set:', viewport);
    }

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('✅ Page loaded successfully');

    // Take screenshot
    const screenshot = await page.screenshot({
      fullPage: fullPage,
      type: type
    });

    await browser.close();

    console.log('✅ Screenshot created successfully');

    // Send image
    const contentType = type === 'jpeg' ? 'image/jpeg' : 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename || `screenshot.${type}`}`
    );
    res.send(screenshot);

  } catch (error) {
    console.error('❌ Error taking screenshot:', error);
    res.status(500).json({
      error: 'Failed to take screenshot',
      message: error.message
    });
  }
};