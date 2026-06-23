(function(exports) {
  'use strict';

  var V = window.VTT_ACTAS = window.VTT_ACTAS || {};

  exports.calculateAnalytics = function(cues, attendees) {
    if (!cues || cues.length === 0) return null;

    var speakerStats = {};
    var totalDuration = 0;
    var totalWords = 0;

    // Normalizar lista de asistentes para mapeo inteligente
    var normAttendees = (attendees || []).map(function(att) {
      return { original: att, norm: V.normalizeName(att) };
    });

    cues.forEach(function(cue) {
      var rawSpk = cue.speaker || 'Desconocido';
      var normSpk = V.normalizeName(rawSpk);
      
      // Intentar mapear a un asistente oficial
      var matchedSpeaker = rawSpk;
      for (var i = 0; i < normAttendees.length; i++) {
        if (V.isSimilarName(normSpk, normAttendees[i].norm) || V.isSimilarName(normAttendees[i].norm, normSpk)) {
          matchedSpeaker = normAttendees[i].original;
          break;
        }
      }

      var dur = Math.max(0, cue.end ? cue.end - cue.start : (cue.es - cue.ss));
      // Fallback in case of string timestamps or raw secs
      if (isNaN(dur) || dur < 0) {
        dur = Math.max(0, parseFloat(cue.es) - parseFloat(cue.ss));
      }
      if (isNaN(dur) || dur < 0) dur = 0;

      var words = cue.text ? cue.text.trim().split(/\s+/).filter(Boolean).length : 0;

      if (!speakerStats[matchedSpeaker]) {
        speakerStats[matchedSpeaker] = {
          name: matchedSpeaker,
          duration: 0,
          words: 0,
          turns: 0
        };
      }

      speakerStats[matchedSpeaker].duration += dur;
      speakerStats[matchedSpeaker].words += words;
      speakerStats[matchedSpeaker].turns += 1;

      totalDuration += dur;
      totalWords += words;
    });

    // Convertir a array y calcular porcentajes/WPM
    var speakersArray = [];
    for (var key in speakerStats) {
      var spk = speakerStats[key];
      var wpm = spk.duration > 0 ? Math.round((spk.words / spk.duration) * 60) : 0;
      
      var speedBadge = 'Normal';
      var speedClass = 'speed-normal';
      if (wpm < 110) {
        speedBadge = 'Tranquilo';
        speedClass = 'speed-slow';
      } else if (wpm > 160) {
        speedBadge = 'Rápido';
        speedClass = 'speed-fast';
      }

      var pct = totalDuration > 0 ? (spk.duration / totalDuration) * 100 : 0;

      speakersArray.push({
        name: spk.name,
        duration: spk.duration,
        words: spk.words,
        turns: spk.turns,
        wpm: wpm,
        pct: pct,
        speedBadge: speedBadge,
        speedClass: speedClass
      });
    }

    // Ordenar de mayor a menor participación
    speakersArray.sort(function(a, b) { return b.duration - a.duration; });

    // Determinar nivel de colaboración
    var balanceText = 'Equilibrada';
    var balanceClass = 'balance-good';
    var balanceDesc = 'La participación está distribuida equitativamente entre los asistentes.';

    if (speakersArray.length === 1) {
      balanceText = 'Presentación';
      balanceClass = 'balance-mono';
      balanceDesc = 'Un solo orador ha intervenido, típica estructura de presentación unidireccional o monólogo.';
    } else if (speakersArray.length > 1) {
      var topPct = speakersArray[0].pct;
      if (topPct > 75) {
        balanceText = 'Monopolizada';
        balanceClass = 'balance-bad';
        balanceDesc = 'El orador principal acapara más del 75% de la reunión, dejando poca participación al resto.';
      } else if (topPct > 55) {
        balanceText = 'Dominada';
        balanceClass = 'balance-warn';
        balanceDesc = 'Un orador lidera de manera dominante, con aportaciones breves y puntuales de los demás.';
      } else {
        balanceText = 'Colaborativa';
        balanceClass = 'balance-good';
        balanceDesc = 'Excelente flujo de conversación con contribuciones compartidas de forma fluida y sana.';
      }
    }

    return {
      speakers: speakersArray,
      totalDuration: totalDuration,
      totalWords: totalWords,
      balanceText: balanceText,
      balanceClass: balanceClass,
      balanceDesc: balanceDesc
    };
  };

  exports.renderAnalytics = function(cues, attendees) {
    var container = document.getElementById('analytics-dashboard');
    if (!container) return;

    var stats = exports.calculateAnalytics(cues, attendees);
    if (!stats || stats.speakers.length === 0) {
      container.innerHTML = '';
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');

    var html = '';
    html += '<div class="analytics-card glass-card">';
    html += '  <div class="analytics-header">';
    html += '    <div class="analytics-title-area">';
    html += '      <svg viewBox="0 0 24 24" class="analytics-icon" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    html += '      <h4>Estadísticas y Analíticas de Reunión</h4>';
    html += '    </div>';
    html += '    <span class="badge ' + stats.balanceClass + '">' + stats.balanceText + '</span>';
    html += '  </div>';
    
    html += '  <p class="analytics-desc">' + stats.balanceDesc + '</p>';

    html += '  <div class="analytics-grid">';
    
    // Panel de oradores
    html += '    <div class="analytics-speakers">';
    stats.speakers.forEach(function(spk) {
      var pctFormatted = spk.pct.toFixed(1);
      html += '      <div class="speaker-row">';
      html += '        <div class="speaker-info">';
      html += '          <span class="speaker-name">' + V.esc(spk.name) + '</span>';
      html += '          <span class="speaker-stats-label">' + V.fmtDurLabel(spk.duration) + ' (' + pctFormatted + '%) · ' + spk.words + ' palabras</span>';
      html += '        </div>';
      html += '        <div class="speaker-progress-bar">';
      html += '          <div class="speaker-progress-fill" style="width: ' + pctFormatted + '%"></div>';
      html += '        </div>';
      html += '      </div>';
    });
    html += '    </div>';

    // Panel de métricas complementarias (WPMs, etc)
    html += '    <div class="analytics-summary-cards">';
    html += '      <div class="metric-mini-card">';
    html += '        <span class="metric-mini-label">Ritmo de Habla Promedio</span>';
    stats.speakers.slice(0, 3).forEach(function(spk) {
      html += '        <div class="metric-speaker-speed">';
      html += '          <span class="speed-name">' + V.esc(spk.name) + '</span>';
      html += '          <span class="badge ' + spk.speedClass + '">' + spk.wpm + ' WPM (' + spk.speedBadge + ')</span>';
      html += '        </div>';
    });
    if (stats.speakers.length > 3) {
      html += '        <div class="metric-more-speakers">y ' + (stats.speakers.length - 3) + ' orador(es) más</div>';
    }
    html += '      </div>';
    
    // Duración y totales
    html += '      <div class="metric-mini-card stat-totals">';
    html += '        <div class="stat-item-col">';
    html += '          <span class="metric-mini-label">Tiempo Total Activo</span>';
    html += '          <span class="stat-number">' + V.fmtDurLabel(stats.totalDuration) + '</span>';
    html += '        </div>';
    html += '        <div class="stat-item-col">';
    html += '          <span class="metric-mini-label">Palabras Totales</span>';
    html += '          <span class="stat-number">' + stats.totalWords.toLocaleString('es-ES') + '</span>';
    html += '        </div>';
    html += '      </div>';

    html += '    </div>'; // analytics-summary-cards
    html += '  </div>'; // analytics-grid
    html += '</div>'; // analytics-card

    container.innerHTML = html;
  };

})(window.VTT_ACTAS = window.VTT_ACTAS || {});
