(function(exports) {
  'use strict';

  var V = window.VTT_ACTAS = window.VTT_ACTAS || {};

  exports.saveFormData = function() {
    var titleEl = document.getElementById('doc-title');
    var dateEl = document.getElementById('doc-date');
    var timeEl = document.getElementById('doc-time');
    var locationEl = document.getElementById('doc-location');
    var orgEl = document.getElementById('doc-org');
    var aiEnabledEl = document.getElementById('ai-enabled');
    var hdrLeftEl = document.getElementById('opt-hdr-left');
    var hdrRightEl = document.getElementById('opt-hdr-right');
    var ftrLeftEl = document.getElementById('opt-ftr-left');
    var pageStyleEl = document.getElementById('opt-page-style');
    var correctionsEl = document.getElementById('opt-corrections');
    var aiModelEl = document.getElementById('opt-ai-model');
    var aiInstructionsEl = document.getElementById('opt-ai-instructions');

    var data = {
      title: titleEl ? titleEl.value : '',
      date: dateEl ? dateEl.value : '',
      time: timeEl ? timeEl.value : '',
      location: locationEl ? locationEl.value : '',
      org: orgEl ? orgEl.value : '',
      style: (document.querySelector('input[name="doc-style"]:checked') || {}).value || 'formal',
      timestamps: !!(document.getElementById('opt-timestamps') || {}).checked,
      dedup: !!(document.getElementById('opt-dedup') || {}).checked,
      header: !!(document.getElementById('opt-header') || {}).checked,
      agreements: !!(document.getElementById('opt-agreements') || {}).checked,
      signatures: !!(document.getElementById('opt-signatures') || {}).checked,
      aiEnabled: !!(aiEnabledEl || {}).checked,
      hdrLeft: hdrLeftEl ? hdrLeftEl.value : '',
      hdrRight: hdrRightEl ? hdrRightEl.value : '',
      ftrLeft: ftrLeftEl ? ftrLeftEl.value : '',
      pageNum: !!(document.getElementById('opt-page-num') || {}).checked,
      pageStyle: pageStyleEl ? pageStyleEl.value : 'normal',
      corrections: correctionsEl ? correctionsEl.value : '',
      model: aiModelEl ? aiModelEl.value : 'gemini-2.5-flash',
      aiInstructions: aiInstructionsEl ? aiInstructionsEl.value : '',
      aiForceFull: !!(document.getElementById('opt-ai-force-full') || {}).checked
    };
    localStorage.setItem('vtt_actas_form_data', JSON.stringify(data));
    if (V.reRenderCurrentState) {
      V.reRenderCurrentState();
    }
  };

  exports.saveState = function(S) {
    var stateToSave = {
      files: S.files ? S.files.map(function(f){ return { name: f.name, size: f.size }; }) : [],
      vttParts: S.vttParts || [],
      vttRaw: S.vttRaw,
      cues: S.cues,
      sections: S.sections,
      attendees: S.attendees,
      agreements: S.agreements,
      aiUsed: S.aiUsed,
      plainText: S.plainText,
      htmlDoc: S.htmlDoc
    };
    localStorage.setItem('vtt_actas_last_state', JSON.stringify(stateToSave));
  };

  exports.restoreSession = function(S, renderCallback) {
    var savedForm = localStorage.getItem('vtt_actas_form_data');
    var aiEnabledEl = document.getElementById('ai-enabled');
    if (savedForm) {
      try {
        var data = JSON.parse(savedForm);
        var fields = {
          'doc-title': data.title,
          'doc-date': data.date,
          'doc-time': data.time,
          'doc-location': data.location,
          'doc-org': data.org,
          'opt-timestamps': data.timestamps,
          'opt-dedup': data.dedup,
          'opt-header': data.header,
          'opt-agreements': data.agreements,
          'opt-signatures': data.signatures,
          'opt-hdr-left': data.hdrLeft,
          'opt-hdr-right': data.hdrRight,
          'opt-ftr-left': data.ftrLeft,
          'opt-page-num': data.pageNum,
          'opt-page-style': data.pageStyle,
          'opt-corrections': data.corrections,
          'opt-ai-model': data.model,
          'opt-ai-instructions': data.aiInstructions,
          'opt-ai-force-full': data.aiForceFull
        };
        for (var id in fields) {
          var el = document.getElementById(id);
          if (el && fields[id] !== undefined) {
            if (el.type === 'checkbox') el.checked = fields[id];
            else el.value = fields[id];
          }
        }
        if (data.style !== undefined) {
          var radio = document.querySelector('input[name="doc-style"][value="' + data.style + '"]');
          if (radio) radio.checked = true;
        }
        if (data.aiEnabled !== undefined && aiEnabledEl) {
          aiEnabledEl.checked = data.aiEnabled;
        }
      } catch(ex) { console.error('Error al restaurar formulario:', ex); }
    }

    var savedState = localStorage.getItem('vtt_actas_last_state');
    if (savedState) {
      try {
        var data = JSON.parse(savedState);
        if (data && (data.vttRaw || data.vttParts)) {
          S.vttRaw = data.vttRaw || '';
          S.vttParts = data.vttParts || [];
          S.cues = data.cues || [];
          S.sections = data.sections || [];
          S.attendees = data.attendees || [];
          S.agreements = data.agreements || [];
          S.aiUsed = data.aiUsed || false;
          S.plainText = data.plainText || '';
          S.htmlDoc = data.htmlDoc || '';

          if (data.files && data.files.length > 0) {
            S.files = data.files;
            S.file = { name: data.files.length === 1 ? data.files[0].name : data.files.length + ' archivos cargados' };

            var fileNameDisp = document.getElementById('file-name-display');
            var fileSizeDisp = document.getElementById('file-size-display');
            var fileStatusTx = document.getElementById('file-status-text');
            var fileInfoCard = document.getElementById('file-info-card');
            var convertBtn = document.getElementById('convert-btn');

            if (fileNameDisp) fileNameDisp.textContent = S.file.name;
            var totalSize = data.files.reduce(function(acc, f) { return acc + f.size; }, 0);
            if (fileSizeDisp) fileSizeDisp.textContent = V.fmtBytes(totalSize);
            if (fileStatusTx) fileStatusTx.textContent = 'Sesión anterior restaurada';
            if (fileInfoCard) fileInfoCard.classList.remove('hidden');
            if (convertBtn) convertBtn.disabled = false;

            var fileListItems = document.getElementById('file-list-items');
            if (fileListItems) {
              fileListItems.innerHTML = '';
              data.files.forEach(function (file) {
                var item = document.createElement('div');
                item.className = 'file-list-item';
                item.innerHTML = 
                  '<div class="file-list-item-left">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>' +
                    '<span class="file-list-item-name">' + V.esc(file.name) + '</span>' +
                  '</div>' +
                  '<span class="file-list-item-size">' + V.fmtBytes(file.size) + '</span>';
                fileListItems.appendChild(item);
              });
            }
          }

          var statWords = document.getElementById('stat-words');
          var statSegs = document.getElementById('stat-segments');
          var statDur = document.getElementById('stat-duration');

          var totalWords = S.sections.reduce(function(a, sec) {
            var wordsInSec = sec.paragraphs ? sec.paragraphs.join(' ').split(/\s+/).length : 0;
            return a + wordsInSec;
          }, 0);
          if (statWords) statWords.textContent = totalWords.toLocaleString('es-ES');
          if (statSegs) statSegs.textContent = S.sections.length;
          if (statDur) statDur.textContent = S.cues.length ? V.fmtDurLabel(S.cues[S.cues.length-1].es - S.cues[0].ss) : '—';

          if (renderCallback) renderCallback(false);
          V.toast('Se ha restaurado tu sesión de trabajo anterior');
        }
      } catch(ex) { console.error('Error al restaurar estado:', ex); }
    }
  };

  exports.clearState = function() {
    localStorage.removeItem('vtt_actas_last_state');
  };

})(window.VTT_ACTAS = window.VTT_ACTAS || {});
