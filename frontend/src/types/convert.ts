export interface Viewport {
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  isLandscape?: boolean;
}

export interface PdfOptions {
  styleTemplate?: 'modern' | 'minimal' | 'professional' | 'magazine';
  customCSS?: string;
  cleanMode?: boolean;
  mainContentOnly?: boolean;
  removeElements?: string[];
  format?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid';
  landscape?: boolean;
  printBackground?: boolean;
  scale?: number;
  pageRanges?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  viewport?: Viewport;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  width?: string;
  height?: string;
}

export interface UrlToPdfData {
  url: string;
  filename?: string;
  options?: PdfOptions;
}

export interface HtmlToPdfData {
  html: string;
  filename?: string;
  options?: Omit<PdfOptions, 'styleTemplate' | 'cleanMode' | 'mainContentOnly' | 'removeElements'>;
}

export interface ScreenshotData {
  url: string;
  filename?: string;
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  viewport?: Viewport;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  message: string;
  type: NotificationType;
}

export type ConversionTab = 'url-to-pdf' | 'html-to-pdf' | 'screenshot';

export interface ConversionHistory {
  id: string;
  type: ConversionTab;
  timestamp: Date;
  filename: string;
  status: 'success' | 'error';
}

export interface PreviewData {
  url: string;
  blob: Blob;
  filename: string;
  timestamp: Date;
}