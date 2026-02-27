import express from 'express';
import { urlToPdf, htmlToPdf, urlToImage } from '../controllers/convertController.js';

const router = express.Router();

/**
 * @swagger
 * /api/convert/url-to-pdf:
 *   post:
 *     summary: Convert URL sang PDF với redesign options
 *     tags: [Convert]
 *     description: Convert một website URL thành file PDF với nhiều tùy chọn styling
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL của website cần convert
 *                 example: https://example.com
 *               filename:
 *                 type: string
 *                 description: Tên file PDF
 *                 example: document.pdf
 *               options:
 *                 type: object
 *                 properties:
 *                   styleTemplate:
 *                     type: string
 *                     enum: [modern, minimal, professional, magazine]
 *                     default: modern
 *                     description: Pre-designed style templates
 *                   customCSS:
 *                     type: string
 *                     description: Custom CSS để override styling
 *                     example: "body { font-size: 18px; }"
 *                   cleanMode:
 *                     type: boolean
 *                     default: true
 *                     description: Tự động remove ads, popups, cookies
 *                   mainContentOnly:
 *                     type: boolean
 *                     default: false
 *                     description: Chỉ lấy main content, bỏ sidebar/header/footer
 *                   removeElements:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: CSS selectors của elements cần remove
 *                     example: [".sidebar", "#comments", "nav"]
 *                   format:
 *                     type: string
 *                     enum: [A4, A3, A5, Letter, Legal, Tabloid]
 *                     default: A4
 *                     description: Khổ giấy
 *                   landscape:
 *                     type: boolean
 *                     default: false
 *                     description: Chiều ngang
 *                   printBackground:
 *                     type: boolean
 *                     default: true
 *                     description: In background colors/images
 *                   scale:
 *                     type: number
 *                     minimum: 0.1
 *                     maximum: 2
 *                     default: 1
 *                     description: Tỷ lệ scale (0.1 - 2)
 *                   pageRanges:
 *                     type: string
 *                     description: Page ranges để in (ví dụ "1-3, 5, 8-10")
 *                     example: "1-3, 5"
 *                   marginTop:
 *                     type: string
 *                     default: "20px"
 *                     example: "20px"
 *                   marginRight:
 *                     type: string
 *                     default: "20px"
 *                     example: "20px"
 *                   marginBottom:
 *                     type: string
 *                     default: "20px"
 *                     example: "20px"
 *                   marginLeft:
 *                     type: string
 *                     default: "20px"
 *                     example: "20px"
 *                   viewport:
 *                     type: object
 *                     properties:
 *                       width:
 *                         type: number
 *                         default: 1920
 *                       height:
 *                         type: number
 *                         default: 1080
 *                       deviceScaleFactor:
 *                         type: number
 *                         default: 1
 *                       isMobile:
 *                         type: boolean
 *                         default: false
 *                   displayHeaderFooter:
 *                     type: boolean
 *                     default: false
 *                     description: Hiển thị header/footer
 *                   headerTemplate:
 *                     type: string
 *                     description: HTML template cho header
 *                     example: "<div style='font-size:10px; text-align:center; width:100%;'>My Header</div>"
 *                   footerTemplate:
 *                     type: string
 *                     description: HTML template cho footer (có thể dùng pageNumber)
 *                     example: "<div style='font-size:10px; text-align:center; width:100%;'>Page <span class='pageNumber'></span> of <span class='totalPages'></span></div>"
 *     responses:
 *       200:
 *         description: PDF file được tạo thành công
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: URL không hợp lệ hoặc website bị bảo vệ bởi Cloudflare
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: URL is required
 *                 message:
 *                   type: string
 *                   example: This website cannot be converted due to bot protection
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to convert URL to PDF
 *                 message:
 *                   type: string
 *                   example: Navigation timeout exceeded
 */
router.post('/url-to-pdf', urlToPdf);

/**
 * @swagger
 * /api/convert/html-to-pdf:
 *   post:
 *     summary: Convert HTML sang PDF
 *     tags: [Convert]
 *     description: Convert HTML content thành file PDF
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - html
 *             properties:
 *               html:
 *                 type: string
 *                 description: HTML content cần convert
 *                 example: "<html><body><h1>Hello World</h1><p>This is a test document.</p></body></html>"
 *               filename:
 *                 type: string
 *                 description: Tên file PDF
 *                 example: document.pdf
 *               options:
 *                 type: object
 *                 properties:
 *                   format:
 *                     type: string
 *                     enum: [A4, A3, A5, Letter, Legal]
 *                     default: A4
 *                   landscape:
 *                     type: boolean
 *                     default: false
 *                   printBackground:
 *                     type: boolean
 *                     default: true
 *                   scale:
 *                     type: number
 *                     minimum: 0.1
 *                     maximum: 2
 *                     default: 1
 *                   pageRanges:
 *                     type: string
 *                     example: "1-5, 8, 11-13"
 *                   marginTop:
 *                     type: string
 *                     default: "20px"
 *                   marginRight:
 *                     type: string
 *                     default: "20px"
 *                   marginBottom:
 *                     type: string
 *                     default: "20px"
 *                   marginLeft:
 *                     type: string
 *                     default: "20px"
 *                   viewport:
 *                     type: object
 *                     properties:
 *                       width:
 *                         type: number
 *                         default: 1920
 *                       height:
 *                         type: number
 *                         default: 1080
 *     responses:
 *       200:
 *         description: PDF file được tạo thành công
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: HTML content không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.post('/html-to-pdf', htmlToPdf);

/**
 * @swagger
 * /api/convert/url-to-image:
 *   post:
 *     summary: Convert URL sang Image (Screenshot)
 *     tags: [Convert]
 *     description: Chụp screenshot của website
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL của website
 *                 example: https://example.com
 *               filename:
 *                 type: string
 *                 description: Tên file ảnh
 *                 example: screenshot.png
 *               fullPage:
 *                 type: boolean
 *                 default: true
 *                 description: Chụp toàn bộ trang
 *               type:
 *                 type: string
 *                 enum: [png, jpeg]
 *                 default: png
 *                 description: Định dạng ảnh
 *               viewport:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: number
 *                     default: 1920
 *                     description: Chiều rộng viewport
 *                   height:
 *                     type: number
 *                     default: 1080
 *                     description: Chiều cao viewport
 *                   deviceScaleFactor:
 *                     type: number
 *                     default: 1
 *                     description: Device scale factor
 *                   isMobile:
 *                     type: boolean
 *                     default: false
 *                     description: Emulate mobile device
 *     responses:
 *       200:
 *         description: Image được tạo thành công
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: URL không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.post('/url-to-image', urlToImage);

export default router;