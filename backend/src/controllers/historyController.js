import fs from 'fs';
import path from 'path';
import ConversionHistory from '../models/History.js';

// GET /api/history
export const getHistory = async (req, res) => {
  try {
    const items = await ConversionHistory.find({ userId: req.user?._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-filePath'); // không trả filePath ra client

    res.json(items);
  } catch (error) {
    console.error('Error getHistory', error);
    res.status(500).json({ message: 'Error' });
  }
};

// GET /api/history/:id/download
export const downloadHistory = async (req, res) => {
  try {
    const item = await ConversionHistory.findOne({
      _id: req.params.id,
      userId: req.user?._id, // chỉ cho download file của chính mình
    });

    if (!item) return res.status(404).json({ message: 'Not found' });
    if (!fs.existsSync(item.filePath)) return res.status(410).json({ message: 'File no longer exists' });

    res.download(item.filePath, item.filename);
  } catch (error) {
    console.error('Error downloadHistory', error);
    res.status(500).json({ message: 'Error' });
  }
};

// DELETE /api/history/:id
export const deleteHistory = async (req, res) => {
  try {
    const item = await ConversionHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user?._id,
    });

    if (!item) return res.status(404).json({ message: 'Not found' });

    // Xóa file trên disk nếu còn tồn tại
    if (fs.existsSync(item.filePath)) {
      fs.unlinkSync(item.filePath);
    }

    res.sendStatus(204);
  } catch (error) {
    console.error('Error deleteHistory', error);
    res.status(500).json({ message: 'Error' });
  }
};