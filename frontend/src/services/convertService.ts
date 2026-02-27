import api from "@/lib/axios";
import type { UrlToPdfData, HtmlToPdfData, ScreenshotData } from '@/types/convert';

export const converterService = {
  async convertUrlToPdf(data: UrlToPdfData): Promise<Blob> {
    const response = await api.post('/convert/url-to-pdf', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  async convertHtmlToPdf(data: HtmlToPdfData): Promise<Blob> {
    const response = await api.post('/convert/html-to-pdf', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  async takeScreenshot(data: ScreenshotData): Promise<Blob> {
    const response = await api.post('/convert/url-to-image', data, {
      responseType: 'blob',
    });
    return response.data;
  },
};