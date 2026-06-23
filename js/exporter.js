(function(exports) {
  'use strict';

  var V = window.VTT_ACTAS = window.VTT_ACTAS || {};

  exports.blobDL = function(blob, name) {
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); },1000);
  };

  exports.printPDF = function(S, opts) {
    var o = opts();
    var currentHtmlDoc = V.buildHTML(S.sections, o, S.attendees, S.agreements, S.aiUsed);
    
    var win = window.open('', '_blank');
    if (!win) { V.toast('Activa las ventanas emergentes para exportar PDF.', true); return; }

    var css = [
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap");',
      '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
      'body { font-family: "Inter", Arial, sans-serif; font-size: 11pt; line-height: 1.75; color: #1a1a2e; background: white; }',
      '.page { max-width: 820px; margin: 0 auto; padding: 20px 40px; }',
      '.ai-badge { background: linear-gradient(135deg,#e6efff,#e8f8ff); border: 1px solid #b3d1ff; border-radius: 8px; padding: 8px 14px; font-size: 8.5pt; color: #16366D; margin-bottom: 24px; font-weight: 600; }',
      '.doc-header { text-align: center; padding-bottom: 12px; margin-bottom: 16px; border-bottom: none; }',
      '.doc-header-top-bar { display: none; }',
      '.doc-header-org { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-bottom: 6px; font-weight: 700; }',
      '.doc-header-title { font-family: "Playfair Display", serif; font-size: 20pt; font-weight: 700; color: #1a1a2e; line-height: 1.2; }',
      '.doc-header-acta { font-size: 8.5pt; color: #16366D; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 6px 0 20px; }',
      '.doc-meta-table { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; text-align: left; max-width: 600px; margin: 24px auto; background: #f8fafc; border-left: 3px solid #16366D; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 6px; }',
      '.doc-meta-row { display: flex; flex-direction: column; gap: 1px; }',
      '.doc-meta-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; color: #aaa; font-weight: 700; }',
      '.doc-meta-value { font-size: 9.5pt; color: #333; font-weight: 500; }',
      '.doc-section { margin-bottom: 26px; }',
      '.doc-section-title { font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #16366D; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1.5px solid #d1dfed; display: flex; align-items: center; gap: 6px; page-break-after: avoid; }',
      '.doc-paragraph { font-size: 10.5pt; color: #2d2d4e; margin-bottom: 10px; text-align: justify; text-indent: 1.5em; line-height: 1.85; orphans: 3; widows: 3; }',
      '.attendees-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 24px; font-size: 9.5pt; }',
      '.attendee-item { display: flex; align-items: center; gap: 6px; color: #444; padding: 3px 0; }',
      '.attendee-dot { width: 5px; height: 5px; border-radius: 50%; background: #16366D; flex-shrink: 0; }',
      '.agreements-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-top: 8px; page-break-inside: avoid; }',
      '.agreements-table th { text-align: left; padding: 7px 10px; background: #f0f4f8; color: #16366D; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .8px; border-bottom: 2px solid #16366D; font-weight: 700; }',
      '.agreements-table td { padding: 9px 10px; border-bottom: 1px solid #eeeef8; color: #333; vertical-align: top; }',
      '.td-num { width: 36px; font-weight: 700; color: #16366D; }',
      '.td-blank { color: #bbb; font-style: italic; }',
      '.agreements-list .agreement-item { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }',
      '.ag-num { font-weight: 700; color: #16366D; min-width: 20px; }',
      '.ag-line { flex: 1; border-bottom: 1px solid #ccc; }',
      '.next-meeting-box { margin-top: 12px; padding: 10px 14px; background: #f0f4f8; border-left: 3px solid #16366D; font-size: 9.5pt; }',
      '.doc-signatures { margin-top: 44px; padding-top: 24px; border-top: 1px solid #e0e0f0; page-break-inside: avoid; }',
      '.doc-signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px 48px; margin-top: 24px; }',
      '.doc-signature-item { text-align: center; }',
      '.doc-signature-line { height: 1px; background: #333; margin-bottom: 7px; }',
      '.doc-signature-name { font-size: 8.5pt; color: #666; }',
      '.doc-footer { display: none; }',
      
      '.print-wrapper-table { width: 100%; border-collapse: collapse; }',
      '.print-header-spacer { height: 60px; }',
      '.print-footer-spacer { height: 60px; }',
      '.print-header-fixed { position: fixed; top: 15px; left: 40px; right: 40px; height: 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; font-size: 7.5pt; color: #718096; font-family: "Inter", sans-serif; }',
      '.print-footer-fixed { position: fixed; bottom: 15px; left: 40px; right: 40px; height: 30px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; font-size: 7.5pt; color: #718096; font-family: "Inter", sans-serif; }',
      
      '.print-first-page-header-cover { position: absolute; top: -60px; left: -40px; right: -40px; height: 60px; background: white; z-index: 9999; }',
      '.print-first-page-footer-cover { position: absolute; top: calc(100vh - 120px); left: -40px; right: -40px; height: 60px; background: white; z-index: 9999; }',
      
      '@media print {',
      '  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
      '  .page { padding: 0; }',
      '}'
    ].join('\n');

    win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">');
    win.document.write('<title>' + V.esc(o.title) + '</title>');
    win.document.write('<style>' + css + '</style></head><body>');
    
    var htmlContent = '';
    
    if (o.header) {
      var hLeft = o.hdrLeft || o.org || '';
      var hRight = o.hdrRight || o.title || 'Acta de Reunión';
      var fLeft = o.ftrLeft || 'Confidencial - Uso Interno';
      
      htmlContent += '<table class="print-wrapper-table">';
      htmlContent += '  <thead><tr><td><div class="print-header-spacer"></div></td></tr></thead>';
      htmlContent += '  <tbody><tr><td>';
      htmlContent += '    <div class="page" style="position: relative;">';
      htmlContent += '      <div class="print-first-page-header-cover"></div>';
      htmlContent += '      <div class="print-first-page-footer-cover"></div>';
      htmlContent += currentHtmlDoc;
      htmlContent += '    </div>';
      htmlContent += '  </td></tr></tbody>';
      htmlContent += '  <tfoot><tr><td><div class="print-footer-spacer"></div></td></tr></tfoot>';
      htmlContent += '</table>';
      
      htmlContent += '<div class="print-header-fixed">';
      htmlContent += '  <span>' + V.esc(hLeft) + '</span>';
      htmlContent += '  <span>' + V.esc(hRight) + '</span>';
      htmlContent += '</div>';
      
      htmlContent += '<div class="print-footer-fixed">';
      htmlContent += '  <span>' + V.esc(fLeft) + '</span>';
      htmlContent += '  <span>' + (o.pageNum ? 'VTT Actas' : '') + '</span>';
      htmlContent += '</div>';
    } else {
      htmlContent += '<div class="page">' + currentHtmlDoc + '</div>';
    }

    win.document.write(htmlContent);
    win.document.write('</body></html>');
    win.document.close();
    win.onload = function () { setTimeout(function () { win.focus(); win.print(); }, 500); };
  };

})(window.VTT_ACTAS = window.VTT_ACTAS || {});
