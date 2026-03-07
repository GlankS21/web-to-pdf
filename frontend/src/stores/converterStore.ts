import { create } from 'zustand';
import type {
  ConversionTab,
  Notification,
  NotificationType,
  ConversionHistory,
  UrlToPdfData,
  HtmlToPdfData,
  ScreenshotData,
  PreviewData,
} from '@/types/convert';
import { converterService } from '@/services/convertService';
import { downloadFile, generateId } from '@/lib/utils';

interface ConverterState {
  activeTab: ConversionTab;
  isLoading: boolean;
  notification: Notification | null;
  conversionHistory: ConversionHistory[];
  previewData: PreviewData | null;

  setActiveTab: (tab: ConversionTab) => void;
  setLoading: (loading: boolean) => void;
  showNotification: (message: string, type?: NotificationType) => void;
  clearNotification: () => void;
  addToHistory: (type: ConversionTab, filename: string, status: 'success' | 'error') => void;
  clearHistory: () => void;
  setPreviewData: (data: PreviewData | null) => void;
  clearPreview: () => void;
  downloadPreview: () => void;

  convertUrlToPdf: (data: UrlToPdfData, preview?: boolean) => Promise<void>;
  convertHtmlToPdf: (data: HtmlToPdfData, preview?: boolean) => Promise<void>;
  takeScreenshot: (data: ScreenshotData, preview?: boolean) => Promise<void>;
}

export const useConverterStore = create<ConverterState>((set, get) => ({
  activeTab: 'url-to-pdf',
  isLoading: false,
  notification: null,
  conversionHistory: [],
  previewData: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setLoading: (loading) => set({ isLoading: loading }),

  showNotification: (message, type = 'success') => {
    set({ notification: { message, type } });
    setTimeout(() => get().clearNotification(), 5000);
  },

  clearNotification: () => set({ notification: null }),

  addToHistory: (type, filename, status) => {
    set((state) => ({
      conversionHistory: [
        {
          id: generateId(),
          type,
          timestamp: new Date(),
          filename,
          status,
        },
        ...state.conversionHistory.slice(0, 9),
      ],
    }));
  },

  clearHistory: () => set({ conversionHistory: [] }),

  setPreviewData: (data) => set({ previewData: data }),

  clearPreview: () => {
    const { previewData } = get();
    if (previewData?.url) {
      URL.revokeObjectURL(previewData.url);
    }
    set({ previewData: null });
  },

  downloadPreview: () => {
    const { previewData, showNotification } = get();
    if (previewData) {
      downloadFile(previewData.blob, previewData.filename);
      showNotification(' Downloaded successfully!', 'success');
    }
  },

  convertUrlToPdf: async (data, preview = false) => {
    const { setLoading, showNotification, addToHistory, setPreviewData } = get();

    setLoading(true);

    try {
      const blob = await converterService.convertUrlToPdf(data);
      const filename = data.filename || 'document.pdf';

      if (preview) {
        const url = URL.createObjectURL(blob);
        setPreviewData({
          url,
          blob,
          filename,
          timestamp: new Date(),
        });
        showNotification(' Preview ready!', 'success');
      } else {
        downloadFile(blob, filename);
        showNotification(' PDF downloaded successfully!', 'success');
        addToHistory('url-to-pdf', filename, 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showNotification(`❌ ${errorMessage}`, 'error');
      if (!preview) {
        addToHistory('url-to-pdf', data.filename || 'document.pdf', 'error');
      }
    } finally {
      setLoading(false);
    }
  },

  convertHtmlToPdf: async (data, preview = false) => {
    const { setLoading, showNotification, addToHistory, setPreviewData } = get();

    setLoading(true);

    try {
      const blob = await converterService.convertHtmlToPdf(data);
      const filename = data.filename || 'document.pdf';

      if (preview) {
        const url = URL.createObjectURL(blob);
        setPreviewData({
          url,
          blob,
          filename,
          timestamp: new Date(),
        });
        showNotification(' Preview ready!', 'success');
      } else {
        downloadFile(blob, filename);
        showNotification(' PDF downloaded successfully!', 'success');
        addToHistory('html-to-pdf', filename, 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showNotification(`❌ ${errorMessage}`, 'error');
      if (!preview) {
        addToHistory('html-to-pdf', data.filename || 'document.pdf', 'error');
      }
    } finally {
      setLoading(false);
    }
  },

  takeScreenshot: async (data, preview = false) => {
    const { setLoading, showNotification, addToHistory, setPreviewData } = get();

    setLoading(true);

    try {
      const blob = await converterService.takeScreenshot(data);
      const filename = data.filename || `screenshot.${data.type || 'png'}`;

      if (preview) {
        const url = URL.createObjectURL(blob);
        setPreviewData({
          url,
          blob,
          filename,
          timestamp: new Date(),
        });
        showNotification(' Preview ready!', 'success');
      } else {
        downloadFile(blob, filename);
        showNotification(' Screenshot downloaded successfully!', 'success');
        addToHistory('screenshot', filename, 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showNotification(`❌ ${errorMessage}`, 'error');
      if (!preview) {
        addToHistory('screenshot', data.filename || 'screenshot.png', 'error');
      }
    } finally {
      setLoading(false);
    }
  },
}));