import puppeteer from "puppeteer";
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// Convert URL to PDF
export const urlToPdf = async(req, res) => {
    try{
        const {url, filename, options = {} } = req.body;
        
        // check url
        if(!url){
            return res.status(400).json({ error: 'URL is requied'});
        }

        // lauch browser with steath mode
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features-AutomationControlled',
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });

        // Viewport
        if(options.viewport){
            await page.setViewport({
                width: options.viewport.width || 1920,
                height: options.viewport.height || 1080,
                deviceScaleFactor: options.viewport.deviceScaleFactor || 1,
                isMobile: options.viewport.isMobile || false,
                hasTouch: options.viewport.hasTouch || false,
                isLandscape: options.viewport.isLandscape || false,
            });
        }

        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        // cloudflare
        await new Promise(resolve => setTimeout(resolve, 5000));

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

        if (options.width){
            pdfOptions.width = options.width;
        } 

        if (options.height){
            pdfOptions.height = options.height;
        } 

        const pdfBuffer = await page.pdf(pdfOptions);

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
        'Content-Disposition',
        `attachment; filename=${filename || 'document.pdf'}`
        );
        res.send(pdfBuffer);
    }
    catch(error){
        console.error('Error converting URL to PDF:', error);
        res.status(500).json({
            error: 'Failed to convert URL to PDF',
            message: error.message
        });
    }
}

