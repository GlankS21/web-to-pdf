export const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export const MOBILE_VP = 390;

// Paper dimensions in CSS px at 96 dpi
export const PAPER_W = { A4: 794, A3: 1123, A5: 559, Letter: 816, Legal: 816 };
export const PAPER_H = { A4: 1123, A3: 1587, A5: 794, Letter: 1056, Legal: 1344 };

// Inject white background, smart page breaks, and visibility cleanup before pdf()
export const injectPdfPreset = async (page) => {
  await page.addStyleTag({
    content: `
      html, body {
        background: #ffffff !important;
        background-color: #ffffff !important;
        background-image: none !important;
      }
      h1, h2, h3, h4, h5, h6 { break-after: avoid; page-break-after: avoid; }
      img, figure, figcaption, svg, picture,
      table, thead, tr, pre, blockquote,
      ul, ol, li, .card, .box, article, section {
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
    // Hide fixed overlays (modals, chat widgets, popups)
    document.querySelectorAll('*').forEach((el) => {
      const s = window.getComputedStyle(el);
      if (s.position !== 'fixed') return;
      const z = parseInt(s.zIndex) || 0;
      const r = el.getBoundingClientRect();
      if (z > 999 || (r.width > window.innerWidth * 0.7 && r.height > 100)) {
        el.style.setProperty('display', 'none', 'important');
      }
    });
  });
};
