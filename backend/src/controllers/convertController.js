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

const previewCache = new Map();

export const previewWebsite = async (req, res) => {
  let browser;
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('🌐 Creating interactive preview:', url);

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(120000);

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1600, height: 1200 });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 2000));

    console.log('✅ Website loaded');

    // Inline CSS
    await page.evaluate(() => {
      const styles = [];
      
      document.querySelectorAll('style').forEach(style => {
        styles.push(style.textContent);
      });
      
      for (const sheet of document.styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          const css = rules.map(rule => rule.cssText).join('\n');
          if (css) styles.push(css);
        } catch (e) {}
      }
      
      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());
      
      const combinedStyle = document.createElement('style');
      combinedStyle.textContent = styles.join('\n');
      document.head.insertBefore(combinedStyle, document.head.firstChild);
    });

    // ADD BASE TAG - CRITICAL!
    await page.evaluate((baseUrl) => {
      // Remove existing base tags
      document.querySelectorAll('base').forEach(b => b.remove());
      
      // Add new base tag
      const base = document.createElement('base');
      base.href = baseUrl;
      document.head.insertBefore(base, document.head.firstChild);
      
      console.log('Base tag added:', baseUrl);
    }, url);

    // Fix absolute URLs for images
    await page.evaluate((baseUrl) => {
      document.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.startsWith('data:')) {
          img.src = new URL(img.src, baseUrl).href;
        }
      });
      
      document.querySelectorAll('[style*="background"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const fixed = style.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, url) => {
          if (url.startsWith('data:')) return match;
          return `url('${new URL(url, baseUrl).href}')`;
        });
        el.setAttribute('style', fixed);
      });
      
      // REMOVE ALL SCRIPTS - Tránh errors
      document.querySelectorAll('script').forEach(script => {
        script.remove();
        console.log('Removed script:', script.src || 'inline');
      });
      
      // Disable links
      document.querySelectorAll('a').forEach(a => {
        a.href = 'javascript:void(0)';
      });
    }, url);

    // INJECT BLOCKER CSS
    await page.evaluate(() => {
      const blockerStyle = document.createElement('style');
      blockerStyle.id = 'BLOCKER_STYLES_INJECTED';
      blockerStyle.textContent = `
        .iframe-hover-highlight {
          outline: 5px solid #ff0000 !important;
          outline-offset: 2px !important;
          cursor: pointer !important;
          background: rgba(255, 0, 0, 0.2) !important;
          z-index: 999999 !important;
        }
        .iframe-blocked {
          display: none !important;
        }
      `;
      document.head.appendChild(blockerStyle);
      console.log('Blocker styles injected');
    });

    const html = await page.content();
    await browser.close();

    const previewId = Math.random().toString(36).substring(7);
    previewCache.set(previewId, html);
    setTimeout(() => previewCache.delete(previewId), 10 * 60 * 1000);

    console.log('✅ Preview cached:', previewId);

    res.json({ previewId });

  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Preview error:', error.message);
    res.status(500).json({ error: 'Preview failed', message: error.message });
  }
};
export const getPreview = (req, res) => {
  const { id } = req.params;
  const html = previewCache.get(id);
  
  if (!html) {
    return res.status(404).send('Preview not found or expired');
  }
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173'); // ← QUAN TRỌNG
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.send(html);
};
// CONTROLLER 2: Convert URL to PDF
export const urlToPdf = async (req, res) => {
  let browser;
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const filename = options.filename || createFilename(url);
    console.log('Converting:', url);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ],
      protocolTimeout: 120000
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({
      width: 1600,
      height: 1200
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.navigator.chrome = { runtime: {}, app: {} };
      Object.defineProperty(navigator, 'plugins', { 
        get: () => [{ name: 'Chrome PDF Plugin' }] 
      });
    });

    console.log('📡 Loading page...');
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('✅ Page loaded');

    // Accept cookies
    if (options.acceptCookies !== false) {
      await acceptCookies(page);
    }

    // Keep content only (with custom selector)
    if (options.keepContentOnly) {
      console.log('📝 Isolating main content block...');
      
      try {
        const customSelector = options.contentSelector;
        
        await page.evaluate((selector) => {
          let contentBlock = null;
          
          if (selector) {
            // User provided selector
            contentBlock = document.querySelector(selector);
            console.log('Using custom selector:', selector);
          } else {
            // Fallback: auto-detect
            const mainSelectors = [
              'main',
              'article',
              '[role="main"]',
              '#main',
              '#content',
              '.content',
              '.main-content',
              '.post-content',
              '.article-content',
              '.entry-content'
            ];
            
            for (const sel of mainSelectors) {
              const el = document.querySelector(sel);
              if (el) {
                contentBlock = el;
                console.log('Auto-detected:', sel);
                break;
              }
            }
          }
          
          if (contentBlock) {
            // Create Set of elements to keep
            const keepElements = new Set();
            
            // Keep content block + all children
            keepElements.add(contentBlock);
            contentBlock.querySelectorAll('*').forEach(el => keepElements.add(el));
            
            // Keep parent chain
            let current = contentBlock.parentElement;
            while (current) {
              keepElements.add(current);
              current = current.parentElement;
            }
            
            // Hide everything else
            document.querySelectorAll('*').forEach(el => {
              if (!keepElements.has(el)) {
                el.style.setProperty('display', 'none', 'important');
              }
            });
            
            // Clean body styling
            document.body.style.margin = '0';
            document.body.style.padding = '20px';
            
            console.log('Content isolated successfully');
          } else {
            console.warn('Content block not found');
          }
          
        }, customSelector);
        
        await new Promise(r => setTimeout(r, 500));
        console.log('✅ Main content isolated');
        
      } catch (error) {
        console.error('❌ Error isolating content:', error.message);
        console.log('ℹ️ Continuing with full page');
      }
    }

    // Inject custom CSS (if not using keepContentOnly)
    if (!options.keepContentOnly) {
      const customCSS = buildCSS(options);
      if (customCSS) {
        await page.addStyleTag({ content: customCSS });
        await new Promise(r => setTimeout(r, 1000));
        console.log('💉 CSS injected');
      }
    }

    const pageTitle = await page.title();
    const currentDate = new Date().toLocaleDateString();

    console.log('📄 Generating PDF...');

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
    console.log('✅ PDF generated successfully');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);

  } catch (error) {
    if (browser) await browser.close();
    console.error('❌ Error:', error.message);
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message
    });
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
    { condition: options.removeFooter, file: 'remove-footer.css' }
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