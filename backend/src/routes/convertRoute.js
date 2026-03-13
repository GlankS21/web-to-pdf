import express from 'express';
import { urlToPdf, previewWebsite, getPreview, getSuggestedSelectors, getSuggestedHeaderFooter } from '../controllers/convertController.js';
import { htmlToPdf } from '../controllers/htmltopdfController.js';
import { urlToImage } from '../controllers/UrltoimageController.js';
import { optionalAuth } from '../middlewares/optionalAuth.js'

const router = express.Router();

router.post('/url-to-pdf', optionalAuth, urlToPdf);
router.post('/preview', previewWebsite);
router.get('/preview/:id', getPreview);
router.get('/selectors/suggest', getSuggestedSelectors);
router.get('/header-footer/suggest', getSuggestedHeaderFooter);

router.post('/html-to-pdf', optionalAuth, htmlToPdf);
router.post('/url-to-image', optionalAuth, urlToImage);


export default router;