// controllers/convertController.js
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
};

const createFilename = (url) => { return new URL(url).hostname.replace(/^www\./, '').split('.')[0] + '.pdf';};

export const urlToPdf = async (req, res) => {
  let browser;
  try {
    const { url, options = {} } = req.body;
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required' 
      });
    }

    // Create file name from url string
    const filename = createFilename(url);
    console.log('Converting:', url);

    // Run browser
    browser = await puppeteer.launch({
      headless: true, // run browser in the background
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security', 
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();

    // FAKE USER AGENT - Quan trọng!
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({
      width: options.viewportWidth || 1600,
      height: options.viewportHeight || 1200
    });

    // HEADERS - Giả như browser thật
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    // Emulate screen media
    if (options.emulateScreenMedia !== false) {
      await page.emulateMediaType('screen');
    }

    // Anti-bot detection - TĂNG CƯỜNG
    await page.evaluateOnNewDocument(() => {
      // Xóa webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Fake chrome object
      window.navigator.chrome = { 
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
      
      // Fake plugins
      Object.defineProperty(navigator, 'plugins', { 
        get: () => [
          { name: 'Chrome PDF Plugin' },
          { name: 'Chrome PDF Viewer' },
          { name: 'Native Client' }
        ] 
      });
      
      // Fake languages
      Object.defineProperty(navigator, 'languages', { 
        get: () => ['en-US', 'en'] 
      });
      
      // Fake permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // Override toString
      window.navigator.chrome.runtime.sendMessage = () => {};
    });

    console.log('📡 Loading page...');
    
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (gotoError) {
      console.warn('Retrying');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await new Promise(r => setTimeout(r, 5000));
    }

    console.log('Page loaded');

    // Auto accept cookies
    await acceptCookies(page);

    // Inject CSS
    const customCSS = buildCSS(options);
    if (customCSS) {
      await page.addStyleTag({ content: customCSS });
      await new Promise(r => setTimeout(r, 1000));
      console.log('CSS injected');
    }

    const pageTitle = await page.title();
    const currentDate = new Date().toLocaleDateString();

    // Create pdf file
    console.log('Generating PDF.');
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground !== false,
      landscape: options.landscape || false,
      scale: options.scale || 1.0,
      margin: {
        top: options.marginTop || '80px',
        right: options.marginRight || '40px',
        bottom: options.marginBottom || '80px',
        left: options.marginLeft || '40px'
      },
      displayHeaderFooter: options.displayHeaderFooter !== false,
      headerTemplate: `<div style="width: 100%; font-size: 9px; padding: 5px 40px; color: #666;">${pageTitle}</div>`,
      footerTemplate: `<div style="width: 100%; font-size: 9px; padding: 5px 40px; color: #666; text-align: center;">Page <span class="pageNumber"></span> - ${currentDate}</div>`
    });

    await browser.close();
    console.log('PDF generated successfully');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);

  } catch (error) {
    if (browser) await browser.close();
    console.error('Error:', error.message);
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
  }
};

const acceptCookies = async (page) => {
  const cookieSelectors = [
    'button:has-text("Accept")', 
    'button:has-text("Accept all")',
    'button:has-text("Принять")', 
    'button:has-text("Согласен")',
    'button:has-text("Хорошо")',
    '[id*="accept"][id*="cookie"]', '[class*="accept"][class*="cookie"]'
  ];

  for(const selector of cookieSelectors){
    try{
      const button = await page.$(selector);
      if(button){
        await button.click();
        console.log('Cookie accepted');
        await new Promise(r => setTimeout(r, 1000));
        break;
      } 
    } catch(error){}
  } 
};

const buildCSS = (options) => {
  let css = '';
  const cssFiles = [
    { condition: options.removeHeader, file: 'remove-header.css' },
    { condition: options.removeFooter, file: 'remove-footer.css' },
    { condition: options.removeNavigation, file: 'remove-navigation.css' },
    { condition: options.removeAds, file: 'remove-ads.css' },
    { condition: options.removeSidebar, file: 'remove-sidebar.css' },
    { condition: options.removeRecommendations, file: 'remove-recommendations.css' }
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