// src/components/PreviewModal.tsx
import { useConverterStore } from '@/stores/converterStore';
import { useEffect, useState } from 'react';

export const PreviewModal = () => {
  const { previewData, clearPreview, downloadPreview } = useConverterStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (previewData) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [previewData]);

  const handleClose = () => {
    clearPreview();
    setIsOpen(false);
  };

  const handleDownload = () => {
    downloadPreview();
    handleClose();
  };

  if (!isOpen || !previewData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Preview</h2>
            <p className="text-sm text-gray-600 mt-1">{previewData.filename}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              onClick={handleClose}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          <iframe
            src={previewData.url}
            className="w-full h-full"
            title="PDF Preview"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Generated at {previewData.timestamp.toLocaleString()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};