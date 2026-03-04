import express from 'express';
import { urlToPdf } from '../controllers/convertController.js';

const router = express.Router();

router.post('/url-to-pdf', urlToPdf);

// router.post('/html-to-pdf', htmlToPdf);

// router.post('/url-to-image', urlToImage);

export default router;