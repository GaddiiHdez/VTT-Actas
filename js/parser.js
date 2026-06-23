(function(exports) {
  'use strict';

  /* ═══════════════════════════════════════
     VTT PARSER
  ═══════════════════════════════════════ */
  exports.parseVTT = function(raw) {
    var lines = raw.split(/\r?\n/), cues = [], i = 0;
    while (i < lines.length && !lines[i].startsWith('WEBVTT')) i++;
    i++;
    while (i < lines.length && /^[A-Za-z]+:/.test(lines[i].trim())) i++;
    while (i < lines.length) {
      while (i < lines.length && lines[i].trim() === '') i++;
      if (i >= lines.length) break;
      if (!isTS(lines[i].trim())) { i++; continue; }
      var ts = parseTimes(lines[i].trim()); i++;
      var pay = [];
      while (i < lines.length && lines[i].trim() !== '') { pay.push(lines[i].trim()); i++; }
      var raw2 = pay.join(' ');
      var spk = extractSpk(raw2);
      var txt = strip(spk.text).trim();
      if (txt) cues.push({ start:ts.s, end:ts.e, ss:ts.ss, es:ts.es, speaker:spk.sp, text:txt });
    }
    return cues;
  };

  function isTS(l) { return /\d+:\d{2}[.:]\d{3}\s*-->\s*\d+:\d{2}/.test(l); }

  function parseTimes(l) {
    var p = l.split('-->');
    var s = normTS(p[0].trim()), e2 = normTS(p[1].trim().split(' ')[0]);
    return { s:s.lbl, e:e2.lbl, ss:s.sec, es:e2.sec };
  }

  function normTS(t) {
    t = t.split(' ')[0].replace(',','.').replace(/\.(\d{3})$/,'');
    var p = t.split(':').map(Number);
    var sec, lbl;
    if (p.length===3){ sec=p[0]*3600+p[1]*60+p[2]; lbl=pad2(p[0])+':'+pad2(p[1])+':'+pad2(p[2]); }
    else { sec=p[0]*60+p[1]; lbl='00:'+pad2(p[0])+':'+pad2(p[1]); }
    return { sec:sec, lbl:lbl };
  }

  function extractSpk(t) {
    var v = t.match(/<v\s+([^>]+)>([\s\S]*?)(?:<\/v>|$)/i);
    if (v) return { sp:v[1].trim(), text:v[2] };
    var c = t.match(/^([A-Za-zÀ-ÿ][^\d:\n]{1,39}):\s+(.+)/s);
    if (c) return { sp:c[1].trim(), text:c[2] };
    return { sp:null, text:t };
  }

  function strip(s) {
    return s.replace(/<[^>]+>/g,'')
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
  }

  /* ═══════════════════════════════════════
     DEDUPLICATION
  ═══════════════════════════════════════ */
  exports.dedup = function(cues) {
    if (!cues.length) return cues;
    var out = [clone(cues[0])];
    for (var i = 1; i < cues.length; i++) {
      var cur = cues[i], prev = out[out.length-1];
      var cn = norm(cur.text), pn = norm(prev.text);
      if (pn === cn) continue;
      if (pn.includes(cn)) continue;
      var ov = suffixOverlap(pn, cn);
      if (ov > 12) {
        var tail = cur.text.substring(Math.floor(cur.text.length * ov / cn.length)).trim();
        if (tail) { prev.text += ' ' + tail; prev.end = cur.end; prev.es = cur.es; }
        continue;
      }
      out.push(clone(cur));
    }
    return out;
  };

  function clone(c) { return Object.assign({}, c); }
  function norm(t)  { return t.toLowerCase().replace(/\s+/g,' ').trim(); }
  function suffixOverlap(a, b) {
    var max = Math.min(a.length, b.length, 90);
    for (var n = max; n > 10; n--) { if (a.endsWith(b.slice(0,n))) return n; }
    return 0;
  }

  /* ═══════════════════════════════════════
     LOCAL STRUCTURING (fallback)
  ═══════════════════════════════════════ */
  exports.buildSectionsLocal = function(cues) {
    var MARKERS = [
      { rx:/pase\s+de\s+lista|asistencia|qu[oó]rum|verificaci[oó]n/i,        title:'Verificación de Quórum y Pase de Lista' },
      { rx:/orden\s+del\s+d[ií]a/i,                                           title:'Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:uno|1[°º]?|primero)/i,              title:'Punto 1 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:dos|2[°º]?|segundo)/i,              title:'Punto 2 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:tres|3[°º]?|tercero)/i,             title:'Punto 3 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:cuatro|4[°º]?|cuarto)/i,            title:'Punto 4 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:cinco|5[°º]?|quinto)/i,             title:'Punto 5 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:seis|6[°º]?|sexto)/i,               title:'Punto 6 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:siete|7[°º]?|s[eé]ptimo)/i,        title:'Punto 7 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:ocho|8[°º]?|octavo)/i,              title:'Punto 8 del Orden del Día' },
      { rx:/punto\s+(?:n[uú]mero\s+)?(?:nueve|9[°º]?|noveno)/i,             title:'Punto 9 del Orden del Día' },
      { rx:/asuntos\s+generales/i,                                             title:'Asuntos Generales' },
      { rx:/clausura|levanta\s+la\s+sesi[oó]n|sesi[oó]n\s+conclu/i,         title:'Clausura de la Sesión' },
    ];

    var result = [];
    var secTitle = 'Apertura de la Sesión';
    var secParagraphs = [];
    var currentSpeaker = null;
    var currentSpeakerText = [];
    var used = {};

    cues.forEach(function(cue) {
      // 1. Detectar si hay un marcador de sección en este cue
      var match = null;
      MARKERS.forEach(function(m) {
        if (!match && m.rx.test(cue.text) && !used[m.title]) match = m;
      });

      if (match) {
        // Guardar el diálogo acumulado del orador anterior antes de cambiar de sección
        if (currentSpeakerText.length > 0) {
          var prefix = currentSpeaker ? currentSpeaker + ': ' : '';
          secParagraphs.push(prefix + currentSpeakerText.join(' '));
          currentSpeakerText = [];
        }
        
        // Guardar la sección anterior
        if (secParagraphs.length > 0) {
          result.push({ title: secTitle, tipo: 'otro', paragraphs: secParagraphs });
          secParagraphs = [];
        }

        secTitle = match.title;
        used[match.title] = true;
        currentSpeaker = cue.speaker;
      }

      // 2. Si cambia de orador dentro de la misma sección o si supera los 800 caracteres
      var textLen = currentSpeakerText.join(' ').length;
      if (cue.speaker !== currentSpeaker || (currentSpeaker === null && textLen > 800)) {
        if (currentSpeakerText.length > 0) {
          var prefix = currentSpeaker ? currentSpeaker + ': ' : '';
          secParagraphs.push(prefix + currentSpeakerText.join(' '));
        }
        currentSpeaker = cue.speaker;
        currentSpeakerText = [cue.text];
      } else {
        currentSpeakerText.push(cue.text);
      }
    });

    // Guardar el último orador
    if (currentSpeakerText.length > 0) {
      var prefix = currentSpeaker ? currentSpeaker + ': ' : '';
      secParagraphs.push(prefix + currentSpeakerText.join(' '));
    }
    
    // Guardar la última sección
    if (secParagraphs.length > 0) {
      result.push({ title: secTitle, tipo: 'otro', paragraphs: secParagraphs });
    }

    return result.length ? result : [{ title: 'Transcripción', tipo: 'otro', paragraphs: ['(Sin contenido)'] }];
  };

  function splitSentences(text) {
    var t = text
      .replace(/\b(Dr|Dra|Lic|Mtra?|Ing|Prof|Sr|Sra|Mtro|No|Fig|Art|Ing)\.\s/g, '$1__DOT__ ')
      .replace(/(\d+)\.\s/g, '$1__DOT__ ');
    var raw = t.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/);
    return raw.map(function(s){ return s.replace(/__DOT__/g,'.').trim(); }).filter(function(s){ return s.length > 5; });
  }

  function toParagraphs(sents) {
    var out = [], chunk = [];
    sents.forEach(function(s){ chunk.push(s); if (chunk.length >= 4){ out.push(chunk.join(' ')); chunk = []; } });
    if (chunk.length) out.push(chunk.join(' '));
    return out;
  }

  function pad2(n) { return String(Math.floor(n)).padStart(2,'0'); }

})(window.VTT_ACTAS = window.VTT_ACTAS || {});
