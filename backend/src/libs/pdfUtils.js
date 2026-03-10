import { PDFDocument, PDFRawStream, PDFName, PDFArray, PDFRef } from 'pdf-lib';

// Remove blank/empty pages from a PDF buffer.
// Heuristic: a blank page has a very small raw content stream (< 80 bytes even compressed).
export const removeBlankPages = async (pdfBuffer) => {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = doc.getPages();

  const blankIndices = [];
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    try {
      const contentsEntry = page.node.get(PDFName.of('Contents'));
      if (!contentsEntry) { blankIndices.push(i); continue; }

      // Collect all content stream references (single ref or array of refs)
      const streamRefs = [];
      if (contentsEntry instanceof PDFRef) {
        streamRefs.push(contentsEntry);
      } else if (contentsEntry instanceof PDFArray) {
        for (const item of contentsEntry.array) {
          if (item instanceof PDFRef) streamRefs.push(item);
        }
      }

      // Sum raw byte sizes of all content streams
      let totalSize = 0;
      for (const ref of streamRefs) {
        const obj = doc.context.lookup(ref);
        if (obj instanceof PDFRawStream) totalSize += obj.contents.length;
      }

      // Blank pages typically have < 80 raw bytes in their content stream
      if (totalSize < 80) blankIndices.push(i);
    } catch {
      // Cannot determine — assume not blank
    }
  }

  // Never remove all pages
  if (blankIndices.length === 0 || blankIndices.length === pages.length) return pdfBuffer;

  for (let i = blankIndices.length - 1; i >= 0; i--) {
    doc.removePage(blankIndices[i]);
  }

  return Buffer.from(await doc.save());
};

export const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export const MOBILE_VP = 390;

// Paper dimensions in CSS px at 96 dpi
export const PAPER_W = { A4: 794, A3: 1123, A5: 559, Letter: 816, Legal: 816 };
export const PAPER_H = { A4: 1123, A3: 1587, A5: 794, Letter: 1056, Legal: 1344 };

// CSS + auto-cleanup preset for html-to-pdf (preview HTML — DOM is already correct,
// but we still auto-hide fixed UI chrome that doesn't belong in a static PDF).
export const injectPdfStyles = async (page) => {
  await page.addStyleTag({
    content: `
      html, body {
        background: #ffffff !important;
        background-color: #ffffff !important;
        background-image: none !important;
      }
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
      h1, h2, h3, h4, h5, h6 { break-after: avoid; page-break-after: avoid; }
      img, figure, figcaption, svg, picture,
      table, thead, tr, pre, blockquote,
      ul, ol, li, .card, .box, article, section {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      [role="tablist"], [role="toolbar"],
      [class*="tab-list"], [class*="tab-bar"], [class*="tabs-nav"],
      [class*="btn-group"], [class*="button-group"] {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      p { orphans: 3; widows: 3; }
      [data-pdf-hidden="true"] { display: none !important; }
    `,
  });

  await page.evaluate(() => {
    const hide = (el) => el.style.setProperty('display', 'none', 'important');

    // 1. Reinforce user-blocked elements (inline display:none set by frontend)
    document.querySelectorAll('[style*="display: none"],[style*="display:none"]')
      .forEach(hide);

    // 2. Hide <dialog> elements (popups/modals — meaningless in static PDF)
    document.querySelectorAll('dialog').forEach((el) => {
      el.removeAttribute('open');
      hide(el);
    });

    // 3. Auto-hide fixed/sticky UI chrome that doesn't belong in a printed page.
    //    Only targets clearly navigation/utility elements — NOT content containers.
    const CHROME_PATTERN = /\b(nav(bar|igation)?|sticky|fixed[-_]?(top|bottom|header|footer|nav)|site[-_]?header|top[-_]?bar|topbar|back[-_]?to[-_]?top|scroll[-_]?(top|up)|chat[-_]?(widget|button|bubble|launcher|icon)|intercom|drift[-_]|crisp|hubspot|zendesk|live[-_]?chat|messenger[-_]?icon|cookie[-_]?(bar|banner|consent|notice)|gdpr|ccpa|consent[-_]?bar|promo[-_]?(bar|banner)|announcement[-_]?bar|floating[-_]?(btn|button|cta)|social[-_]?(share|float))\b/i;

    document.querySelectorAll('*').forEach((el) => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return;
      if (s.position !== 'fixed' && s.position !== 'sticky') return;

      const label = [
        el.tagName.toLowerCase(),
        typeof el.className === 'string' ? el.className : '',
        el.id || '',
        el.getAttribute('role') || '',
        el.getAttribute('aria-label') || '',
      ].join(' ');

      if (CHROME_PATTERN.test(label)) hide(el);
    });
  });
};

// Full preset — for url-to-pdf (live page needs DOM cleanup for JS-controlled elements)
export const injectPdfPreset = async (page) => {
  await page.addStyleTag({
    content: `
      html, body {
        background: #ffffff !important;
        background-color: #ffffff !important;
        background-image: none !important;
      }
      /* Freeze all transitions/animations so nothing is caught mid-state */
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
      h1, h2, h3, h4, h5, h6 { break-after: avoid; page-break-after: avoid; }
      img, figure, figcaption, svg, picture,
      table, thead, tr, pre, blockquote,
      ul, ol, li, .card, .box, article, section {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      /* Prevent tab bars and button groups from being split across pages */
      [role="tablist"], [role="toolbar"],
      [class*="tab-list"], [class*="tab-bar"], [class*="tabs-nav"],
      [class*="btn-group"], [class*="button-group"] {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      p { orphans: 3; widows: 3; }
    `,
  });

  await page.evaluate(() => {
    // Enforce aria-hidden / [hidden] attribute
    document.querySelectorAll('[aria-hidden="true"],[hidden]').forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });
    // Reinforce inline display:none set by JS
    document.querySelectorAll('[style*="display: none"],[style*="display:none"]').forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });

    // Hide elements controlled by aria-expanded="false" triggers
    document.querySelectorAll('[aria-expanded="false"]').forEach((trigger) => {
      const id = trigger.getAttribute('aria-controls');
      if (id) {
        const panel = document.getElementById(id);
        if (panel) panel.style.setProperty('display', 'none', 'important');
      }
    });

    // ── Close HTML5 <details open> accordion elements ──
    document.querySelectorAll('details[open]').forEach((el) => el.removeAttribute('open'));

    // ── Hide all <dialog> elements (modal/popup — not for static PDF) ──
    document.querySelectorAll('dialog').forEach((el) => {
      el.removeAttribute('open');
      el.style.setProperty('display', 'none', 'important');
    });

    // ── Checkbox-based accordion menus ──
    // Pattern: li > h3 > label > input[checkbox] controls li > div visibility via CSS :checked.
    // Uncheck all toggles AND force-hide their sibling panels.
    document.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    document.querySelectorAll(
      'li > h2 ~ div, li > h3 ~ div, li > h4 ~ div, li > label ~ div'
    ).forEach((el) => el.style.setProperty('display', 'none', 'important'));

    // ── Navigation dropdowns: only hide submenus that are invisible by default ──
    // (shown only on hover/click — detected via computed style, not DOM structure)
    const navAreas = 'nav, header, [class*="nav"], [class*="menu"], [class*="header"]';
    document.querySelectorAll(navAreas).forEach((area) => {
      area.querySelectorAll('ul ul, li > ul, li > div').forEach((el) => {
        const s = window.getComputedStyle(el);
        if (
          s.visibility === 'hidden' ||
          parseFloat(s.opacity) < 0.05 ||
          s.display === 'none'
        ) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    });

    // ── Carousel/slider: show only the active (first) slide at full width ──
    const sliderWrappers = [
      '.swiper-wrapper', '.slick-track', '.glide__track',
      '.splide__list', '.keen-slider',
    ];
    document.querySelectorAll(sliderWrappers.join(',')).forEach((wrapper) => {
      wrapper.style.setProperty('transform', 'none', 'important');
      if (wrapper.parentElement) {
        wrapper.parentElement.style.setProperty('overflow', 'hidden', 'important');
      }

      // Find the active slide; fall back to first non-cloned child
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
          child.style.setProperty('display', 'none', 'important');
        }
      });
    });

    // ── Interactive floating overlays (tooltips, menus, popups) ──
    document.querySelectorAll('*').forEach((el) => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return;
      if (s.position !== 'absolute' && s.position !== 'fixed') return;

      const role = (el.getAttribute('role') || '').toLowerCase();
      const cls  = (typeof el.className === 'string' ? el.className : '').toLowerCase();
      const id   = (el.id || '').toLowerCase();

      // Hide by ARIA role
      if (['tooltip', 'menu', 'listbox', 'combobox'].includes(role)) {
        el.style.setProperty('display', 'none', 'important');
        return;
      }

      // Hide by common CSS class / id naming conventions
      if (/\b(dropdown-menu|submenu|sub-menu|flyout|mega-?menu|nav-?dropdown|nav-?flyout)\b/.test(cls + ' ' + id)) {
        el.style.setProperty('display', 'none', 'important');
        return;
      }

      // Hide fixed overlays (modals, chat widgets, popups)
      if (s.position === 'fixed') {
        const z = parseInt(s.zIndex) || 0;
        const r = el.getBoundingClientRect();
        if (z > 999 || (r.width > window.innerWidth * 0.7 && r.height > 100)) {
          el.style.setProperty('display', 'none', 'important');
        }
      }
    });
  });
};

// Inject before navigation to disable scroll-reveal animations during page load
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
