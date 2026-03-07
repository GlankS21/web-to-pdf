import mongoose from 'mongoose';

const conversionHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['url-to-pdf', 'html-to-pdf', 'url-to-image'],
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    sourceUrl: {
      type: String,
      default: null,
    },
    filePath: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('ConversionHistory', conversionHistorySchema);