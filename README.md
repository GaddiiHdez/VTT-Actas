# VTT Actas — Conversor de Subtítulos a Actas Oficiales

**VTT Actas** es una herramienta web premium, rápida y segura diseñada para transformar archivos de subtítulos y transcripciones automáticas en formato `.vtt` (generados por plataformas como Microsoft Teams, Zoom, Google Meet o Webex) en actas de reunión oficiales, estructuradas y listas para su distribución formal.

La aplicación es completamente **offline-first** (se ejecuta enteramente en el navegador del cliente) y no requiere ningún servidor ni base de datos, garantizando la privacidad absoluta de los datos de tus reuniones.

---

## ✨ Características Principales

### 📝 Editor Interactivo en Vivo (Live Editor)
* **Edición Directa**: Modifica cualquier parte del acta generada (títulos, párrafos, lista de asistentes o la tabla de compromisos) directamente haciendo clic sobre la vista previa en pantalla.
* **Sincronización en Tiempo Real**: Los cambios se sincronizan en caliente en el estado de la aplicación, de modo que las exportaciones a TXT, Word y PDF contienen de forma idéntica las ediciones que realizas.

### 📊 Dashboard de Analíticas e Indicadores de Reunión
* **Participación y Tiempo de Habla**: Visualiza de forma gráfica (con barras de progreso animadas) el porcentaje de tiempo activo de cada orador.
* **Índice de Colaboración**: Clasificación inteligente del balance de la junta (`Colaborativa`, `Dominada`, `Monopolizada` o `Presentación`) según la distribución de voz.
* **Ritmo de Habla (WPM)**: Analiza el ritmo de habla de los oradores en palabras por minuto con etiquetas de velocidad (`Tranquilo`, `Normal` o `Rápido`).

### 🤖 Inteligencia Artificial Integrada (Gemini AI)
* **Procesamiento de Archivos Largos**: Segmentación automática e inteligente en bloques secuenciales para transcripciones de más de 45 minutos.
* **Deduplicación de Asistentes**: Algoritmo ortográfico y fonético avanzado que filtra cargos genéricos (como "El Presidente") y unifica nombres similares.
* **Estilo Verbatim o Texto Limpio**: Configuración para forzar la transcripción exacta sin resúmenes, ideal para actas legales o auditorías.
* **Resiliencia de Red**: Sistema de reintentos con retroceso exponencial (exponential backoff) para manejar límites de cuota (429) o saturación de API (503).

### 📄 Exportación Profesional Multiformato
* **Microsoft Word (.doc)**: Genera documentos nativos alineados mediante RTF, repitiendo encabezados, pies de página personalizados y numeración dinámica de páginas.
* **Impresión PDF Premium**: Layout de impresión adaptado que repite los encabezados y pies fijos en cada hoja, ocultándolos automáticamente en la primera página/carátula.
* **Texto Plano (.txt)**: Exportación rápida y optimizada para lectores de pantalla.

---

## 🛠️ Arquitectura de Código

El proyecto está diseñado de forma modular en Javascript nativo para facilitar el mantenimiento y la escalabilidad del sistema:

* **[index.html](index.html)**: Estructura HTML5 semántica y responsiva.
* **[styles-v2.css](styles-v2.css)**: Sistema de diseño oscuro premium basado en glassmorphism, gradientes neón y variables CSS personalizadas.
* **[app.js](app.js)**: Controlador principal encargado de coordinar los eventos del DOM, la carga de archivos múltiples y el enlazado de módulos.
* **[js/utils.js](js/utils.js)**: Utilidades de formateo, gestores visuales de progreso (toast, carga) y algoritmos de limpieza de asistentes.
* **[js/storage.js](js/storage.js)**: Gestión del `localStorage` para persistencia del formulario de sidebar y restauración de sesión activa.
* **[js/exporter.js](js/exporter.js)**: Lógica de exportación de archivos locales e impresión a PDF.
* **[js/analytics.js](js/analytics.js)**: Motor estadístico y renderizador visual del panel de analíticas.
* **[js/parser.js](js/parser.js)**: Intérprete y decodificador cronológico de archivos `.vtt`.
* **[js/gemini.js](js/gemini.js)**: Módulo de integración con la API de Google Gemini (versiones 1.5 Pro y 3.5 Flash) y corrector/reparador de JSON truncado.
* **[js/templates.js](js/templates.js)**: Plantillas y generador de marcado HTML, texto plano y RTF de salida.

---

## 🚀 ¿Cómo Empezar?

1. Descarga o clona este repositorio:
   ```bash
   git clone https://github.com/GaddiiHdez/VTT-Actas.git
   ```
2. Abre el archivo **[index.html](index.html)** haciendo doble clic en tu navegador preferido. ¡Eso es todo! No requiere compilar, instalar dependencias (`npm`) ni configurar servidores locales.
3. Para usar las funciones de Inteligencia Artificial, ingresa tu clave API de Gemini (la cual puedes obtener de forma gratuita en Google AI Studio) en la barra lateral. Tu clave se almacena de forma local y encriptada en la caché de tu navegador.

---

## 🔒 Privacidad y Seguridad

Todos los datos, archivos VTT cargados y actas redactadas se procesan localmente en la memoria de tu navegador Web. Si utilizas la API de Gemini, únicamente se envían fragmentos de texto anonimizados directamente a los servidores de Google AI Studio y el resultado retorna a tu terminal. Ninguna información de tus reuniones es almacenada ni transmitida a servidores externos.
