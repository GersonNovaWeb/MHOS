'use client';

const isProd = process.env.NODE_ENV === 'production';
const base = '';

// ── Constantes de color ───────────────────────────────────────────────────────
const C_GREEN = [26,  127, 55 ];
const C_LIGHT = [235, 241, 250];
const C_GRAY  = [180, 180, 180];
const C_BLACK = [0,   0,   0  ];
const C_WHITE = [255, 255, 255];

// ── Helpers de imagen ─────────────────────────────────────────────────────────
const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
};

/**
 * Devuelve { dataUrl, naturalW, naturalH } para una foto base64.
 * No recorta — mantiene proporción original.
 */
const getImageDimensions = (b64DataUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ dataUrl: b64DataUrl, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = b64DataUrl;
  });

// ── drawHeader / drawFooter ───────────────────────────────────────────────────
const drawHeader = (doc, headerBase64) => {
  if (headerBase64) {
    doc.addImage(headerBase64, 'PNG', 10, 5, 196, 22);
  } else {
    doc.setFillColor(...C_GREEN);
    doc.rect(10, 5, 196, 22, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_WHITE);
    doc.text('MANHOS', 108, 19, { align: 'center' });
  }
};

const drawFooter = (doc, footerBase64) => {
  if (footerBase64) {
    doc.addImage(footerBase64, 'PNG', 10, 262, 196, 15);
  } else {
    doc.setFillColor(...C_GREEN);
    doc.rect(10, 262, 196, 15, 'F');
  }
};

// ── drawCell ──────────────────────────────────────────────────────────────────
const drawCell = (doc, x, y, w, h, text, opts = {}) => {
  const {
    bold     = false,
    fontSize = 9,
    align    = 'left',
    bg       = null,
    color    = C_BLACK,
    wrap     = false,
    border   = true,
  } = opts;

  if (bg) { doc.setFillColor(...bg); doc.rect(x, y, w, h, 'F'); }
  if (border) {
    doc.setDrawColor(...C_GRAY);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h);
  }

  if (text === null || text === undefined || text === '') return;
  const str = String(text);
  const pad = 2;
  const textY = y + h * 0.64;

  doc.setFontSize(fontSize);
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setTextColor(...color);

  if (align === 'center') {
    const cx = x + w / 2;
    if (wrap) {
      const lines = doc.splitTextToSize(str, w - pad * 2);
      const lineH = fontSize * 0.38;
      lines.forEach((l, i) => doc.text(l, cx, y + lineH * (i + 1), { align: 'center' }));
    } else {
      doc.text(doc.splitTextToSize(str, w - pad * 2)[0] ?? '', cx, textY, { align: 'center' });
    }
  } else if (align === 'right') {
    doc.text(str, x + w - pad, textY, { align: 'right' });
  } else {
    if (wrap) {
      const lines = doc.splitTextToSize(str, w - pad * 2);
      const lineH = fontSize * 0.38;
      lines.forEach((l, i) => doc.text(l, x + pad, y + lineH * (i + 1)));
    } else {
      doc.text(doc.splitTextToSize(str, w - pad * 2)[0] ?? '', x + pad, textY);
    }
  }
};

// ── Cabecera de datos (Orden/Fecha/Cliente/Dir/Contrato) ─────────────────────
const drawCabecera = (doc, startY, data, includeDir = true) => {
  const m = 10;
  let y = startY;

  drawCell(doc, m,       y, 80,  8, 'Orden/Reporte de Servicio', { fontSize: 9 });
  drawCell(doc, m + 80,  y, 116, 8, data.serial, { bold: true, fontSize: 10, align: 'center', bg: C_LIGHT });
  y += 8;

  drawCell(doc, m,      y, 40, 7, 'Fecha',   { bold: true, fontSize: 9, bg: C_LIGHT });
  drawCell(doc, m + 40, y, 156, 7, data.date, { fontSize: 9 });
  y += 7;

  drawCell(doc, m,      y, 40, 7, 'CLIENTE',   { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 40, y, 156, 7, data.client, { fontSize: 9 });
  y += 7;

  if (includeDir) {
    drawCell(doc, m,      y, 40, 7, 'DIRECCIÓN',    { bold: true, fontSize: 8, bg: C_LIGHT });
    drawCell(doc, m + 40, y, 156, 7, data.direccion, { fontSize: 9 });
    y += 7;
  }

  drawCell(doc, m,       y, 40, 7, 'N° CONTRATO', { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 40,  y, 80, 7, data.contrato, { fontSize: 9 });
  drawCell(doc, m + 120, y, 30, 7, 'PARTIDA',     { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 150, y, 46, 7, data.partida,  { fontSize: 9 });
  y += 7;

  return y + 2;
};

// ── Datos del Equipo (título plain, sin verde) ────────────────────────────────
const drawEquipo = (doc, startY, data) => {
  const m  = 10;
  const hw = 98;
  const lW = 25;
  const vW = 73;
  let y = startY;

  // Título: solo texto bold centrado, con línea arriba y abajo
  doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
  doc.line(m, y, m + 196, y);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
  doc.text('Datos del Equipo', m + 98, y + 5.5, { align: 'center' });
  y += 8;
  doc.setDrawColor(...C_GRAY); doc.line(m, y, m + 196, y);
  y += 1;

  const rows = [
    ['Equipo',  data.equipo,     'Número de serie', data.numSerieEq],
    ['Marca',   data.marca,      'Folio SSM',       data.folioSsm  ],
    ['Modelo',  data.modelo,     'Ubicación',       data.ubicacion  ],
  ];
  rows.forEach(([l1, v1, l2, v2]) => {
    drawCell(doc, m,           y, lW, 7, l1, { bold: true, fontSize: 8, bg: C_LIGHT });
    drawCell(doc, m + lW,      y, vW, 7, v1, { fontSize: 9 });
    drawCell(doc, m + hw,      y, lW, 7, l2, { bold: true, fontSize: 8, bg: C_LIGHT });
    drawCell(doc, m + hw + lW, y, vW, 7, v2, { fontSize: 9 });
    y += 7;
  });

  return y + 2;
};

// ── Tabla de firmas (3 páginas) ───────────────────────────────────────────────
const drawFirmasTable = (doc, y, data) => {
  const m   = 10;
  const cw  = 49;   // 196/4
  const R1H = 15;
  const R2H = 12;

  // Fila 1: nombres
  const nombres = [data.firmaEntrega || '', data.firmaRecibe || '', data.firmaValida || '', ''];
  nombres.forEach((n, i) =>
    drawCell(doc, m + i * cw, y, cw, R1H, n, { bold: true, fontSize: 9, align: 'center' })
  );

  // Fila 2: etiquetas fijas
  const etiquetas = [
    { l1: 'Ing/Tec que realizo servicio (MANHOS)', l2: 'Nombre y Firma (Entrega)' },
    { l1: 'Director/Administrador',                l2: 'Recibe/Autoriza' },
    { l1: 'Ing. Adrián Martinez Robles',           l2: 'Valida' },
    { l1: 'Sello de la Unidad',                    l2: '' },
  ];

  etiquetas.forEach(({ l1, l2 }, i) => {
    const cx = m + i * cw;
    doc.setFillColor(...C_WHITE);
    doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
    doc.rect(cx, y + R1H, cw, R2H, 'FD');

    const tx = cx + cw / 2;
    if (l2) {
      // dos líneas: normal arriba, bold abajo
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_BLACK);
      doc.text(l1, tx, y + R1H + 4.5, { align: 'center', maxWidth: cw - 3 });
      doc.setFont('helvetica', 'bold');
      doc.text(l2, tx, y + R1H + 9,   { align: 'center', maxWidth: cw - 3 });
    } else {
      // solo una línea bold centrada
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
      doc.text(l1, tx, y + R1H + 6.5, { align: 'center', maxWidth: cw - 3 });
    }
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════════
export const generarPDFjsPDF = async (reportData) => {
  const [headerB64, footerB64] = await Promise.all([
    getBase64ImageFromUrl(`${base}/templates/header.png`),
    getBase64ImageFromUrl(`${base}/templates/footer.png`),
  ]);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });

  const m    = 10;
  const tCW  = 196 / 3; // ~65.33mm por columna tipo servicio

  const typeMap = {
    'Preventivo':  'Mantto.\nPreventivo',
    'Correctivo':  'Mantto.\nCorrectivo',
    'Garantia':    'Garantia',
    'Diagnóstico': 'Diagnóstico',
    'Instalación': 'Instalación',
    'Capacitación':'Capacitación',
  };
  const activeType = reportData.type || 'Preventivo';

  // ══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 1
  // ══════════════════════════════════════════════════════════════════════════════
  drawHeader(doc, headerB64);
  drawFooter(doc, footerB64);

  // Orden/Reporte (y=30)
  drawCell(doc, m,      30, 80,  8, 'Orden/Reporte de Servicio', { fontSize: 9 });
  drawCell(doc, m + 80, 30, 116, 8, reportData.serial, { bold: true, fontSize: 10, align: 'center', bg: C_LIGHT });

  // Fecha (y=38)
  drawCell(doc, m,      38, 40, 7, 'Fecha',         { bold: true, fontSize: 9, bg: C_LIGHT });
  drawCell(doc, m + 40, 38, 156, 7, reportData.date, { fontSize: 9 });

  // Cliente (y=45)
  drawCell(doc, m,      45, 40, 7, 'CLIENTE',         { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 40, 45, 156, 7, reportData.client, { fontSize: 9 });

  // Dirección (y=52)
  drawCell(doc, m,      52, 40, 7, 'DIRECCIÓN',          { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 40, 52, 156, 7, reportData.direccion, { fontSize: 9 });

  // Contrato/Partida (y=59)
  drawCell(doc, m,       59, 40, 7, 'N° CONTRATO',      { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 40,  59, 80, 7, reportData.contrato, { fontSize: 9 });
  drawCell(doc, m + 120, 59, 30, 7, 'PARTIDA',           { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 150, 59, 46, 7, reportData.partida,  { fontSize: 9 });

  // ── Tabla Tipo de Servicio (y=68, 2 filas h=10) ───────────────────────────
  const tiposGrid = [
    ['Preventivo',  'Garantia',    'Instalación'],
    ['Correctivo',  'Diagnóstico', 'Capacitación'],
  ];
  const tiposLabel = {
    'Preventivo':  'Mantto.\nPreventivo',
    'Correctivo':  'Mantto.\nCorrectivo',
    'Garantia':    'Garantia',
    'Diagnóstico': 'Diagnóstico',
    'Instalación': 'Instalación',
    'Capacitación':'Capacitación',
  };

  tiposGrid.forEach((row, ri) => {
    const rowY = 68 + ri * 10;
    row.forEach((tipo, ci) => {
      const tx      = m + ci * tCW;
      const checked = tipo === activeType;

      // Fondo celda activa
      if (checked) { doc.setFillColor(...C_LIGHT); doc.rect(tx, rowY, tCW, 10, 'F'); }
      doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
      doc.rect(tx, rowY, tCW, 10);

      // Etiqueta (puede tener \n)
      const label = tiposLabel[tipo] || tipo;
      const lines = label.split('\n');
      doc.setFontSize(8);
      doc.setFont('helvetica', checked ? 'bold' : 'normal');
      doc.setTextColor(...C_BLACK);
      if (lines.length > 1) {
        doc.text(lines[0], tx + 3, rowY + 3.8);
        doc.text(lines[1], tx + 3, rowY + 7.6);
      } else {
        doc.text(lines[0], tx + 3, rowY + 5.8);
      }

      // Checkbox 4×4mm a la derecha
      const cbX = tx + tCW - 7;
      const cbY = rowY + 3;
      doc.setDrawColor(...C_BLACK); doc.setLineWidth(0.3);
      doc.rect(cbX, cbY, 4, 4);
      if (checked) {
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
        doc.text('X', cbX + 0.7, cbY + 3.2);
      }
    });
  });

  // ── Datos del Equipo (y=90) ───────────────────────────────────────────────
  {
    const hw = 98; const lW = 25; const vW = 73;
    let ey = 90;

    doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
    doc.line(m, ey, m + 196, ey);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
    doc.text('Datos del Equipo', m + 98, ey + 5.5, { align: 'center' });
    ey += 8;
    doc.setDrawColor(...C_GRAY); doc.line(m, ey, m + 196, ey);
    ey += 1;

    const equipoRows = [
      [ey,      'Equipo',  reportData.equipo,   'Número de serie', reportData.numSerieEq],
      [ey + 7,  'Marca',   reportData.marca,    'Folio SSM',       reportData.folioSsm  ],
      [ey + 14, 'Modelo',  reportData.modelo,   'Ubicación',       reportData.ubicacion  ],
    ];
    equipoRows.forEach(([yr, l1, v1, l2, v2]) => {
      drawCell(doc, m,           yr, lW, 7, l1, { bold: true, fontSize: 8, bg: C_LIGHT });
      drawCell(doc, m + lW,      yr, vW, 7, v1, { fontSize: 9 });
      drawCell(doc, m + hw,      yr, lW, 7, l2, { bold: true, fontSize: 8, bg: C_LIGHT });
      drawCell(doc, m + hw + lW, yr, vW, 7, v2, { fontSize: 9 });
    });
  }

  // ── Falla reportada (y=123, área h=14) ───────────────────────────────────
  {
    const y = 123;
    doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
    doc.rect(m, y, 196, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
    doc.text('Falla reportada: ', m + 2, y + 5.5);
    const labelW = doc.getTextWidth('Falla reportada: ');
    doc.setFont('helvetica', 'normal');
    const fallaRest = doc.splitTextToSize(reportData.falla || '', 196 - labelW - 4);
    // primera porción en la misma línea
    if (fallaRest[0]) doc.text(fallaRest[0], m + 2 + labelW, y + 5.5);
    // segunda línea si la hay
    if (fallaRest[1]) doc.text(fallaRest[1], m + 2, y + 10.5);
  }

  // ── Condiciones iniciales (y=139, área h=14) ─────────────────────────────
  {
    const y = 139;
    doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
    doc.rect(m, y, 196, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
    doc.text('Condiciones iniciales del equipo: ', m + 2, y + 5.5);
    const labelW = doc.getTextWidth('Condiciones iniciales del equipo: ');
    doc.setFont('helvetica', 'normal');
    const condRest = doc.splitTextToSize(reportData.condiciones || '', 196 - labelW - 4);
    if (condRest[0]) doc.text(condRest[0], m + 2 + labelW, y + 5.5);
    if (condRest[1]) doc.text(condRest[1], m + 2, y + 10.5);
  }

  // ── Trabajos realizados (y=155, área h=22) ───────────────────────────────
  {
    const y = 155;
    doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
    doc.rect(m, y, 196, 22);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
    doc.text('Trabajos realizados/Notas/Observaciones/Recomendaciones:', m + 2, y + 5);
    doc.setFont('helvetica', 'normal');
    const tLines = doc.splitTextToSize(reportData.trabajos || reportData.description || '', 192);
    doc.text(tLines.slice(0, 4), m + 2, y + 10);
  }

  // ── Refacciones (y=179, líneas horizontales) ──────────────────────────────
  {
    const y = 179;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_BLACK);
    doc.text('Refacciones/Accesorios utilizados:', m, y);
    const refs = (reportData.refacciones || []).filter(r => r).slice(0, 4);
    for (let i = 0; i < 4; i++) {
      const lineY = y + 6 + i * 7;
      doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
      doc.line(m, lineY, m + 196, lineY);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C_BLACK);
      if (refs[i]) doc.text(refs[i], m + 1, lineY - 1.5);
    }
  }

  // ── Equipo de Medición (y=210) ────────────────────────────────────────────
  {
    const y = 210;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_GREEN);
    doc.text('EQUIPO DE MEDICIÓN UTILIZADO', m + 98, y, { align: 'center' });

    const medCols = [m, m + 50, m + 90, m + 130];
    const medWids = [50,  40,    40,    66 ];
    const medHdrs = ['Equipo', 'Marca', 'Modelo', 'Numero de serie'];

    // Headers sin fondo
    medHdrs.forEach((h, i) =>
      drawCell(doc, medCols[i], y + 3, medWids[i], 7, h, { bold: true, fontSize: 8, align: 'center' })
    );
    // 3 filas de datos
    (reportData.medicion || []).slice(0, 3).forEach((med, ri) => {
      const ry = y + 10 + ri * 6;
      [med.equipo, med.marca, med.modelo, med.serie].forEach((v, ci) =>
        drawCell(doc, medCols[ci], ry, medWids[ci], 6, v || '', { fontSize: 8 })
      );
    });
  }

  // ── Firmas página 1 (y=237) ───────────────────────────────────────────────
  drawFirmasTable(doc, 237, reportData);

  // ══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 2 — Checklist columna única
  // ══════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(doc, headerB64);
  drawFooter(doc, footerB64);

  let y2 = drawCabecera(doc, 30, reportData, true);
  y2 = drawEquipo(doc, y2, reportData);

  // Título checklist
  const chkTitleY = y2;
  drawCell(doc, m,       chkTitleY, 162, 8, 'Rutina de anexo técnico', { bold: true, fontSize: 10, color: C_GREEN, bg: C_LIGHT });
  drawCell(doc, m + 162, chkTitleY, 34,  8, 'Check List',              { bold: true, fontSize: 10, color: C_GREEN, align: 'center', bg: C_LIGHT });
  y2 += 8;

  const CHECKLIST_FULL = [
    'Aire acondicionado de 1 y 2 Toneladas',
    'Verificación visual del estado físico del equipo (golpes, rayaduras, o algún tipo de daño que ponga en riesgo su funcionamiento o al usuario).',
    'Pruebas de funcionamiento previas al mantenimiento (corroborar que el equipo trabaje adecuadamente o en su defecto identificar posibles fallas).',
    'Corroboración de activación de alarmas y correcto funcionamiento del sistema de control de temperatura (Set Point, Bias, brecha diferencial)',
    'Verificación de conexión a tierra física',
    'Limpieza general de gabinete (incluye partes internas como externas, así como la aplicación de pintura en partes dañadas por oxidación).',
    'Mantenimiento a condensador.',
    'Retirar exceso de material residuales (polvo o cuerpos extraños).',
    'Alineación de serpentín con peine (de ser necesario).',
    'Lavado con químicos especiales (FOAM CLEANER) En porcentaje conforme a las necesidades.',
    'Colocación de tableta (PAN CLEAN) en charola de condensado.',
    'Mantenimiento a compresor (verificar que el desempeño sea optimo no presente sobrecalentamiento).',
    'Mantenimiento a ventilador (lubricación de rodamientos y servicio a aspas).',
    'Mantenimiento a evaporador (repetir el procedimiento antes mencionado del condensador).',
    'Verificación de tubo capilar o válvula de expansión según sea el caso.',
    'Verificación de carga ideal de gas refrigerante.',
    'Mantenimiento al sistema de arranque del compresor.',
    'Verificación de sensor de temperatura.',
    'Ajuste y calibración del sistema de control de temperatura. (Set Point, brecha diferencial, Bias, etc.).',
    'Verificación de consumo de Amperaje y protección de sobrecarga.',
    'Limpieza general.',
    'Reemplazo de filtros según sea el caso.',
    'Verificación de motores en extractores.',
    'Verificación de motores en inyectores.',
    'Verificación de bandas y aspiradores en extractores e inyectores.',
    'Puesta en marcha de equipo.',
    'Verificar correcto funcionamiento.',
    'Pruebas de esfuerzo.',
  ];

  const descW  = 162; // ancho columna descripción
  const chkW   = 34;  // ancho columna check
  const rowMinH = 6;  // altura mínima por fila

  for (let i = 0; i < CHECKLIST_FULL.length; i++) {
    const desc    = `${i + 1}. ${CHECKLIST_FULL[i]}`;
    const checked = reportData.checklist?.[i] || false;

    // Calcular altura dinámica según líneas de texto
    const lines   = doc.splitTextToSize(desc, descW - 4);
    const lineH   = 4;
    const cellH   = Math.max(rowMinH, lines.length * lineH + 2);

    // Fondo si checked
    if (checked) {
      doc.setFillColor(...C_LIGHT);
      doc.rect(m, y2, descW, cellH, 'F');
    }
    // Borde descripción
    doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
    doc.rect(m, y2, descW, cellH);

    // Texto descripción
    doc.setFontSize(7.5);
    doc.setFont('helvetica', checked ? 'bold' : 'normal');
    doc.setTextColor(...C_BLACK);
    lines.forEach((l, li) => doc.text(l, m + 2, y2 + 4 + li * lineH));

    // Celda check
    doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
    doc.rect(m + descW, y2, chkW, cellH);
    if (checked) {
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_GREEN);
      doc.text('X', m + descW + chkW / 2, y2 + cellH / 2 + 1.5, { align: 'center' });
    }

    y2 += cellH;
  }

  y2 += 4;
  drawFirmasTable(doc, y2, reportData);

  // ══════════════════════════════════════════════════════════════════════════════
  // PÁGINA 3 — Evidencia fotográfica
  // ══════════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(doc, headerB64);
  drawFooter(doc, footerB64);

  // Cabecera reducida (sin Dirección)
  drawCell(doc, m,      30, 80, 8,  'Orden/Reporte de Servicio', { fontSize: 9 });
  drawCell(doc, m + 80, 30, 116, 8, reportData.serial, { bold: true, fontSize: 10, align: 'center', bg: C_LIGHT });
  drawCell(doc, m,      38, 40, 7,  'Fecha',           { bold: true, fontSize: 9, bg: C_LIGHT });
  drawCell(doc, m + 40, 38, 156, 7, reportData.date,   { fontSize: 9 });
  drawCell(doc, m,      45, 40, 7,  'CLIENTE',         { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 40, 45, 156, 7, reportData.client, { fontSize: 9 });
  drawCell(doc, m,       52, 40, 7, 'N° CONTRATO',      { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 40,  52, 80, 7, reportData.contrato, { fontSize: 9 });
  drawCell(doc, m + 120, 52, 30, 7, 'PARTIDA',           { bold: true, fontSize: 8, bg: C_LIGHT });
  drawCell(doc, m + 150, 52, 46, 7, reportData.partida,  { fontSize: 9 });

  // Título EVIDENCIA FOTOGRÁFICA (y=63)
  doc.setFillColor(...C_GREEN);
  doc.rect(m, 63, 196, 8, 'F');
  doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
  doc.rect(m, 63, 196, 8);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_WHITE);
  doc.text('EVIDENCIA FOTOGRÁFICA', m + 98, 68.5, { align: 'center' });

  // ── Grid de fotos ─────────────────────────────────────────────────────────
  // Fila 1: Antes1, Antes2 | gap | Durante1, Durante2
  // Fila 2: Despues1, Despues2 | gap | Etiqueta
  // Ancho disponible: 196mm, gap central: 4mm
  // Cada foto: ~(196-4)/4 = 48mm ancho, alto proporcional (max 44mm)

  const PHOTO_W  = 46;  // mm ancho foto
  const PHOTO_H  = 44;  // mm alto máximo foto
  const GAP_C    = 8;   // gap central entre grupos
  const ROW1_Y   = 74;
  const ROW2_Y   = 124;
  const LABEL_H  = 5;

  // posiciones x: izq1, izq2, der1, der2
  const xL1 = m;
  const xL2 = m + PHOTO_W + 2;
  const xR1 = m + PHOTO_W * 2 + 2 + GAP_C;
  const xR2 = m + PHOTO_W * 2 + 2 + GAP_C + PHOTO_W + 2;

  const fotoSlots = [
    // fila 1
    { key: 'antes1',   x: xL1, y: ROW1_Y },
    { key: 'antes2',   x: xL2, y: ROW1_Y },
    { key: 'durante1', x: xR1, y: ROW1_Y },
    { key: 'durante2', x: xR2, y: ROW1_Y },
    // fila 2
    { key: 'despues1', x: xL1, y: ROW2_Y },
    { key: 'despues2', x: xL2, y: ROW2_Y },
    { key: 'etiqueta', x: xR1, y: ROW2_Y },
    { key: 'antes3',   x: xR2, y: ROW2_Y },
  ];

  for (const { key, x, y } of fotoSlots) {
    const b64 = reportData.fotos?.[key];

    if (b64) {
      try {
        const dataUrl = b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
        const info    = await getImageDimensions(dataUrl);
        if (info) {
          // Mantener proporción natural, ajustar dentro de PHOTO_W × PHOTO_H
          const ratio    = info.w / info.h;
          let   iw       = PHOTO_W;
          let   ih       = iw / ratio;
          if (ih > PHOTO_H) { ih = PHOTO_H; iw = ih * ratio; }
          const offsetX  = x + (PHOTO_W - iw) / 2;
          const offsetY  = y + (PHOTO_H - ih) / 2;

          // Marco con relleno gris claro
          doc.setFillColor(248, 248, 248);
          doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
          doc.rect(x, y, PHOTO_W, PHOTO_H, 'FD');

          doc.addImage(dataUrl, 'JPEG', offsetX, offsetY, iw, ih, undefined, 'FAST');
        }
      } catch (e) {
        // Marco vacío con texto error
        doc.setFillColor(248, 248, 248);
        doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
        doc.rect(x, y, PHOTO_W, PHOTO_H, 'FD');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160);
        doc.text('Error', x + PHOTO_W / 2, y + PHOTO_H / 2, { align: 'center' });
      }
    } else {
      // Marco punteado vacío
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(...C_GRAY); doc.setLineWidth(0.3);
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(x, y, PHOTO_W, PHOTO_H, 'FD');
      doc.setLineDashPattern([], 0);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(190, 190, 190);
      doc.text('Sin foto', x + PHOTO_W / 2, y + PHOTO_H / 2, { align: 'center' });
    }
  }

  // Etiquetas de grupo
  const labelY1 = ROW1_Y + PHOTO_H + LABEL_H;
  const labelY2 = ROW2_Y + PHOTO_H + LABEL_H;

  doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C_GREEN);

  // Fila 1 izq: "ANTES DEL SERVICIO" centrado bajo fotos L1+L2
  const anteriorCX = (xL1 + xL2 + PHOTO_W) / 2;
  doc.text('ANTES DEL SERVICIO', anteriorCX, labelY1, { align: 'center' });

  // Fila 1 der: "DURANTE EL SERVICIO" centrado bajo R1+R2
  const duranteCX = (xR1 + xR2 + PHOTO_W) / 2;
  doc.text('DURANTE EL SERVICIO', duranteCX, labelY1, { align: 'center' });

  // Fila 2 izq: "DESPUES DEL SERVICIO"
  const desplesCX = (xL1 + xL2 + PHOTO_W) / 2;
  doc.text('DESPUES DEL SERVICIO', desplesCX, labelY2, { align: 'center' });

  // Fila 2 der: "ETIQUETA" centrado bajo R1
  doc.text('ETIQUETA', xR1 + PHOTO_W / 2, labelY2, { align: 'center' });

  // Tabla firmas
  drawFirmasTable(doc, 178, reportData);

  // ── Guardar ───────────────────────────────────────────────────────────────
  doc.save(`${reportData.serial}_Prueba.pdf`);
};
