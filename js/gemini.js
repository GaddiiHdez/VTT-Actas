(function(exports) {
  'use strict';

  /* ═══════════════════════════════════════
     GEMINI AI
  ═══════════════════════════════════════ */
  exports.buildPrompt = function(cues, o) {
    var fullText = cues.map(function(c){ return c.text; }).join(' ');

    var partInstruction = '';
    if (o && o.totalParts && o.totalParts > 1) {
      partInstruction = '[CONTEXTO IMPORTANTE: Esta reunión es muy larga y se ha dividido en partes. Estás procesando la PARTE ' + (o.partIndex + 1) + ' de ' + o.totalParts + '. Redacta las secciones del acta y los acuerdos ÚNICAMENTE para esta porción del texto. Mantén la consistencia y no inventes el final.]';
    }

    var styleInstructions = [];
    if (o && o.style === 'verbatim') {
      styleInstructions = [
        'Tu tarea es generar la TRANSCRIPCIÓN COMPLETA Y CORREGIDA (Estilo TEXTO LIMPIO / VERBATIM) de la reunión.',
        'Reglas extremadamente estrictas para este estilo:',
        '1. NO resumas, NO sintetices, NO acortes y NO omitas nada de información del texto original de la reunión.',
        '2. El resultado debe ser una copia fiel y palabra por palabra de los diálogos de la transcripción provista, pero limpia y pulida de errores ortográficos, nombres mal escritos y puntuación.',
        '3. Mantén la primera persona (los participantes hablando directamente). NO redactes en tercera persona (nada de "El presidente dijo...").',
        '4. Remueve únicamente muletillas obvias y titubeos (como "eh", "este", "bueno", "pues"). Conserva todo el resto del texto.',
        '5. La longitud del texto de salida debe ser muy similar a la de entrada. Si la transcripción tiene muchos párrafos y palabras, tu salida debe tener muchos párrafos y palabras. Si resumes o acortas la reunión, habrás fallado la tarea por completo.',
        '6. Acomoda el diálogo limpio completo dentro de las secciones correspondientes en el arreglo "secciones". Cada bloque en "contenido" debe tener el diálogo completo y corregido correspondientes a esa porción de la reunión, con párrafos separados por dos saltos de línea (\\n\\n).'
      ];
    } else {
      styleInstructions = [
        'Tu tarea es generar un acta oficial estructurada (Estilo FORMAL/MINUTA).',
        'Reglas de redacción:',
        '1. Corrige errores de ASR usando el contexto (si dice "Cavalidad" probablemente es "Calidad").',
        '2. Redacta en tercera persona formal: "El Presidente declaró...", "El Secretario informó...".',
        '3. Elimina muletillas: "eh", "este", "o sea", "¿no?", "pues", "nada más".',
        '4. Mantén los números de los puntos del orden del día.',
        '5. Si alguien dice "presente" en respuesta a su nombre, es parte del pase de lista.',
        '6. Detecta cuándo cambia de sección y créalas correctamente.',
        '7. Si se toman votaciones, incluye el resultado ("por unanimidad", "por mayoría").'
      ];
    }

    // Reglas para la extracción de asistentes
    var attendeeInstructions = [
      'Reglas estrictas para la extracción de "asistentes":',
      '- Extrae únicamente NOMBRES PROPIOS reales de personas (con su grado o cargo si se menciona, ej: "Dr. Miguel Ángel Espinoza (Presidente)").',
      '- NUNCA incluyas cargos genéricos solos o vacíos como "El Presidente", "El Secretario", "Doctor", "Abogado", "el moderador" o "Maestra". Si solo se menciona un cargo sin un nombre propio, no lo agregues a la lista de asistentes.',
      '- Deduplica la lista: si la misma persona es nombrada de diferentes formas (ej: "Cristina de la Rosa" y "Cristina La Rosa Coronado"), unifica a una sola entrada con el nombre más completo.'
    ];

    var customInstructions = '';
    if (o && o.aiInstructions) {
      customInstructions = '[INSTRUCCIONES ADICIONALES DEL USUARIO - DEBES SEGUIRLAS ESTRICTAMENTE:\n' + o.aiInstructions + '\n]';
    }

    var forceFullInstructions = '';
    if (o && o.aiForceFull) {
      forceFullInstructions = '[REGLA CRÍTICA DE GENERACIÓN COMPLETA - DEBES CUMPLIRLA OBLIGATORIAMENTE:\n' +
        '- EL USUARIO ACTIVO LA OPCIÓN DE FORZAR TRANSCRIPCIÓN ÍNTEGRA.\n' +
        '- NO DEBES RESUMIR, NO DEBES ACORTAR, NO DEBES OMITIR NINGUNA SECCIÓN NI INTERVENCIÓN del texto original de la reunión.\n' +
        '- Todo el contenido de la transcripción provista debe ser representado en el contenido del JSON, sin resúmenes sintéticos de ningún tipo.\n' +
        '- Si resumes, acortas o simplificas el texto, habrás fallado la tarea por completo.\n' +
        ']';
    }

    return [
      'Eres un experto redactor y editor de actas y transcripciones en español formal mexicano.',
      partInstruction,
      '',
      'Recibirás la transcripción automática de voz (ASR) de una reunión formal.',
      'La transcripción puede contener errores de ASR: palabras mal transcritas, nombres incorrectos, falta de puntuación y repeticiones.',
      '',
      styleInstructions.join('\n'),
      '',
      customInstructions,
      '',
      forceFullInstructions,
      '',
      attendeeInstructions.join('\n'),
      '',
      'Responde ÚNICAMENTE con un objeto JSON válido, sin bloques de código markdown, sin texto adicional antes o después.',
      '',
      'Estructura exacta requerida:',
      '{',
      '  "titulo_detectado": "string — título completo de la reunión que detectes en el texto",',
      '  "asistentes": ["nombre completo con grado académico/cargo si se menciona"],',
      '  "secciones": [',
      '    {',
      '      "titulo": "string — nombre de la sección",',
      '      "tipo": "apertura | asistencia | orden_dia | punto | acuerdos | clausura | otro",',
      '      "contenido": "texto redactado. Párrafos separados por \\n\\n."',
      '    }',
      '  ],',
      '  "acuerdos": [',
      '    {',
      '      "numero": 1,',
      '      "descripcion": "descripción clara del acuerdo",',
      '      "responsable": "nombre o null",',
      '      "fecha_limite": "fecha o null"',
      '    }',
      '  ]',
      '}',
      '',
      'Contexto adicional del documento:',
      o.org      ? '   Organización: ' + o.org : '',
      o.title    ? '   Título dado por el usuario: ' + o.title : '',
      o.location ? '   Lugar/plataforma: ' + o.location : '',
      '',
      'Transcripción a procesar:',
      '---',
      fullText
    ].filter(function(l){ return l !== undefined && l !== ''; }).join('\n');
  };

  exports.callGemini = async function(cues, o) {
    var apiKey = (localStorage.getItem('vtt_gemini_key') || '').trim();
    if (!apiKey) throw new Error('No hay clave API configurada.');

    var modelName = (o && o.model) ? o.model : 'gemini-3.5-flash';
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + apiKey;

    var contenidoDesc = "Texto completo redactado en lenguaje formal y detallado. Párrafos separados por saltos de línea.";
    if (o && o.style === 'verbatim') {
      contenidoDesc = "Transcripción completa e íntegra corregida palabra por palabra en primera persona. Copia todo el diálogo sin resumir ni acortar nada. Párrafos separados por saltos de línea.";
    }

    var schema = {
      type: "OBJECT",
      properties: {
        titulo_detectado: { type: "STRING", description: "Título de la reunión detectado en el texto" },
        asistentes: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Nombres completos de los asistentes detectados"
        },
        secciones: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              titulo: { type: "STRING", description: "Nombre o título de esta sección" },
              tipo: { type: "STRING", enum: ["apertura", "asistencia", "orden_dia", "punto", "acuerdos", "clausura", "otro"] },
              contenido: { type: "STRING", description: contenidoDesc }
            },
            required: ["titulo", "tipo", "contenido"]
          }
        },
        acuerdos: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              numero: { type: "INTEGER" },
              descripcion: { type: "STRING", description: "Descripción clara del acuerdo" },
              responsable: { type: "STRING" },
              fecha_limite: { type: "STRING" }
            },
            required: ["numero", "descripcion"]
          }
        }
      },
      required: ["titulo_detectado", "asistentes", "secciones", "acuerdos"]
    };

    var body = {
      contents: [{ parts: [{ text: exports.buildPrompt(cues, o) }] }],
      generationConfig: {
        temperature:      0.2,
        topP:             0.85,
        maxOutputTokens:  8192,
        responseMimeType: 'application/json',
        responseSchema:   schema
      }
    };

    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      var errData = await res.json().catch(function(){ return {}; });
      var msg = (errData.error && errData.error.message) || ('HTTP ' + res.status);
      throw new Error(msg);
    }

    var data = await res.json();
    var text = data.candidates[0].content.parts[0].text;

    return exports.repairAndParseJSON(text);
  };

  exports.repairAndParseJSON = function(text) {
    if (!text) throw new Error('Respuesta de Gemini vacía.');
    text = text.trim();

    // 1. Intentar parsear directamente
    try {
      return JSON.parse(text);
    } catch (e) {
      // Continuar a la limpieza básica
    }

    // 2. Limpiar bloques de código markdown si los hay
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      // Continuar a la reparación por truncamiento
    }

    // 3. Algoritmo iterativo de reparación de JSON truncado
    // Retrocedemos de uno en uno desde el final para descartar claves/valores rotos e incompletos.
    for (var backtrack = 0; backtrack < 1000 && text.length > 0; backtrack++) {
      var stack = [];
      var inString = false;
      var escaped = false;
      var clean = '';

      for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (inString) {
          if (escaped) {
            clean += c;
            escaped = false;
          } else if (c === '\\') {
            clean += c;
            escaped = true;
          } else if (c === '"') {
            clean += c;
            inString = false;
          } else if (c === '\n' || c === '\r') {
            // Escapar saltos de línea literales dentro de cadenas
            clean += (c === '\n' ? '\\n' : '\\r');
          } else if (c === '\t') {
            clean += '\\t';
          } else {
            clean += c;
          }
        } else {
          if (c === '"') {
            inString = true;
            escaped = false;
            clean += c;
          } else if (c === '{') {
            stack.push('{');
            clean += c;
          } else if (c === '[') {
            stack.push('[');
            clean += c;
          } else if (c === '}') {
            if (stack.length > 0 && stack[stack.length - 1] === '{') {
              stack.pop();
            }
            clean += c;
          } else if (c === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === '[') {
              stack.pop();
            }
            clean += c;
          } else {
            clean += c;
          }
        }
      }

      if (inString) {
        clean += '"';
      }

      // Cerrar llaves o corchetes abiertos
      var closing = '';
      for (var j = stack.length - 1; j >= 0; j--) {
        closing += (stack[j] === '{' ? '}' : ']');
      }

      var candidate = clean + closing;
      try {
        var parsed = JSON.parse(candidate);
        console.warn('JSON de Gemini reparado tras retroceder ' + backtrack + ' caracteres del final.');
        return parsed;
      } catch (err) {
        // Si no parsea, quitamos el último carácter del texto original y reintentamos
        text = text.substring(0, text.length - 1);
      }
    }

    throw new Error('No se pudo reparar el JSON truncado de Gemini.');
  };

})(window.VTT_ACTAS = window.VTT_ACTAS || {});
