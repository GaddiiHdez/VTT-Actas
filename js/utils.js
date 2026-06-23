(function(exports) {
  'use strict';

  exports.fmtBytes = function(b) {
    return b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'KB' : (b / 1048576).toFixed(1) + 'MB';
  };

  exports.fmtDurLabel = function(s) {
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = Math.floor(s % 60);
    return h > 0 ? h + 'h ' + m + 'm' : m > 0 ? m + 'm ' + sc + 's' : sc + 's';
  };

  exports.pad2 = function(n) {
    return String(Math.floor(n)).padStart(2, '0');
  };

  exports.slug = function(s) {
    return (s || 'acta').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  exports.esc = function(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  exports.formatSecondsToTS = function(s) {
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = Math.floor(s % 60);
    return exports.pad2(h) + ':' + exports.pad2(m) + ':' + exports.pad2(sec);
  };

  var _tt;
  exports.toast = function(msg, isErr) {
    var toastEl = document.getElementById('toast');
    var toastMsgEl = document.getElementById('toast-message');
    var toastIconEl = document.getElementById('toast-icon');
    if (!toastEl || !toastMsgEl) return;
    toastMsgEl.textContent = msg;
    toastEl.style.borderColor = isErr ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 211, 165, 0.35)';
    if (toastIconEl) toastIconEl.style.color = isErr ? 'var(--error)' : 'var(--success)';
    toastEl.classList.add('show');
    clearTimeout(_tt);
    _tt = setTimeout(function() { toastEl.classList.remove('show'); }, 3500);
  };

  exports.setConvertLoading = function(on, msg, vttRaw) {
    var convertBtn = document.getElementById('convert-btn');
    if (!convertBtn) return;
    if (on) {
      convertBtn.disabled = true;
      convertBtn.innerHTML = '<span class="spinner"></span> ' + (msg || 'Procesando...');
    } else {
      convertBtn.disabled = !vttRaw;
      convertBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="none"><path d="M4 4l6 6-6 6M10 10h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Generar Acta';
    }
  };

  exports.switchTab = function(tab) {
    var tabPreview = document.getElementById('tab-preview');
    var tabRaw = document.getElementById('tab-raw');
    var docPreview = document.getElementById('doc-preview');
    var rawContainer = document.getElementById('raw-text-container');
    if (!tabPreview || !tabRaw || !docPreview || !rawContainer) return;
    if (tab === 'preview') {
      tabPreview.classList.add('active'); tabRaw.classList.remove('active');
      docPreview.classList.remove('hidden'); rawContainer.classList.add('hidden');
    } else {
      tabRaw.classList.add('active'); tabPreview.classList.remove('active');
      rawContainer.classList.remove('hidden'); docPreview.classList.add('hidden');
    }
  };

  exports.updateProgress = function(show, status, percent, eta, part) {
    var container = document.getElementById('progress-container');
    if (!container) return;
    if (!show) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    
    var elStatus  = document.getElementById('progress-status');
    var elPercent = document.getElementById('progress-percent');
    var elFill    = document.getElementById('progress-bar-fill');
    var elEta     = document.getElementById('progress-eta');
    var elPart    = document.getElementById('progress-part');
    
    if (elStatus)  elStatus.textContent  = status;
    if (elPercent) elPercent.textContent = percent + '%';
    if (elFill)    elFill.style.width    = percent + '%';
    if (elEta)     elEta.textContent     = eta;
    if (elPart)    elPart.textContent    = part;
  };

  exports.normalizeName = function(s) {
    if (!s) return '';
    return s.toLowerCase()
      .replace(/[áäà]/g, 'a')
      .replace(/[éëè]/g, 'e')
      .replace(/[íïì]/g, 'i')
      .replace(/[óöò]/g, 'o')
      .replace(/[úüù]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/^(dr|dra|lic|ing|mtro|mtra|doctor|doctora|licenciado|licenciada|maestro|maestra|ingeniero|ingeniera)\.?\s+/g, '')
      .replace(/\s*\(.*?\)/g, '')
      .trim();
  };

  exports.isSimilarName = function(shortNorm, longNorm) {
    if (shortNorm === longNorm) return true;
    var shortWords = shortNorm.split(/\s+/).filter(function(w){ return w.length > 2; });
    if (shortWords.length === 0) return false;
    var allWordsMatch = true;
    for (var i = 0; i < shortWords.length; i++) {
      if (longNorm.indexOf(shortWords[i]) === -1) {
        allWordsMatch = false;
        break;
      }
    }
    return allWordsMatch;
  };

  exports.cleanAttendees = function(list) {
    if (!list) return [];
    var blacklistedPatterns = [
      /^(el|la)\s+secretario(?! [a-z\u00e0-\u00fa\u00f1])/i,
      /^(el|la)\s+presidente(?! [a-z\u00e0-\u00fa\u00f1])/i,
      /^(el|la)\s+moderador/i,
      /^(el|la)\s+abogado/i,
      /^(el|la)\s+director/i,
      /^(el\s+)?doctor$/i,
      /^(la\s+)?doctora$/i,
      /^(el\s+)?maestro$/i,
      /^(la\s+)?maestra$/i,
      /^(el\s+)?licenciado$/i,
      /^(la\s+)?licenciada$/i,
      /^(el\s+)?ingeniero$/i,
      /^(la\s+)?ingeniera$/i,
      /^rector/i,
      /^decano/i,
      /^secretario academico$/i,
      /^secretario acad\u00e9mico$/i,
      /^presidente del consejo$/i,
      /^abogado de la universidad$/i
    ];
    var cleaned = [];
    list.forEach(function(item) {
      if (!item) return;
      var trimmed = item.trim();
      var isBlacklisted = false;
      for (var i = 0; i < blacklistedPatterns.length; i++) {
        if (blacklistedPatterns[i].test(trimmed)) {
          isBlacklisted = true;
          break;
        }
      }
      if (isBlacklisted) return;
      if (trimmed.length < 4) return;
      cleaned.push(trimmed);
    });

    cleaned.sort(function(a, b) { return b.length - a.length; });
    var finalResult = [];
    cleaned.forEach(function(name) {
      var normName = exports.normalizeName(name);
      var isSubname = false;
      for (var j = 0; j < finalResult.length; j++) {
        var existingNorm = exports.normalizeName(finalResult[j]);
        if (exports.isSimilarName(normName, existingNorm)) {
          isSubname = true;
          break;
        }
      }
      if (!isSubname) {
        finalResult.push(name);
      }
    });
    return finalResult.sort();
  };

})(window.VTT_ACTAS = window.VTT_ACTAS || {});
