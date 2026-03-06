import express from 'express';
import { urlToPdf, previewWebsite, getPreview, getSuggestedSelectors } from '../controllers/convertController.js';

const router = express.Router();

router.post('/url-to-pdf', urlToPdf);

router.post('/preview', previewWebsite);

router.get('/preview/:id', getPreview);

router.get('/selectors/suggest', getSuggestedSelectors);

// router.post('/url-to-image', urlToImage);

export default router;