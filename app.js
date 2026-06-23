/**
 * VTT Actas — app.js (Controlador Principal)
 * Coordinación de eventos del DOM, carga múltiple de archivos y persistencia.
 */

document.addEventListener('DOMContentLoaded', function () {
  var V = window.VTT_ACTAS;
  if (!V) {
    console.error('El espacio de nombres VTT_ACTAS no está disponible.');
    return;
  }  /* Expose reRenderCurrentState on namespace for storage.js */
  V.reRenderCurrentState = reRenderCurrentState;

  /* Aliases to modular functions in V */
  var toast             = V.toast;
  var switchTab         = V.switchTab;
  var updateProgress    = V.updateProgress;
  var setConvertLoading = function(on, msg) { V.setConvertLoading(on, msg, S.vttRaw); };
  var fmtBytes          = V.fmtBytes;
  var fmtDurLabel       = V.fmtDurLabel;
  var pad2              = V.pad2;
  var slug              = V.slug;
  var esc               = V.esc;
  var formatSecondsToTS = V.formatSecondsToTS;
  var blobDL            = V.blobDL;
  var printPDF          = function() { V.printPDF(S, opts); };
  var saveFormData      = V.saveFormData;
  var saveState         = function() { V.saveState(S); };
  var restoreSession    = function() { V.restoreSession(S, renderOutput); };
  var cleanAttendees    = V.cleanAttendees;
  var normalizeName     = V.normalizeName;
  var isSimilarName     = V.isSimilarName;

  /* ═══════════════════════════════════════
     STATE
  ═══════════════════════════════════════ */
  var S = {
    file:       null, // Mantenido para compatibilidad
    files:      [],   // Múltiples archivos cargados
    vttParts:   [],   // Contenido crudo de cada parte
    vttRaw:     '',   // Concatenación de todas las partes
    cues:       [],   // Cues combinados y desfasados cronológicamente
    sections:   [],
    attendees:  [],
    agreements: [],
    aiUsed:     false,
    plainText:  '',
    htmlDoc:    ''
  };

  /* ═══════════════════════════════════════
     DOM ELEMENTS
  ═══════════════════════════════════════ */
  function e(id) { return document.getElementById(id); }

  var pickBtn      = e('pick-file-btn');
  var fileInput    = e('file-input');
  var dropZone     = e('drop-zone');
  var fileInfoCard = e('file-info-card');
  var fileNameDisp = e('file-name-display');
  var fileSizeDisp = e('file-size-display');
  var fileStatusTx = e('file-status-text');
  var removeBtn    = e('remove-file-btn');
  var convertBtn   = e('convert-btn');
  var outputSec    = e('output-section');
  var docPreview   = e('doc-preview');
  var rawContainer = e('raw-text-container');
  var rawArea      = e('raw-text-area');
  var tabPreview   = e('tab-preview');
  var tabRaw       = e('tab-raw');
  var copyBtn      = e('copy-btn');
  var dlTxtBtn     = e('download-txt-btn');
  var dlDocBtn     = e('download-doc-btn');
  var dlPdfBtn     = e('download-pdf-btn');
  var newFileBtn   = e('new-file-btn');
  var statWords    = e('stat-words');
  var statSegs     = e('stat-segments');
  var statDur      = e('stat-duration');

  var apiKeyInput  = e('api-key-input');
  var apiKeySave   = e('api-key-save');
  var apiKeyToggle = e('api-key-toggle');
  var aiEnabled    = e('ai-enabled');
  var apiStatus    = e('api-status');

  /* Defaults */
  var today = new Date();
  e('doc-date').value = today.toISOString().split('T')[0];
  e('doc-time').value = pad2(today.getHours()) + ':' + pad2(today.getMinutes());

  /* Restore saved API key */
  var savedKey = localStorage.getItem('vtt_gemini_key') || '';
  if (savedKey) {
    apiKeyInput.value = savedKey;
    setApiStatus('saved', '✓ Clave guardada');
    aiEnabled.checked = true;
  }




  /* ═══════════════════════════════════════
     API KEY UI
  ═══════════════════════════════════════ */
  apiKeyToggle.addEventListener('click', function () {
    apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyToggle.innerHTML = apiKeyInput.type === 'password'
      ? '<svg viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.8"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="none"><path d="M3 3l14 14M12.5 12.5A3 3 0 017.5 7.5M2 10s1.5-3 4-4.5M10 4c5 0 8 6 8 6s-1 2-3 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  });

  apiKeySave.addEventListener('click', function () {
    var key = apiKeyInput.value.trim();
    if (!key) { setApiStatus('error', '⚠ Ingresa una clave válida'); return; }
    if (!key.startsWith('AIza') && !key.startsWith('AQ.')) { setApiStatus('error', '⚠ Clave inválida — debe iniciar con AIza o AQ.'); return; }
    localStorage.setItem('vtt_gemini_key', key);
    setApiStatus('saved', '✓ Clave guardada localmente');
    aiEnabled.checked = true;
    toast('Clave API guardada en tu navegador');
  });

  function setApiStatus(type, msg) {
    apiStatus.textContent = msg;
    apiStatus.className   = 'api-status ' + type;
  }

  /* ═══════════════════════════════════════
     FILE EVENTS
  ═══════════════════════════════════════ */
  pickBtn.addEventListener('click', function (ev) { ev.stopPropagation(); fileInput.value = ''; fileInput.click(); });
  fileInput.addEventListener('change', function () { if (fileInput.files && fileInput.files.length > 0) loadFiles(fileInput.files); });

  dropZone.addEventListener('dragover',  function (ev) { ev.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', function ()  { dropZone.classList.remove('drag-over'); });
  dropZone.addEventListener('drop', function (ev) {
    ev.preventDefault(); dropZone.classList.remove('drag-over');
    if (ev.dataTransfer.files && ev.dataTransfer.files.length > 0) loadFiles(ev.dataTransfer.files);
  });

  removeBtn.addEventListener('click', function (ev) { ev.stopPropagation(); resetFile(); });
  convertBtn.addEventListener('click', doConvert);

  tabPreview.addEventListener('click', function () { switchTab('preview'); });
  tabRaw.addEventListener('click',     function () { switchTab('raw'); });

  copyBtn.addEventListener('click', function () {
    if (!S.plainText) return;
    navigator.clipboard.writeText(S.plainText)
      .then(function () { toast('Copiado ✓'); })
      .catch(function () { rawArea.select(); document.execCommand('copy'); toast('Copiado ✓'); });
  });

  dlTxtBtn.addEventListener('click', function () {
    if (!S.plainText) return;
    blobDL(new Blob([S.plainText], { type: 'text/plain;charset=utf-8' }), slug(opts().title) + '.txt');
    toast('Descargando TXT...');
  });

  dlDocBtn.addEventListener('click', function () {
    if (!S.plainText) return;
    blobDL(new Blob([V.buildRTF(S.sections, opts(), S.attendees, S.agreements, S.aiUsed)], { type: 'application/msword' }), slug(opts().title) + '.doc');
    toast('Descargando Word...');
  });

  dlPdfBtn.addEventListener('click', function () { if (S.htmlDoc) printPDF(); });
  newFileBtn.addEventListener('click', function () { resetFile(); dropZone.scrollIntoView({ behavior: 'smooth', block: 'center' }); });

  /* ═══════════════════════════════════════
     FILE LOAD & RESET
  ═══════════════════════════════════════ */
  function loadFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    // Filtrar y ordenar alfabéticamente (por nombre de archivo)
    var filesArray = Array.from(fileList).filter(function (f) {
      var name = f.name.toLowerCase();
      return name.endsWith('.vtt') || name.endsWith('.srt') || name.endsWith('.txt');
    });

    if (filesArray.length === 0) {
      toast('Por favor selecciona archivos con extensión .vtt, .srt o .txt', true);
      return;
    }

    filesArray.sort(function (a, b) {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    S.files = filesArray;
    S.vttParts = [];
    S.cues = [];
    S.vttRaw = '';
    S.file = { name: filesArray.length === 1 ? filesArray[0].name : filesArray.length + ' archivos cargados' };

    // Actualizar UI
    var totalSize = filesArray.reduce(function (acc, f) { return acc + f.size; }, 0);
    fileNameDisp.textContent = S.file.name;
    fileSizeDisp.textContent = fmtBytes(totalSize);
    fileStatusTx.textContent = 'Leyendo archivos...';
    fileInfoCard.classList.remove('hidden');
    convertBtn.disabled = true;

    // Renderizar lista en UI
    var fileListItems = e('file-list-items');
    fileListItems.innerHTML = '';
    filesArray.forEach(function (file) {
      var item = document.createElement('div');
      item.className = 'file-list-item';
      item.innerHTML = 
        '<div class="file-list-item-left">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>' +
          '<span class="file-list-item-name">' + esc(file.name) + '</span>' +
        '</div>' +
        '<span class="file-list-item-size">' + fmtBytes(file.size) + '</span>';
      fileListItems.appendChild(item);
    });

    // Leer archivos en paralelo
    var loadedCount = 0;
    var rawParts = new Array(filesArray.length);

    filesArray.forEach(function (file, index) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        rawParts[index] = { name: file.name, size: file.size, content: ev.target.result };
        loadedCount++;

        if (loadedCount === filesArray.length) {
          S.vttParts = rawParts;
          mergePartsAndCues();
          fileStatusTx.textContent = 'Listo para generar';
          convertBtn.disabled = false;
          toast('✓ ' + filesArray.length + ' archivos cargados');
          saveState();
        }
      };
      reader.onerror = function () {
        toast('Error al leer el archivo: ' + file.name, true);
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function mergePartsAndCues() {
    var mergedCues = [];
    var totalOffsetSec = 0;
    var concatenatedRawText = '';

    S.vttParts.forEach(function (part, partIndex) {
      concatenatedRawText += '\n=== PARTE ' + (partIndex + 1) + ': ' + part.name + ' ===\n' + part.content;

      var partCues = V.parseVTT(part.content);
      if (partCues.length > 0) {
        var partMaxEndSec = partCues[partCues.length - 1].es;

        partCues.forEach(function (cue) {
          var clonedCue = Object.assign({}, cue);
          clonedCue.ss += totalOffsetSec;
          clonedCue.es += totalOffsetSec;
          clonedCue.start = formatSecondsToTS(clonedCue.ss);
          clonedCue.end = formatSecondsToTS(clonedCue.es);
          mergedCues.push(clonedCue);
        });

        // Sumar duración del segmento actual al offset acumulado
        totalOffsetSec += partMaxEndSec;
      }
    });

    S.cues = mergedCues;
    S.vttRaw = concatenatedRawText;
  }

  function resetFile() {
    S = { file:null, files:[], vttParts:[], cues:[], sections:[], attendees:[], agreements:[], aiUsed:false, plainText:'', htmlDoc:'' };
    fileInput.value = '';
    e('file-list-items').innerHTML = '';
    fileInfoCard.classList.add('hidden');
    outputSec.classList.add('hidden');
    convertBtn.disabled = true;
    localStorage.removeItem('vtt_actas_last_state');
  }

  /* ═══════════════════════════════════════
     OPTS
  ═══════════════════════════════════════ */
  function opts() {
    return {
      style:      (document.querySelector('input[name="doc-style"]:checked') || {}).value || 'formal',
      timestamps: e('opt-timestamps').checked,
      dedup:      e('opt-dedup').checked,
      header:     e('opt-header').checked,
      agreements: e('opt-agreements').checked,
      signatures: e('opt-signatures').checked,
      title:      e('doc-title').value.trim()    || 'ACTA DE REUNIÓN',
      date:       e('doc-date').value,
      time:       e('doc-time').value,
      location:   e('doc-location').value.trim(),
      org:        e('doc-org').value.trim(),
      useAI:      aiEnabled.checked && !!(localStorage.getItem('vtt_gemini_key')),
      hdrLeft:    e('opt-hdr-left').value.trim(),
      hdrRight:   e('opt-hdr-right').value.trim(),
      ftrLeft:    e('opt-ftr-left').value.trim(),
      pageNum:    e('opt-page-num').checked,
      pageStyle:  e('opt-page-style').value,
      corrections: e('opt-corrections').value,
      model:      e('opt-ai-model').value,
      aiInstructions: e('opt-ai-instructions').value.trim(),
      aiForceFull: e('opt-ai-force-full').checked
    };
  }

  /* ═══════════════════════════════════════
     MAIN CONVERT & PATHS
  ═══════════════════════════════════════ */
  function applyLocalCorrections(cues, correctionsStr) {
    if (!correctionsStr || !correctionsStr.trim()) return cues;
    var rules = [];
    var lines = correctionsStr.split('\n');
    lines.forEach(function(line) {
      if (!line.trim()) return;
      var parts = line.split('->');
      if (parts.length === 2) {
        var findVal = parts[0].trim();
        var replaceVal = parts[1].trim();
        if (findVal) {
          rules.push({
            regex: new RegExp(findVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'),
            replaceVal: replaceVal
          });
        }
      }
    });
    if (rules.length === 0) return cues;
    return cues.map(function(cue) {
      var clonedCue = Object.assign({}, cue);
      rules.forEach(function(rule) {
        if (clonedCue.text) {
          clonedCue.text = clonedCue.text.replace(rule.regex, rule.replaceVal);
        }
        if (clonedCue.speaker) {
          clonedCue.speaker = clonedCue.speaker.replace(rule.regex, rule.replaceVal);
        }
      });
      return clonedCue;
    });
  }

  async function doConvert() {
    if (!S.vttRaw) { toast('El archivo no ha terminado de cargarse.', true); return; }
    var o = opts();

    setConvertLoading(true, o.useAI ? 'Consultando Gemini AI...' : 'Procesando...');

    try {
      // Aplicar el corrector de términos en local (sobre una copia temporal de cues)
      var correctedCues = applyLocalCorrections(S.cues, o.corrections);

      // Usar cues ya procesados, combinados y desfasados en mergePartsAndCues()
      var processed = o.dedup ? V.dedup(correctedCues) : correctedCues;

      if (o.useAI) {
        if (S.aiUsed && S.sections.length > 0) {
          S.plainText = V.buildPlain(S.sections, o, S.attendees, S.agreements);
          S.htmlDoc   = V.buildHTML(S.sections, o, S.attendees, S.agreements, true);
          renderOutput(true);
          toast('✨ Vista actualizada (usando respuesta de IA anterior)');
          return;
        }
        await runWithAI(processed, o);
      } else {
        runLocal(processed, o, true);
      }

    } catch (err) {
      console.error(err);
      toast('Error: ' + err.message, true);
    } finally {
      setConvertLoading(false);
      updateProgress(false);
    }
  }

  function updateProgress(show, status, percent, eta, part) {
    var container = e('progress-container');
    if (!container) return;
    if (!show) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    
    var elStatus  = e('progress-status');
    var elPercent = e('progress-percent');
    var elFill    = e('progress-bar-fill');
    var elEta     = e('progress-eta');
    var elPart    = e('progress-part');
    
    if (elStatus)  elStatus.textContent  = status;
    if (elPercent) elPercent.textContent = percent + '%';
    if (elFill)    elFill.style.width    = percent + '%';
    if (elEta)     elEta.textContent     = eta;
    if (elPart)    elPart.textContent    = part;
  }

  // Lógica de asistentes movida a js/utils.js

  async function runWithAI(cues, o) {
    var chunkDurationSec = 45 * 60; // 45 minutos por defecto
    if (o && (o.aiForceFull || o.style === 'verbatim')) {
      chunkDurationSec = 30 * 60; // 30 minutos para forzar transcripción íntegra (evita rebasar salida de tokens)
    } else if (o && (o.style === 'formal' || o.style === 'minuta')) {
      chunkDurationSec = 120 * 60; // 120 minutos para resumen coherente de toda la sesión
    }
    var totalDurationSec = cues.length ? (cues[cues.length - 1].es - cues[0].ss) : 0;
    
    var chunks = [];
    if (totalDurationSec <= chunkDurationSec || cues.length === 0) {
      chunks.push(cues);
    } else {
      var currentChunk = [];
      var chunkStartTime = cues[0].ss;
      
      for (var i = 0; i < cues.length; i++) {
        var cue = cues[i];
        if (cue.ss - chunkStartTime > chunkDurationSec && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          chunkStartTime = cue.ss;
        }
        currentChunk.push(cue);
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
    }

    var mergedResult = {
      titulo_detectado: '',
      asistentes: [],
      secciones: [],
      acuerdos: []
    };

    var totalChunks = chunks.length;
    for (var i = 0; i < totalChunks; i++) {
      var chunkCues = chunks[i];
      var partNum = i + 1;
      
      var startPct = Math.round((i / totalChunks) * 100);
      var estSeconds = (totalChunks - i) * 15; // Estimamos 15s por parte
      
      updateProgress(
        true,
        'Procesando parte ' + partNum + ' de ' + totalChunks + '...',
        startPct,
        'Tiempo restante: ~' + estSeconds + ' segundos',
        'Parte ' + partNum + ' de ' + totalChunks
      );

      setConvertLoading(true, '✨ Procesando parte ' + partNum + '/' + totalChunks + '...');

      var chunkOpts = Object.assign({}, o, { partIndex: i, totalParts: totalChunks });
      var chunkResult;
      var maxRetries = 4;
      var attempt = 0;
      var backoffMs = 3000; // Empezar con 3 segundos para dar tiempo al servidor a recuperarse

      while (attempt < maxRetries) {
        try {
          chunkResult = await V.callGemini(chunkCues, chunkOpts);
          break; // Éxito: salir del bucle de reintentos
        } catch (err) {
          attempt++;
          var errMsg = err.message || '';
          var isRetriable = errMsg.toLowerCase().indexOf('high demand') !== -1 ||
                            errMsg.toLowerCase().indexOf('429') !== -1 ||
                            errMsg.toLowerCase().indexOf('503') !== -1 ||
                            errMsg.toLowerCase().indexOf('quota') !== -1 ||
                            errMsg.toLowerCase().indexOf('resource exhausted') !== -1 ||
                            errMsg.toLowerCase().indexOf('fetch') !== -1 ||
                            errMsg.toLowerCase().indexOf('network') !== -1 ||
                            errMsg.toLowerCase().indexOf('failed') !== -1;

          if (attempt < maxRetries && isRetriable) {
            console.warn('Gemini falló (intento ' + attempt + ' de ' + maxRetries + '). Reintentando en ' + (backoffMs / 1000) + 's...', err);
            
            updateProgress(
              true,
              '⚠️ Servidor saturado. Reintentando parte ' + partNum + ' en ' + (backoffMs / 1000) + 's... (Intento ' + attempt + '/' + (maxRetries - 1) + ')',
              startPct,
              'Esperando reintento...',
              'Parte ' + partNum + ' de ' + totalChunks
            );
            
            setConvertLoading(true, '⚠️ Reintentando parte ' + partNum + ' en ' + (backoffMs / 1000) + 's...');
            
            await new Promise(function(resolve) { setTimeout(resolve, backoffMs); });
            backoffMs *= 2; // Exponencial: 3s -> 6s -> 12s
          } else {
            console.error('Gemini falló definitivamente en la parte ' + partNum + ':', err);
            throw new Error('La parte ' + partNum + ' de Gemini AI falló: ' + err.message);
          }
        }
      }

      if (i === 0 && chunkResult.titulo_detectado) {
        mergedResult.titulo_detectado = chunkResult.titulo_detectado;
      }

      var asistentes = chunkResult.asistentes || [];
      asistentes.forEach(function(ast) {
        if (ast && mergedResult.asistentes.indexOf(ast) === -1) {
          mergedResult.asistentes.push(ast);
        }
      });

      var secciones = chunkResult.secciones || [];
      secciones.forEach(function(sec) {
        if (sec) mergedResult.secciones.push(sec);
      });

      var acuerdos = chunkResult.acuerdos || [];
      acuerdos.forEach(function(ac) {
        if (ac) mergedResult.acuerdos.push(ac);
      });

      var endPct = Math.round((partNum / totalChunks) * 100);
      updateProgress(
        true,
        partNum === totalChunks ? 'Finalizando acta...' : 'Parte ' + partNum + ' completada.',
        endPct,
        partNum === totalChunks ? 'Casi listo...' : 'Tiempo restante: ~' + ((totalChunks - partNum) * 15) + ' segundos',
        'Parte ' + partNum + ' de ' + totalChunks
      );
    }

    S.aiUsed     = true;
    S.attendees  = cleanAttendees(mergedResult.asistentes);
    S.agreements = mergedResult.acuerdos.map(function(ag, idx) {
      return {
        numero: idx + 1,
        descripcion: ag.descripcion || '',
        responsable: ag.responsable || '',
        fecha_limite: ag.fecha_limite || ''
      };
    });

    if (!e('doc-title').value.trim() && mergedResult.titulo_detectado) {
      e('doc-title').value = mergedResult.titulo_detectado;
      o.title = mergedResult.titulo_detectado;
    }

    S.sections = mergedResult.secciones.map(function(sec) {
      var paras = (sec.contenido || '').split(/\n\n+/).filter(function(p){ return p.trim(); });
      return { title: sec.titulo || 'Sección', tipo: sec.tipo || 'otro', paragraphs: paras };
    });

    var totalWords = S.sections.reduce(function(a, sec) {
      return a + sec.paragraphs.join(' ').split(/\s+/).length;
    }, 0);
    statWords.textContent = totalWords.toLocaleString('es-ES');
    statSegs.textContent  = S.sections.length;
    statDur.textContent   = cues.length ? fmtDurLabel(cues[cues.length-1].es - cues[0].ss) : '—';

    S.plainText = V.buildPlain(S.sections, o, S.attendees, S.agreements);
    S.htmlDoc   = V.buildHTML(S.sections, o, S.attendees, S.agreements, true);

    renderOutput(true);
    toast('✨ Acta generada con Gemini AI — ' + S.sections.length + ' secciones');

    updateProgress(true, '✓ ¡Acta generada con éxito!', 100, 'Completado', 'Finalizado');
    await new Promise(function(resolve) { setTimeout(resolve, 1000); });
  }

  function runLocal(cues, o, shouldScroll) {
    S.aiUsed     = false;

    // Extraer asistentes únicos de los cues y limpiarlos
    var speakersMap = {};
    cues.forEach(function(cue) {
      if (cue.speaker) {
        speakersMap[cue.speaker] = true;
      }
    });
    var uniqueSpeakers = Object.keys(speakersMap);
    S.attendees  = cleanAttendees(uniqueSpeakers);

    S.agreements = [];
    S.sections   = V.buildSectionsLocal(cues);

    var words = cues.reduce(function(a,c){ return a + c.text.split(/\s+/).length; }, 0);
    statWords.textContent = words.toLocaleString('es-ES');
    statSegs.textContent  = S.sections.length;
    statDur.textContent   = cues.length ? fmtDurLabel(cues[cues.length-1].es - cues[0].ss) : '—';

    S.plainText = V.buildPlain(S.sections, o, S.attendees, []);
    S.htmlDoc   = V.buildHTML(S.sections, o, S.attendees, [], false);

    renderOutput(shouldScroll);
    if (shouldScroll !== false) {
      toast('✓ Acta generada — ' + S.sections.length + ' secciones detectadas');
    }
  }

  function renderOutput(shouldScroll) {
    docPreview.innerHTML = S.htmlDoc;
    rawArea.value = S.plainText;
    if (V.renderAnalytics) {
      V.renderAnalytics(S.cues, S.attendees);
    }
    outputSec.classList.remove('hidden');
    switchTab('preview');
    if (shouldScroll !== false) {
      outputSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    saveState();
  }

  /* ═══════════════════════════════════════
     PDF PRINT
  ═══════════════════════════════════════ */
  // Lógica de exportación de PDF movida a js/exporter.js

  /* ═══════════════════════════════════════
     PERSISTENCE & ROBUSTNESS
  ═══════════════════════════════════════ */
  function reRenderCurrentState() {
    if (!outputSec.classList.contains('hidden')) {
      var o = opts();
      if (S.aiUsed && S.sections && S.sections.length > 0) {
        S.plainText = V.buildPlain(S.sections, o, S.attendees, S.agreements);
        S.htmlDoc   = V.buildHTML(S.sections, o, S.attendees, S.agreements, true);
        renderOutput(false);
      } else if (S.cues && S.cues.length > 0) {
        runLocal(S.cues, o, false);
      }
    }
  }

  // Funciones de guardado y restauración de estado movidas a js/storage.js

  // Setup Watchers for form inputs
  var inputsToWatch = [
    'doc-title', 'doc-date', 'doc-time', 'doc-location', 'doc-org',
    'opt-timestamps', 'opt-dedup', 'opt-header', 'opt-agreements', 'opt-signatures',
    'ai-enabled', 'opt-hdr-left', 'opt-hdr-right', 'opt-ftr-left', 'opt-page-num', 'opt-page-style',
    'opt-corrections', 'opt-ai-model', 'opt-ai-instructions', 'opt-ai-force-full'
  ];
  inputsToWatch.forEach(function(id) {
    var el = e(id);
    if (el) {
      var evType = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evType, saveFormData);
    }
  });
  document.querySelectorAll('input[name="doc-style"]').forEach(function(el) {
    el.addEventListener('change', saveFormData);
  });

  // Live Editor: Sync changes from editable preview fields to state S and plainText
  docPreview.addEventListener('input', function (ev) {
    var target = ev.target;
    
    if (target.classList.contains('doc-section-title-text')) {
      var secIdx = parseInt(target.getAttribute('data-sec-idx'), 10);
      if (S.sections[secIdx]) {
        S.sections[secIdx].title = target.textContent;
      }
    }
    else if (target.classList.contains('doc-paragraph')) {
      var secIdx = parseInt(target.getAttribute('data-sec-idx'), 10);
      var pIdx = parseInt(target.getAttribute('data-p-idx'), 10);
      if (S.sections[secIdx] && S.sections[secIdx].paragraphs) {
        S.sections[secIdx].paragraphs[pIdx] = target.textContent;
      }
    }
    else if (target.classList.contains('attendee-item-edit')) {
      var attIdx = parseInt(target.getAttribute('data-att-idx'), 10);
      if (S.attendees) {
        S.attendees[attIdx] = target.textContent;
      }
    }
    else if (target.classList.contains('ag-desc-edit')) {
      var agIdx = parseInt(target.getAttribute('data-ag-idx'), 10);
      if (S.agreements[agIdx]) {
        S.agreements[agIdx].descripcion = target.textContent;
      }
    }
    else if (target.classList.contains('ag-resp-edit')) {
      var agIdx = parseInt(target.getAttribute('data-ag-idx'), 10);
      if (S.agreements[agIdx]) {
        var val = target.textContent.trim();
        S.agreements[agIdx].responsable = (val === '—' || val === '') ? '' : val;
        if (S.agreements[agIdx].responsable) target.classList.remove('td-blank');
        else target.classList.add('td-blank');
      }
    }
    else if (target.classList.contains('ag-date-edit')) {
      var agIdx = parseInt(target.getAttribute('data-ag-idx'), 10);
      if (S.agreements[agIdx]) {
        var val = target.textContent.trim();
        S.agreements[agIdx].fecha_limite = (val === '—' || val === '') ? '' : val;
        if (S.agreements[agIdx].fecha_limite) target.classList.remove('td-blank');
        else target.classList.add('td-blank');
      }
    }

    // Recalcular el texto plano sin perder foco
    S.plainText = V.buildPlain(S.sections, opts(), S.attendees, S.agreements);
    if (rawArea) rawArea.value = S.plainText;
    if (V.renderAnalytics) {
      V.renderAnalytics(S.cues, S.attendees);
    }
    saveState();
  });

  // Sync edits from raw text area to state
  rawArea.addEventListener('input', function () {
    S.plainText = rawArea.value;
    saveState();
  });

  window.addEventListener('beforeunload', function (ev) {
    if (S.file || (S.files && S.files.length > 0) || S.plainText) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  });

  /* Lógica de helpers y formateadores generales movida a js/utils.js */

  // Run restoreSession initially
  restoreSession();

}); // DOMContentLoaded
