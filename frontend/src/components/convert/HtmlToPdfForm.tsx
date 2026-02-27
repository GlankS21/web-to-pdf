
import { useState } from 'react';
import { useConverterStore } from '@/stores/converterStore';
import type { HtmlToPdfData } from '@/types/convert';

export const HtmlToPdfForm = () => {
  const { convertHtmlToPdf, isLoading } = useConverterStore();
  
  const [formData, setFormData] = useState<HtmlToPdfData>({
    html: '',
    filename: '',
    options: {
      format: 'A4',
      landscape: false,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await convertHtmlToPdf(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          HTML Content *
        </label>
        <textarea
          value={formData.html}
          onChange={(e) => setFormData({ ...formData, html: e.target.value })}
          placeholder="<html><body><h1>Hello World</h1></body></html>"
          required
          rows={12}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filename
        </label>
        <input
          type="text"
          value={formData.filename}
          onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
          placeholder="document.pdf"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page Format
          </label>
          <select
            value={formData.options?.format}
            onChange={(e) => setFormData({ 
              ...formData, 
              options: { ...formData.options, format: e.target.value as any }
            })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-3 cursor-pointer pb-3">
            <input
              type="checkbox"
              checked={formData.options?.landscape}
              onChange={(e) => setFormData({ 
                ...formData, 
                options: { ...formData.options, landscape: e.target.checked }
              })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Landscape</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Converting...</span>
          </>
        ) : (
          <span>Convert to PDF</span>
        )}
      </button>
    </form>
  );
};