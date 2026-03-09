import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ConversionHistory from '../models/History.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOADS_DIR = path.join(__dirname, '../../uploads/conversions');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const createFilename = (url) => new URL(url).hostname.replace(/^www\./, '').split('.')[0] + '.pdf';

export const loadCSS = (filename) => {
  const filePath = path.join(__dirname, '../config', filename);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load CSS: ${filename}`, error);
    return '';
  }
};

export const saveHistory = async (userId, type, filename, filePath, sourceUrl = null) => {
  if (!userId) return;
  try {
    await ConversionHistory.create({ userId, type, filename, filePath, sourceUrl });
  } catch (err) {
    console.error('Failed to save history:', err.message);
  }
};