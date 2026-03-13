import { PDFDocument, PDFRawStream, PDFName, PDFArray, PDFRef } from 'pdf-lib';

export const removeBlankPages = async (pdfBuffer) => {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = doc.getPages();
  const blankIndices = [];

  for (let i = 0; i < pages.length; i++) {
    try {
      const contentsEntry = pages[i].node.get(PDFName.of('Contents'));
      if (!contentsEntry) { blankIndices.push(i); continue; }

      const streamRefs = [];
      if (contentsEntry instanceof PDFRef) streamRefs.push(contentsEntry);
      else if (contentsEntry instanceof PDFArray) {
        for (const item of contentsEntry.array) {
          if (item instanceof PDFRef) streamRefs.push(item);
        }
      }

      let totalSize = 0;
      for (const ref of streamRefs) {
        const obj = doc.context.lookup(ref);
        if (obj instanceof PDFRawStream) totalSize += obj.contents.length;
      }
      if (totalSize < 80) blankIndices.push(i);
    } catch {}
  }

  if (blankIndices.length === 0 || blankIndices.length === pages.length) return pdfBuffer;
  for (let i = blankIndices.length - 1; i >= 0; i--) doc.removePage(blankIndices[i]);
  return Buffer.from(await doc.save());
};

export const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export const MOBILE_VP = 480;

export const PAPER_W = { A4: 794, A3: 1123, A5: 559, Letter: 816, Legal: 816 };
export const PAPER_H = { A4: 1123, A3: 1587, A5: 794, Letter: 1056, Legal: 1344 };

const BASE_PDF_CSS = `
  html, body {
    background: #ffffff !important;
    background-color: #ffffff !important;
    background-image: none !important;
  }
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
  }
`;

const CHROME_PATTERN = /\b(nav(bar|igation)?|sticky|fixed[-_]?(top|bottom|header|footer|nav)|site[-_]?header|top[-_]?bar|topbar|back[-_]?to[-_]?top|scroll[-_]?(top|up)|chat[-_]?(widget|button|bubble|launcher|icon)|intercom|drift[-_]|crisp|hubspot|zendesk|live[-_]?chat|messenger[-_]?icon|cookie[-_]?(bar|banner|consent|notice)|gdpr|ccpa|consent[-_]?bar|promo[-_]?(bar|banner)|announcement[-_]?bar|floating[-_]?(btn|button|cta)|social[-_]?(share|float))\b/i;

export const injectPdfStyles = async (page) => {
  await page.addStyleTag({
    content: BASE_PDF_CSS + `[data-pdf-hidden="true"] { display: none !important; }`,
  });

  await page.evaluate((chromePatternSrc) => {
    const hide = (el) => el.style.setProperty('display', 'none', 'important');
    const CHROME_RE = new RegExp(chromePatternSrc, 'i');

    document.querySelectorAll('*').forEach((el) => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return;
      if (s.position !== 'fixed' && s.position !== 'sticky') return;

      const tag  = el.tagName.toLowerCase();
      const cls  = typeof el.className === 'string' ? el.className : '';
      const id   = el.id || '';
      const label = [tag, cls, id, el.getAttribute('role') || '', el.getAttribute('aria-label') || ''].join(' ');

      if (CHROME_RE.test(label)) { hide(el); return; }

      if (s.position === 'fixed') {
        const z = parseInt(s.zIndex) || 0;
        const r = el.getBoundingClientRect();
        if (z > 999 || (r.width > window.innerWidth * 0.7 && r.height > 100)) hide(el);
      }
    });
  }, CHROME_PATTERN.source);
};

export const injectPdfPreset = async (page) => {
  await page.addStyleTag({ content: BASE_PDF_CSS });

  await page.evaluate((chromePatternSrc) => {
    const hide = (el) => el.style.setProperty('display', 'none', 'important');
    const CHROME_RE = new RegExp(chromePatternSrc, 'i');

    document.querySelectorAll('[aria-hidden="true"],[hidden]').forEach(hide);
    document.querySelectorAll('[style*="display: none"],[style*="display:none"]').forEach(hide);

    document.querySelectorAll('[aria-expanded="false"]').forEach((trigger) => {
      const id = trigger.getAttribute('aria-controls');
      if (id) {
        const panel = document.getElementById(id);
        if (panel) hide(panel);
      }
    });

    document.querySelectorAll('details[open]').forEach((el) => el.removeAttribute('open'));
    document.querySelectorAll('dialog').forEach((el) => { el.removeAttribute('open'); hide(el); });

    document.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    document.querySelectorAll(
      'li > h2 ~ div, li > h3 ~ div, li > h4 ~ div, li > label ~ div'
    ).forEach(hide);

    document.querySelectorAll('nav, header, [class*="nav"], [class*="menu"], [class*="header"]').forEach((area) => {
      area.querySelectorAll('ul ul, li > ul, li > div').forEach((el) => {
        const s = window.getComputedStyle(el);
        if (s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05 || s.display === 'none') hide(el);
      });
    });

    const SLIDER_SEL = '.swiper-wrapper, .slick-track, .glide__track, .splide__list, .keen-slider';
    document.querySelectorAll(SLIDER_SEL).forEach((wrapper) => {
      wrapper.style.setProperty('transform', 'none', 'important');
      if (wrapper.parentElement) wrapper.parentElement.style.setProperty('overflow', 'hidden', 'important');

      const active =
        wrapper.querySelector('.swiper-slide-active, .slick-active, .is-active, .glide__slide--active') ||
        Array.from(wrapper.children).find(
          (c) => !c.classList.contains('swiper-slide-duplicate') && !c.classList.contains('slick-cloned')
        );

      Array.from(wrapper.children).forEach((child) => {
        if (child === active) {
          child.style.setProperty('display', 'block', 'important');
          child.style.setProperty('width', '100%', 'important');
          child.style.setProperty('visibility', 'visible', 'important');
          child.style.setProperty('opacity', '1', 'important');
        } else {
          hide(child);
        }
      });
    });

    document.querySelectorAll('*').forEach((el) => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return;
      if (s.position !== 'absolute' && s.position !== 'fixed') return;

      const role = (el.getAttribute('role') || '').toLowerCase();
      const cls  = (typeof el.className === 'string' ? el.className : '').toLowerCase();
      const id   = (el.id || '').toLowerCase();

      if (['tooltip', 'menu', 'listbox', 'combobox'].includes(role)) { hide(el); return; }
      if (/\b(dropdown-menu|submenu|sub-menu|flyout|mega-?menu|nav-?dropdown|nav-?flyout)\b/.test(cls + ' ' + id)) { hide(el); return; }

      if (s.position === 'fixed') {
        const label = [el.tagName.toLowerCase(), cls, id, el.getAttribute('role') || '', el.getAttribute('aria-label') || ''].join(' ');
        if (CHROME_RE.test(label)) { hide(el); return; }
        const z = parseInt(s.zIndex) || 0;
        const r = el.getBoundingClientRect();
        if (z > 999 || (r.width > window.innerWidth * 0.7 && r.height > 100)) hide(el);
      }
    });
  }, CHROME_PATTERN.source);
};

export const disableAnimationsOnNewDocument = async (page) => {
  await page.evaluateOnNewDocument(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.id = '__pdf_no_anim';
      s.textContent = '*, *::before, *::after { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; animation-delay: 0s !important; }';
      document.head?.appendChild(s);
    });
  });
};
