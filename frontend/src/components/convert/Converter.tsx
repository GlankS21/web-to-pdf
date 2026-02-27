// src/components/Converter.tsx
import { useConverterStore } from '@/stores/converterStore';
import { TabButton } from './TabButton';
import { UrlToPdfForm } from './UrlToPdfForm';
import { HtmlToPdfForm } from './HtmlToPdfForm';
import { ScreenshotForm } from './ScreenshotForm';

export const Converter = () => {
  const { activeTab, setActiveTab } = useConverterStore();

  return (
    <section id="converter" className="py-20 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">
          Start Converting
        </h2>
        <p className="text-gray-600 text-center mb-12">
          Choose your conversion type and get started
        </p>

        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <TabButton
            tab="url-to-pdf"
            activeTab={activeTab}
            icon="🌐"
            label="URL to PDF"
            onClick={() => setActiveTab('url-to-pdf')}
          />
          <TabButton
            tab="html-to-pdf"
            activeTab={activeTab}
            icon="💻"
            label="HTML to PDF"
            onClick={() => setActiveTab('html-to-pdf')}
          />
          <TabButton
            tab="screenshot"
            activeTab={activeTab}
            icon="📸"
            label="Screenshot"
            onClick={() => setActiveTab('screenshot')}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {activeTab === 'url-to-pdf' && <UrlToPdfForm />}
          {activeTab === 'html-to-pdf' && <HtmlToPdfForm />}
          {activeTab === 'screenshot' && <ScreenshotForm />}
        </div>
      </div>
    </section>
  );
};