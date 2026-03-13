export const buildHeaderTemplate = ({ headerText, logoBase64, logoMime } = {}) => {
  const logo = logoBase64
    ? `<img src="data:${logoMime};base64,${logoBase64}" style="height:28px;object-fit:contain;margin-right:8px;" />`
    : '';
  const text = headerText
    ? `<span style="font-size:9px;color:#444;">${headerText}</span>`
    : '';

  if (!logo && !text) return '<span></span>';

  return `
    <div style="width:100%;display:flex;align-items:center;padding:4px 40px;border-bottom:1px solid #ddd;">
      ${logo}${text}
    </div>`;
};

export const buildFooterTemplate = ({ footerText } = {}, currentDate) => {
  const left = footerText
    ? `<span style="font-size:9px;color:#666;">${footerText}</span>`
    : `<span style="font-size:9px;color:#666;">${currentDate}</span>`;

  return `
    <div style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:4px 40px;">
      ${left}
      <span style="font-size:9px;color:#666;">Page <span class="pageNumber"></span></span>
    </div>`;
};
