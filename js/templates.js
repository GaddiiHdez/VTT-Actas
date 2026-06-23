(function(exports) {
  'use strict';

  /* ═══════════════════════════════════════
     PLAIN TEXT GENERATION
  ═══════════════════════════════════════ */
  exports.buildPlain = function(sections, o, attendees, agreements) {
    var L = [], HR = '─'.repeat(68);

    if (o.header) {
      L.push(HR);
      if (o.org)   L.push(center(o.org.toUpperCase(), 68));
      L.push(center(o.title.toUpperCase(), 68));
      L.push(center('ACTA DE REUNIÓN', 68));
      L.push(HR);
      if (o.date)     L.push('  Fecha           : ' + fmtDate(o.date));
      if (o.time)     L.push('  Hora de inicio  : ' + fmtTime(o.time));
      if (o.location) L.push('  Lugar/Plataforma: ' + o.location);
      L.push(HR);
    }

    if (attendees.length) {
      L.push(''); L.push('▌ ASISTENTES');
      attendees.forEach(function(a, i){ L.push('  ' + (i+1) + '. ' + a); });
    }

    sections.forEach(function(sec) {
      L.push(''); L.push('▌ ' + sec.title.toUpperCase());
      L.push('  ' + '─'.repeat(Math.min(sec.title.length+2, 60)));
      L.push('');
      sec.paragraphs.forEach(function(p){ L.push('  ' + p); L.push(''); });
    });

    if (o.agreements) {
      L.push(''); L.push(HR); L.push(center('ACUERDOS Y COMPROMISOS', 68)); L.push(HR); L.push('');
      if (agreements.length) {
        agreements.forEach(function(ag) {
          L.push('  ' + ag.numero + '. ' + ag.descripcion);
          if (ag.responsable) L.push('     Responsable: ' + ag.responsable);
          if (ag.fecha_limite) L.push('     Fecha límite: ' + ag.fecha_limite);
          L.push('');
        });
      } else {
        L.push('  1. ___________________________________________');
        L.push('  2. ___________________________________________');
        L.push('  3. ___________________________________________');
        L.push('');
      }
    }

    if (o.signatures) {
      L.push(''); L.push(HR); L.push(center('FIRMAS DE CONFORMIDAD', 68)); L.push(HR); L.push('');
      var signers = attendees.length ? attendees.slice(0,6) : ['Nombre y cargo', 'Nombre y cargo', 'Nombre y cargo', 'Nombre y cargo'];
      for (var i = 0; i < signers.length; i += 2) {
        L.push('  ________________________________    ________________________________');
        L.push('  ' + signers[i] + (signers[i+1] ? '    ' + signers[i+1] : ''));
        L.push('');
      }
    }

    L.push(''); L.push('  ' + (exports.aiUsed ? '✨ Generado con Gemini AI · ' : '') + 'VTT Actas · ' + fmtDate(new Date().toISOString().split('T')[0]));
    return L.join('\n');
  };

  /* ═══════════════════════════════════════
     HTML PREVIEW GENERATION
  ═══════════════════════════════════════ */
  exports.buildHTML = function(sections, o, attendees, agreements, aiUsed) {
    var h = '';

    /* AI badge */
    if (aiUsed) {
      h += '<div class="ai-badge"><span class="ai-badge-icon">✨</span> Procesado con Gemini AI — errores ASR corregidos, secciones detectadas automáticamente</div>';
    }

    /* Header */
    if (o.header) {
      h += '<div class="doc-header">';
      h += '<div class="doc-header-top-bar">';
      h += '<span class="doc-header-top-left">' + esc(o.hdrLeft || o.org || '') + '</span>';
      h += '<span class="doc-header-top-right">' + esc(o.hdrRight || o.title || 'Acta de Reunión') + '</span>';
      h += '</div>';
      
      if (o.org) h += '<div class="doc-header-org">' + esc(o.org) + '</div>';
      h += '<div class="doc-header-title">' + esc(o.title) + '</div>';
      h += '<div class="doc-header-acta">Acta de Reunión</div>';
      h += '<div class="doc-meta-table">';
      if (o.date)     h += mrow('Fecha', fmtDate(o.date));
      if (o.time)     h += mrow('Hora de inicio', fmtTime(o.time));
      if (o.location) h += mrow('Lugar / Plataforma', o.location);
      h += '</div></div>';
    }

    /* Attendees */
    if (attendees.length) {
      h += '<div class="doc-section">';
      h += '<div class="doc-section-title">Asistentes</div>';
      h += '<div class="attendees-grid">';
      attendees.forEach(function(a, aIdx) {
        h += '<div class="attendee-item"><span class="attendee-dot"></span><span class="attendee-item-edit editable-field" contenteditable="true" data-att-idx="' + aIdx + '">' + esc(a) + '</span></div>';
      });
      h += '</div></div>';
    }

    /* Sections */
    sections.forEach(function(sec, idx) {
      var icon = sectionIcon(sec.tipo || 'otro');
      h += '<div class="doc-section">';
      h += '<div class="doc-section-title">' + icon + '<span class="doc-section-title-text editable-field" contenteditable="true" data-sec-idx="' + idx + '">' + esc(sec.title) + '</span></div>';
      if (o.style === 'verbatim') {
        sec.paragraphs.forEach(function(p, pIdx) {
          var htmlText = esc(p);
          var spkMatch = p.match(/^([^:]{2,50}):\s+(.+)/s);
          if (spkMatch) {
            htmlText = '<strong>' + esc(spkMatch[1]) + ':</strong> ' + esc(spkMatch[2]);
          }
          h += '<p class="doc-paragraph editable-field" style="text-indent: 0; text-align: left;" contenteditable="true" data-sec-idx="' + idx + '" data-p-idx="' + pIdx + '">' + htmlText + '</p>';
        });
      } else {
        sec.paragraphs.forEach(function(p, pIdx) {
          var htmlText = esc(p);
          var spkMatch = p.match(/^([^:]{2,50}):\s+(.+)/s);
          if (spkMatch) {
            htmlText = '<strong>' + esc(spkMatch[1]) + ':</strong> ' + esc(spkMatch[2]);
          }
          h += '<p class="doc-paragraph editable-field" contenteditable="true" data-sec-idx="' + idx + '" data-p-idx="' + pIdx + '">' + htmlText + '</p>';
        });
      }
      h += '</div>';
    });

    /* Agreements */
    if (o.agreements) {
      h += '<div class="doc-section">';
      h += '<div class="doc-section-title">' + sectionIcon('acuerdos') + 'Acuerdos y Compromisos</div>';
      if (agreements.length) {
        h += '<table class="agreements-table"><thead><tr><th>No.</th><th>Acuerdo</th><th>Responsable</th><th>Fecha límite</th></tr></thead><tbody>';
        agreements.forEach(function(ag, agIdx) {
          h += '<tr>';
          h += '<td class="td-num">' + ag.numero + '.</td>';
          h += '<td class="ag-desc-edit editable-field" contenteditable="true" data-ag-idx="' + agIdx + '">' + esc(ag.descripcion) + '</td>';
          h += '<td class="ag-resp-edit editable-field ' + (ag.responsable ? '' : 'td-blank') + '" contenteditable="true" data-ag-idx="' + agIdx + '">' + esc(ag.responsable || '—') + '</td>';
          h += '<td class="ag-date-edit editable-field ' + (ag.fecha_limite ? '' : 'td-blank') + '" contenteditable="true" data-ag-idx="' + agIdx + '">' + esc(ag.fecha_limite || '—') + '</td>';
          h += '</tr>';
        });
        h += '</tbody></table>';
        if (o.style === 'minuta') {
          h += '<div class="next-meeting-box"><span class="doc-meta-label">Próxima reunión — </span>';
          h += '<span class="placeholder-text">Fecha: ________________   Hora: ____________</span></div>';
        }
      } else {
        h += '<div class="agreements-list">';
        [1,2,3].forEach(function(n){ h += '<div class="agreement-item"><span class="ag-num">'+n+'.</span><span class="ag-line"></span></div>'; });
        h += '</div>';
      }
      h += '</div>';
    }

    /* Signatures */
    if (o.signatures) {
      var signers = attendees.length ? attendees.slice(0,6) : ['Participante','Participante','Participante','Participante'];
      h += '<div class="doc-signatures"><div class="doc-section-title">' + sectionIcon('firmas') + 'Firmas de Conformidad</div>';
      h += '<div class="doc-signatures-grid">';
      signers.forEach(function(sp) {
        h += '<div class="doc-signature-item"><div class="doc-signature-line"></div><div class="doc-signature-name">' + esc(sp) + '</div></div>';
      });
      h += '</div></div>';
    }

    /* Footer */
    h += '<div class="doc-footer">';
    h += '<span class="doc-footer-text doc-footer-left">' + esc(o.ftrLeft || 'Confidencial - Uso Interno') + '</span>';
    var pNum = '';
    if (o.pageNum) {
      if (o.pageStyle === 'pages') pNum = 'Página 1 de 1';
      else if (o.pageStyle === 'x') pNum = 'Pág. 1';
      else pNum = '1';
    }
    h += '<span class="doc-footer-text doc-footer-right">' + pNum + '</span>';
    h += '</div>';
    return h;
  };

  /* ═══════════════════════════════════════
     RTF / WORD DOCUMENT GENERATION
  ═══════════════════════════════════════ */
  exports.buildRTF = function(sections, o, attendees, agreements, aiUsed) {
    var rows = [
      '{\\rtf1\\ansi\\ansicpg1252\\deff0',
      '{\\fonttbl{\\f0 Georgia;}{\\f1 Calibri;}}',
      '{\\colortbl ;\\red27\\green54\\blue93;\\red45\\green55\\blue72;\\red113\\green128\\blue150;\\red247\\green250\\blue252;\\red226\\green232\\blue240;}',
      '\\paperw12240\\paperh15840\\margl1440\\margr1440\\margt1440\\margb1440'
    ];

    // Helpers
    function escRTF(s) {
      if (!s) return '';
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          if (s[i] === '\\') out += '\\\\';
          else if (s[i] === '{') out += '\\{';
          else if (s[i] === '}') out += '\\}';
          else out += s[i];
        } else {
          out += '\\u' + c + '?';
        }
      }
      return out;
    }

    // Custom Headers & Footers
    if (o.header) {
      var hLeft = o.hdrLeft || o.org || '';
      var hRight = o.hdrRight || o.title || 'Acta de Reunión';
      rows.push('{\\header \\pard\\tqr\\tx9360\\f1\\fs16\\cf3 ' + escRTF(hLeft) + '\\tab ' + escRTF(hRight) + '\\par}');
    }
    
    // Footers
    var fLeft = o.ftrLeft || 'Confidencial - Uso Interno';
    var fRight = '';
    if (o.pageNum) {
      if (o.pageStyle === 'pages') {
        fRight = 'P\\u225?gina {\\field{\\*\\fldinst PAGE}} de {\\field{\\*\\fldinst NUMPAGES}}';
      } else if (o.pageStyle === 'x') {
        fRight = 'P\\u225?g. {\\field{\\*\\fldinst PAGE}}';
      } else {
        fRight = '{\\field{\\*\\fldinst PAGE}}';
      }
    }
    rows.push('{\\footer \\pard\\tqr\\tx9360\\f1\\fs16\\cf3 ' + escRTF(fLeft) + '\\tab ' + fRight + '\\par}');

    // Organization (small tracked top header)
    if (o.header && o.org) {
      rows.push('\\pard\\ql\\sb120\\sa40\\f1\\b\\fs17\\cf3 ' + escRTF(o.org.toUpperCase()) + '\\par');
    }

    // Title Section
    rows.push('\\pard\\ql\\sb60\\sa100\\f0\\b\\fs40\\cf1 ' + escRTF(o.title) + '\\par');
    rows.push('\\pard\\ql\\sa240\\f1\\b\\fs18\\cf3 ACTA DE REUNIÓN\\par');

    // Header Table (Metadata Callout Box)
    if (o.header) {
      rows.push('\\trowd\\trgaph108\\trleft0');
      rows.push('\\clbrdrl\\brdrs\\brdrw30\\cf1\\clbrdrt\\brdrs\\brdrw5\\cf5\\clbrdrb\\brdrs\\brdrw5\\cf5\\clcbpat4\\cellx4680');
      rows.push('\\clbrdrr\\brdrs\\brdrw5\\cf5\\clbrdrt\\brdrs\\brdrw5\\cf5\\clbrdrb\\brdrs\\brdrw5\\cf5\\clcbpat4\\cellx9360');
      
      var c1 = [];
      if (o.org) c1.push('{\\b Organizaci\\u243?n:} ' + escRTF(o.org));
      if (o.date) c1.push('{\\b Fecha:} ' + escRTF(fmtDate(o.date)));
      rows.push('\\pard\\intbl\\ql\\sl240\\slmult1\\sb40\\sa40\\f1\\fs18\\cf2 ' + (c1.join('\\line ') || ' ') + '\\cell');
      
      var c2 = [];
      if (o.time) c2.push('{\\b Hora de inicio:} ' + escRTF(fmtTime(o.time)));
      if (o.location) c2.push('{\\b Lugar/Plataforma:} ' + escRTF(o.location));
      rows.push('\\pard\\intbl\\ql\\sl240\\slmult1\\sb40\\sa40\\f1\\fs18\\cf2 ' + (c2.join('\\line ') || ' ') + '\\cell');
      
      rows.push('\\row');
      rows.push('\\pard\\fs12\\par');
    }

    // AI Badge indicator in document if applicable
    if (aiUsed) {
      rows.push('\\pard\\qj\\sb120\\sa120\\f1\\fs18\\cf1\\highlight4 [Nota: Este documento fue estructurado y corregido asistido por Inteligencia Artificial Gemini]\\par\\par');
    }

    // Attendees Section
    if (attendees && attendees.length > 0) {
      rows.push('\\pard\\sb240\\sa100\\f0\\b\\fs24\\cf1\\brdrb\\brdrs\\brdrw15\\brsp120\\cf1 ASISTENTES\\par');
      attendees.forEach(function(att) {
        rows.push('\\pard\\li360\\fi-360\\sb30\\sa30\\f1\\fs21\\cf2 \\bullet\\tab ' + escRTF(att) + '\\par');
      });
      rows.push('\\pard\\fs12\\par');
    }

    // Sections
    if (sections && sections.length > 0) {
      sections.forEach(function(sec) {
        // Section title
        rows.push('\\pard\\sb240\\sa100\\f0\\b\\fs24\\cf1\\brdrb\\brdrs\\brdrw15\\brsp120\\cf1 ' + escRTF(sec.title.toUpperCase()) + '\\par');
        
        // Paragraphs
        if (sec.paragraphs && sec.paragraphs.length > 0) {
          sec.paragraphs.forEach(function(p) {
            var rtfText = escRTF(p);
            var spkMatch = p.match(/^([^:]{2,50}):\s+(.+)/s);
            if (spkMatch) {
              rtfText = '{\\b ' + escRTF(spkMatch[1]) + ':} ' + escRTF(spkMatch[2]);
            }
            rows.push('\\pard\\qj\\sl276\\slmult1\\sb40\\sa120\\f1\\b0\\fs21\\cf2 ' + rtfText + '\\par');
          });
        }
      });
    }

    // Agreements Section
    if (o.agreements) {
      rows.push('\\pard\\sb300\\sa100\\f0\\b\\fs24\\cf1\\brdrb\\brdrs\\brdrw15\\brsp120\\cf1 ACUERDOS Y COMPROMISOS\\par');
      
      // Table Header Row
      rows.push('\\trowd\\trgaph108\\trleft0');
      rows.push('\\clbrdrb\\brdrs\\brdrw15\\brsp40\\cf1\\clcbpat4\\cellx640');
      rows.push('\\clbrdrb\\brdrs\\brdrw15\\brsp40\\cf1\\clcbpat4\\cellx5960');
      rows.push('\\clbrdrb\\brdrs\\brdrw15\\brsp40\\cf1\\clcbpat4\\cellx7660');
      rows.push('\\clbrdrb\\brdrs\\brdrw15\\brsp40\\cf1\\clcbpat4\\cellx9360');
      
      rows.push('\\pard\\intbl\\qc\\f0\\b\\fs18\\cf1 No.\\cell');
      rows.push('\\pard\\intbl\\ql\\f0\\b\\fs18\\cf1 Acuerdo / Compromiso\\cell');
      rows.push('\\pard\\intbl\\ql\\f0\\b\\fs18\\cf1 Responsable\\cell');
      rows.push('\\pard\\intbl\\ql\\f0\\b\\fs18\\cf1 Fecha L\\u237?mite\\cell');
      rows.push('\\row');
      
      // Data Rows
      if (agreements && agreements.length > 0) {
        agreements.forEach(function(ag) {
          rows.push('\\trowd\\trgaph108\\trleft0');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx640');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx5960');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx7660');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx9360');
          
          rows.push('\\pard\\intbl\\qc\\f1\\fs18\\cf2 ' + escRTF(ag.numero) + '\\cell');
          rows.push('\\pard\\intbl\\ql\\sl220\\slmult1\\sb20\\sa20\\f1\\fs18\\cf2 ' + escRTF(ag.descripcion) + '\\cell');
          rows.push('\\pard\\intbl\\ql\\sb20\\sa20\\f1\\fs18\\cf2 ' + escRTF(ag.responsable || '—') + '\\cell');
          rows.push('\\pard\\intbl\\ql\\sb20\\sa20\\f1\\fs18\\cf2 ' + escRTF(ag.fecha_limite || '—') + '\\cell');
          rows.push('\\row');
        });
      } else {
        // Render 3 blank rows
        for (var n = 1; n <= 3; n++) {
          rows.push('\\trowd\\trgaph108\\trleft0');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx640');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx5960');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx7660');
          rows.push('\\clbrdrb\\brdrs\\brdrw5\\cf5\\cellx9360');
          
          rows.push('\\pard\\intbl\\qc\\f1\\fs18\\cf3 ' + n + '\\cell');
          rows.push('\\pard\\intbl\\ql\\f1\\fs18\\cf3 \\cell');
          rows.push('\\pard\\intbl\\ql\\f1\\fs18\\cf3 \\cell');
          rows.push('\\pard\\intbl\\ql\\f1\\fs18\\cf3 \\cell');
          rows.push('\\row');
        }
      }
      rows.push('\\pard\\fs12\\par');
    }

    // Signatures Section
    if (o.signatures) {
      rows.push('\\pard\\sb300\\sa100\\f0\\b\\fs24\\cf1\\brdrb\\brdrs\\brdrw15\\brsp120\\cf1 FIRMAS DE CONFORMIDAD\\par\\par');
      var signers = (attendees && attendees.length > 0) ? attendees.slice(0, 6) : ['Participante 1', 'Participante 2', 'Participante 3', 'Participante 4'];
      
      for (var i = 0; i < signers.length; i += 2) {
        var s1 = signers[i];
        var s2 = signers[i+1] || '';
        
        rows.push('\\trowd\\trgaph108\\trleft480\\cellx4400\\cellx8320');
        rows.push('\\pard\\intbl\\qc\\sb120\\f1\\fs20\\cf3 ___________________________\\cell');
        if (s2) {
          rows.push('\\pard\\intbl\\qc\\sb120\\f1\\fs20\\cf3 ___________________________\\cell');
        } else {
          rows.push('\\pard\\intbl\\qc\\sb120\\f1\\fs20\\cf3 \\cell');
        }
        rows.push('\\row');
        
        rows.push('\\trowd\\trgaph108\\trleft480\\cellx4400\\cellx8320');
        rows.push('\\pard\\intbl\\qc\\sb30\\sa120\\f1\\b\\fs18\\cf2 ' + escRTF(s1) + '\\cell');
        if (s2) {
          rows.push('\\pard\\intbl\\qc\\sb30\\sa120\\f1\\b\\fs18\\cf2 ' + escRTF(s2) + '\\cell');
        } else {
          rows.push('\\pard\\intbl\\qc\\sb30\\sa120\\f1\\b\\fs18\\cf2 \\cell');
        }
        rows.push('\\row');
        
        rows.push('\\pard\\fs12\\par');
      }
    }

    // Footer
    rows.push('\\pard\\qr\\sb240\\f1\\fs16\\cf3 Generado autom\\u225?ticamente \\u183? VTT Actas\\par');
    rows.push('}');
    return rows.join('\n');
  };

  function sectionIcon(tipo) {
    var icons = {
      apertura:   '🔓 ', asistencia: '👥 ', orden_dia: '📋 ',
      punto:      '📌 ', acuerdos:   '✅ ', clausura:  '🔒 ',
      firmas:     '✍️ ', otro:       ''
    };
    return '<span style="opacity:.7">' + (icons[tipo] || '') + '</span>';
  }

  function mrow(lbl, val) {
    return '<div class="doc-meta-row"><span class="doc-meta-label">'+esc(lbl)+'</span><span class="doc-meta-value">'+esc(val)+'</span></div>';
  }

  function center(str, w) { var p=Math.max(0,Math.floor((w-str.length)/2)); return ' '.repeat(p)+str; }
  function fmtDate(d) { if(!d)return''; var dt=new Date(d+'T12:00:00'); return dt.toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'}); }
  function fmtTime(t) { if(!t)return''; var p=t.split(':'),h=parseInt(p[0]); return (h%12||12)+':'+p[1]+' '+(h>=12?'p.m.':'a.m.'); }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Expose helpers just in case
  exports.fmtDate = fmtDate;
  exports.fmtTime = fmtTime;
  exports.esc = esc;

})(window.VTT_ACTAS = window.VTT_ACTAS || {});
