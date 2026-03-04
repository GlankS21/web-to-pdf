// src/pages/ConvertPage.tsx
import React, { useState } from 'react';
import axios from 'axios';

const ConvertPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);

  const [options, setOptions] = useState({
    filename: '',
    format: 'A4',
    landscape: false,
    scale: 1.0,
    printBackground: true,
    marginTop: '80px',
    marginRight: '40px',
    marginBottom: '80px',
    marginLeft: '40px',
    viewportWidth: 1366,
    viewportHeight: 768,
    displayHeaderFooter: true,
    customCSS: '',
    removeElements: [] as string[],
    waitAfterLoad: 5000,
    // Quick remove options
    acceptCookies: true,
    removeHeader: false,
    removeFooter: false,
    removeAds: false,
    removeRecommendations: false,
    removeSidebar: false,
    removeNavigation: false,
    removeCookieBanner: false,
    expandImages: false
  });

  const handlePreview = async () => {
    if (!url) {
      alert('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5001/api/convert/url-to-pdf',
        {
          url,
          options // Gửi trực tiếp options, backend tự xử lý
        },
        {
          responseType: 'blob'
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const previewUrl = URL.createObjectURL(blob);
      setPdfPreview(previewUrl);

      console.log('✅ PDF preview ready');
    } catch (error: any) {
      console.error('Error generating preview:', error);
      alert('Failed to generate preview: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!pdfPreview) return;

    const link = document.createElement('a');
    link.href = pdfPreview;
    link.download = options.filename || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setPdfPreview(null);
    setUrl('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Controls */}
          <div className="bg-white rounded-lg shadow-sm p-6 overflow-y-auto max-h-screen">
            <h1 className="text-2xl font-bold mb-6">URL to PDF Converter</h1>

            {/* URL Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Remove Options */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-semibold mb-3">Quick Remove Options</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.acceptCookies}
                    onChange={(e) => setOptions({ ...options, acceptCookies: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">🍪 Auto Accept Cookies</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.expandImages}
                    onChange={(e) => setOptions({ ...options, expandImages: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">🖼️ Expand All Images</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.removeHeader}
                    onChange={(e) => setOptions({ ...options, removeHeader: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">🔝 Remove Header</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.removeFooter}
                    onChange={(e) => setOptions({ ...options, removeFooter: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">⬇️ Remove Footer</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.removeAds}
                    onChange={(e) => setOptions({ ...options, removeAds: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">🚫 Remove Ads</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.removeRecommendations}
                    onChange={(e) => setOptions({ ...options, removeRecommendations: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">💡 Remove Recommendations</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.removeSidebar}
                    onChange={(e) => setOptions({ ...options, removeSidebar: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">📌 Remove Sidebar</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.removeNavigation}
                    onChange={(e) => setOptions({ ...options, removeNavigation: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">🧭 Remove Navigation</span>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={options.removeCookieBanner}
                    onChange={(e) => setOptions({ ...options, removeCookieBanner: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">🍪 Remove Cookie Banner</span>
                </label>
              </div>
            </div>

            {/* Basic Options */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filename (optional)
                </label>
                <input
                  type="text"
                  value={options.filename}
                  onChange={(e) => setOptions({ ...options, filename: e.target.value })}
                  placeholder="my-document.pdf"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <select
                    value={options.format}
                    onChange={(e) => setOptions({ ...options, format: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scale
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="2"
                    value={options.scale}
                    onChange={(e) => setOptions({ ...options, scale: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.landscape}
                    onChange={(e) => setOptions({ ...options, landscape: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Landscape</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.printBackground}
                    onChange={(e) => setOptions({ ...options, printBackground: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Print Background</span>
                </label>
              </div>
            </div>

            {/* Advanced Options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mb-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showAdvanced ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
            </button>

            {showAdvanced && (
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold mb-4">Advanced Options</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Margin Top
                    </label>
                    <input
                      type="text"
                      value={options.marginTop}
                      onChange={(e) => setOptions({ ...options, marginTop: e.target.value })}
                      placeholder="80px"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Margin Right
                    </label>
                    <input
                      type="text"
                      value={options.marginRight}
                      onChange={(e) => setOptions({ ...options, marginRight: e.target.value })}
                      placeholder="40px"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Margin Bottom
                    </label>
                    <input
                      type="text"
                      value={options.marginBottom}
                      onChange={(e) => setOptions({ ...options, marginBottom: e.target.value })}
                      placeholder="80px"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Margin Left
                    </label>
                    <input
                      type="text"
                      value={options.marginLeft}
                      onChange={(e) => setOptions({ ...options, marginLeft: e.target.value })}
                      placeholder="40px"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Viewport Width
                    </label>
                    <input
                      type="number"
                      value={options.viewportWidth}
                      onChange={(e) => setOptions({ ...options, viewportWidth: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Viewport Height
                    </label>
                    <input
                      type="number"
                      value={options.viewportHeight}
                      onChange={(e) => setOptions({ ...options, viewportHeight: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wait After Load (ms)
                  </label>
                  <input
                    type="number"
                    value={options.waitAfterLoad}
                    onChange={(e) => setOptions({ ...options, waitAfterLoad: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom CSS
                  </label>
                  <textarea
                    value={options.customCSS}
                    onChange={(e) => setOptions({ ...options, customCSS: e.target.value })}
                    placeholder="body { font-size: 14px; }"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Elements to Remove (comma separated)
                  </label>
                  <input
                    type="text"
                    value={options.removeElements.join(', ')}
                    onChange={(e) => setOptions({ 
                      ...options, 
                      removeElements: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                    })}
                    placeholder=".custom-class, #custom-id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.displayHeaderFooter}
                      onChange={(e) => setOptions({ ...options, displayHeaderFooter: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Display PDF Header/Footer</span>
                  </label>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Preview...
                  </div>
                ) : (
                  '👁️ Generate Preview'
                )}
              </button>

              {pdfPreview && (
                <>
                  <button
                    onClick={handleDownload}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    🔄 New Conversion
                  </button>
                </>
              )}
            </div>

            {/* Presets */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-3 text-sm">Quick Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOptions({
                    ...options,
                    removeHeader: false,
                    removeFooter: false,
                    removeAds: false,
                    removeRecommendations: false,
                    removeSidebar: false,
                    removeNavigation: false
                  })}
                  className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                >
                  📄 Full Page
                </button>
                <button
                  onClick={() => setOptions({
                    ...options,
                    removeHeader: true,
                    removeFooter: true,
                    removeAds: true,
                    removeRecommendations: true,
                    removeSidebar: true,
                    removeNavigation: true
                  })}
                  className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                >
                  🎯 Clean Content
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8 h-fit">
            <h2 className="text-xl font-bold mb-4">PDF Preview</h2>
            
            {!pdfPreview ? (
              <div className="flex items-center justify-center h-[600px] border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-lg">No preview yet</p>
                  <p className="text-sm mt-2">Click "Generate Preview" to see your PDF</p>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={pdfPreview}
                  className="w-full h-[600px]"
                  title="PDF Preview"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvertPage;