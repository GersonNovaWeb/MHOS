const isProd = process.env.NODE_ENV === 'production';
const base = isProd ? '/Report_MHOS' : '';

const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn(`No se pudo cargar la imagen: ${imageUrl}`);
    return null;
  }
};

const cropToSquare = (base64Str) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const size = Math.min(img.width, img.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, size, size);
    resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
  };
  img.onerror = () => resolve(base64Str);
  img.src = `data:image/jpeg;base64,${base64Str}`;
});

const cargarFormatoPreventivo = async (base) => {
  const ExcelJS = (await import('exceljs')).default;
  const response = await fetch(`${base}/templates/Formato_Preventivo.xlsx`);
  if (!response.ok) throw new Error(`Formato_Preventivo.xlsx no encontrado: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return { ExcelJS, workbook };
};

const cargarFormatoDiagnostico = async (base) => {
  const ExcelJS = (await import('exceljs')).default;
  const response = await fetch(`${base}/templates/Formatos.xlsx`);
  if (!response.ok) throw new Error(`Formatos.xlsx no encontrado: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return { ExcelJS, workbook };
};

export const construirWorkbook = async (reportData) => {
  const { workbook } = await cargarFormatoPreventivo(base);
  const ws = workbook.worksheets[0];

  ws.getCell('D5').value = reportData.serial;
  ws.getCell('D6').value = reportData.date;
  ws.getCell('C8').value = reportData.client;
  ws.getCell('C10').value = reportData.direccion;
  ws.getCell('D13').value = reportData.contrato;
  ws.getCell('J13').value = reportData.partida;
  ws.getCell('C26').value = reportData.equipo;
  ws.getCell('C27').value = reportData.marca;
  ws.getCell('C28').value = reportData.modelo;
  ws.getCell('J26').value = reportData.numSerieEq;
  ws.getCell('J27').value = reportData.folioSsm;
  ws.getCell('J28').value = reportData.ubicacion;
  ws.getCell('C31').value = reportData.falla;
  ws.getCell('D33').value = reportData.condiciones;
  ws.getCell('B37').value = "Trabajos realizados/Notas/Observaciones/Recomendaciones:\n\n" + (reportData.trabajos || reportData.description || '');

  const celdasRefacciones = ['E48','B49','B50','B51'];
  const refaccionesArr = Array.isArray(reportData.refacciones)
    ? reportData.refacciones
    : (reportData.refacciones ? [reportData.refacciones] : []);
  refaccionesArr.forEach((ref, i) => {
    if(i < 4 && ref) ws.getCell(celdasRefacciones[i]).value = ref;
  });

  [54,55,56].forEach((fila, i) => {
    const med = reportData.medicion?.[i];
    if(med) {
      ws.getCell(`B${fila}`).value = med.equipo;
      ws.getCell(`D${fila}`).value = med.marca;
      ws.getCell(`G${fila}`).value = med.modelo;
      ws.getCell(`L${fila}`).value = med.serie;
    }
  });

  ws.getCell('B58').value = reportData.firmaEntrega;
  ws.getCell('D58').value = reportData.firmaRecibe;
  ws.getCell('G58').value = reportData.firmaValida;

  ws.getCell('D68').value = reportData.serial;
  ws.getCell('D69').value = reportData.date;
  ws.getCell('C71').value = reportData.client;
  ws.getCell('C72').value = reportData.direccion;
  ws.getCell('E76').value = reportData.contrato;
  ws.getCell('J76').value = reportData.partida;
  ws.getCell('C82').value = reportData.equipo;
  ws.getCell('C83').value = reportData.marca;
  ws.getCell('C84').value = reportData.modelo;
  ws.getCell('J82').value = reportData.numSerieEq;
  ws.getCell('J83').value = reportData.folioSsm;
  ws.getCell('J84').value = reportData.ubicacion;

  for (let i = 0; i < 28; i++) {
    if (reportData.checklist?.[i]) {
      const celda = ws.getCell(`K${88+i}`);
      celda.value = 'X';
      celda.font = { bold: true };
    }
  }

  ws.getCell('B121').value = reportData.firmaEntrega;
  ws.getCell('D121').value = reportData.firmaRecibe;
  ws.getCell('G121').value = reportData.firmaValida;

  ws.getCell('D132').value = reportData.serial;
  ws.getCell('D133').value = reportData.date;
  ws.getCell('C135').value = reportData.client;
  ws.getCell('C137').value = reportData.contrato;
  ws.getCell('J137').value = reportData.partida;

  ws.getCell('B175').value = reportData.firmaEntrega;
  ws.getCell('D175').value = reportData.firmaRecibe;
  ws.getCell('G175').value = reportData.firmaValida;

  const writeLabel = (addr, l1, l2) => {
    try {
      const cell = ws.getCell(addr);
      cell.value = { richText: [{text:l1+'\n'},{text:l2,font:{bold:true}}] };
      cell.alignment = { wrapText:true, vertical:'top', horizontal:'center' };
    } catch(e) {}
  };
  writeLabel('B178','Ing/Tec que realizo servicio (MANHOS)','Nombre y Firma (Entrega)');
  writeLabel('D178','Director/Administrador','Recibe/Autoriza');
  writeLabel('G178','Ing. Adrián Martinez Robles','Valida');
  try {
    const c = ws.getCell('K178');
    c.value = 'Sello de la Unidad';
    c.alignment = { wrapText:true, vertical:'top', horizontal:'center' };
  } catch(e) {}

  const addImg = async (b64, col, row) => {
    if(!b64) return;
    try {
      const sq = await cropToSquare(b64);
      const id = workbook.addImage({ base64:sq, extension:'jpeg' });
      ws.addImage(id, { tl:{col,row}, ext:{width:180,height:180}, editAs:'absolute' });
    } catch(e) {}
  };

  if(reportData.fotos) {
    await addImg(reportData.fotos.antes1,   1, 141);
    await addImg(reportData.fotos.antes2,   2, 141);
    await addImg(reportData.fotos.antes3,   3, 141);
    await addImg(reportData.fotos.durante1, 6, 141);
    await addImg(reportData.fotos.durante2, 9, 141);
    await addImg(reportData.fotos.despues1, 1, 154);
    await addImg(reportData.fotos.despues2, 2, 154);
    await addImg(reportData.fotos.etiqueta, 8, 154);
  }

  ws.pageSetup.margins = { left:0.5, right:0.5, top:0.5, bottom:0.5, header:0, footer:0 };
  ws.pageSetup.printArea = 'A1:L192';
  ws.pageSetup.paperSize = 1;
  ws.pageSetup.orientation = 'portrait';
  ws.pageSetup.fitToPage = true;
  ws.pageSetup.fitToWidth = 1;
  ws.pageSetup.fitToHeight = 3;

  return workbook;
};

export const generarExcel = async (reportData) => {
  try {
    const FileSaver = await import('file-saver');
    const saveAs = FileSaver.saveAs || FileSaver.default?.saveAs || FileSaver.default;
    const workbook = await construirWorkbook(reportData);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Reporte_${reportData.serial}.xlsx`);
  } catch (error) {
    console.error("Error:", error);
    alert("Error al generar el archivo.");
  }
};

export const generarExcelBuffer = async (reportData) => {
  const workbook = await construirWorkbookMhosA0143(reportData);
  return await workbook.xlsx.writeBuffer();
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const t = (v, max) => (v ?? '').toString().trim().slice(0, max);

const setTipoServicio = (ws, tipo, offset = 0) => {
  const map = {
    preventivo:   `D${14 + offset}`,
    correctivo:   `D${17 + offset}`,
    garantia:     `G${14 + offset}`,
    diagnostico:  `G${17 + offset}`,
    instalacion:  `I${14 + offset}`,
    capacitacion: `I${17 + offset}`,
  };
  const addr = map[tipo];
  if (addr) ws.getCell(addr).value = 'X';
};

// ─── Diagnóstico Torre — Formato_Diagnostico.xlsx, worksheets[0] ─────────────

const setEncabezadoReporte = (ws, d, rowOffset) => {
  const r = n => n + rowOffset;
  ws.getCell(`D${r(2)}`).value  = t(d.serial,      20);
  ws.getCell(`D${r(3)}`).value  = t(d.date,        20);
  ws.getCell(`C${r(5)}`).value  = t(d.client,     100);
  ws.getCell(`C${r(6)}`).value  = t(d.direccion,  150);
  ws.getCell(`C${r(10)}`).value = t(d.contrato,    50);
  setTipoServicio(ws, d.tipoServicio);
  ws.getCell(`C${r(23)}`).value = t(d.equipo,      50);
  ws.getCell(`J${r(23)}`).value = t(d.numSerieEq || d.numSerie || '', 50);
  ws.getCell(`C${r(24)}`).value = t(d.marca,       50);
  ws.getCell(`C${r(25)}`).value = t(d.modelo,      50);
  ws.getCell(`J${r(25)}`).value = t(d.ubicacion,   50);
  ws.getCell(`C${r(27)}`).value = t(d.falla,      200);
  ws.getCell(`D${r(29)}`).value = t(d.condiciones,100);
  ws.getCell(`B${r(33)}`).value = t(d.trabajos,  1698);
  const _refs = Array.isArray(d.refacciones) ? d.refacciones : (d.refacciones ? [d.refacciones] : []);
  ws.getCell(`E${r(45)}`).value = _refs.filter(Boolean).join(', ');

  for (let i = 0; i < 6; i++) {
    const med = d.medicion?.[i];
    if (!med) continue;
    const row = r(52) + i;
    ws.getCell(`B${row}`).value = t(med.equipo, 50);
    ws.getCell(`D${row}`).value = t(med.marca,  50);
    ws.getCell(`F${row}`).value = t(med.modelo, 50);
    ws.getCell(`J${row}`).value = t(med.serie,  50);
  }
  ws.getCell(`B${r(58)}`).value = t(d.firmaEntrega, 100);
  ws.getCell(`D${r(58)}`).value = t(d.firmaRecibe,  100);
  ws.getCell(`G${r(58)}`).value = t(d.firmaValida,  100);

};

export const construirWorkbookDiagnostico = async (reportData) => {
  const b = isProd ? '/Report_MHOS' : '';
  const ExcelJS = (await import('exceljs')).default;
  const response = await fetch(`${b}/templates/Formato_Diagnostico.xlsx`);
  if (!response.ok) throw new Error(`Formato_Diagnostico.xlsx no encontrado: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const ws = workbook.worksheets[0];

  // Cargar header y footer
  const headerBase64 = await getBase64ImageFromUrl(`${b}/templates/header.png`);
  const footerBase64 = await getBase64ImageFromUrl(`${b}/templates/footer.png`);

  console.log('Header cargado:', !!headerBase64);
  console.log('Footer cargado:', !!footerBase64);

  // Alturas originales exactas del Excel
  const rowHeights = {
    1:6.6, 2:19.95, 3:24.6, 4:9.0, 5:22.2, 6:8.4, 7:15.75,
    8:18.75, 9:8.4, 10:15.75, 11:4.95, 12:8.4, 13:9.6,
    14:15.0, 15:15.0, 16:0.6, 17:15.0, 18:15.75, 19:0.6,
    20:10.2, 21:15.75, 22:15.75, 23:15.75, 24:15.75, 25:22.5,
    26:7.2, 27:15.75, 28:15.75, 29:15.75, 30:15.75, 31:9.75,
    32:7.95, 33:15.75, 34:17.25, 35:11.25, 36:18.0, 37:7.5,
    38:49.5, 39:3.75, 40:32.25, 41:15.75, 42:15.75, 43:5.25,
    44:6.75, 45:15.75, 46:15.75, 47:15.75, 48:15.75, 49:15.0,
    50:15.0, 51:15.0, 52:15.0, 53:14.25, 54:14.25, 55:56.25,
    56:15.75, 57:15.75, 58:39.75
  };
  Object.entries(rowHeights).forEach(([row, height]) => {
    ws.getRow(parseInt(row)).height = height;
  });

  ws.getRow(1).height = 75;
  ws.getRow(2).height = 30;
  ws.getRow(3).height = 28;

  // Anchos originales exactos del Excel
  const colWidths = {
    A:5.109375, B:18.109375, C:15.5546875, D:8.44140625,
    E:12.6640625, F:10.109375, G:6.44140625, H:2.5546875,
    I:10.109375, J:13.0, K:13.0, L:19.5546875, M:3.88671875
  };
  Object.entries(colWidths).forEach(([col, width]) => {
    ws.getColumn(col).width = width;
  });

  // Header en el tope de la página
  if (headerBase64) {
    const headerId = workbook.addImage({ base64: headerBase64, extension: 'png' });
    ws.addImage(headerId, {
      tl: { col: 1, row: 0 },
      br: { col: 11, row: 1 },
      editAs: 'absolute'
    });
  }

  // Footer igual que referencia: pegado al final
  if (footerBase64) {
    const footerId = workbook.addImage({ base64: footerBase64, extension: 'png' });
    ws.addImage(footerId, {
      tl: { col: 1, row: 59 },
      br: { col: 12, row: 64 },
      editAs: 'absolute'
    });
  }

  // Llenar datos
  setEncabezadoReporte(ws, reportData, 0);

  // Limpiar X de tipo servicio - el formato diagnóstico lo maneja visualmente
  ['D14','D15','D16','D17','D18','D19',
   'G14','G15','G16','G17','G18','G19',
   'I14','I15','I16','I17','I18','I19'].forEach(addr => {
    try { ws.getCell(addr).value = null; } catch(e) {}
  });

  const firmaAlignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };

  ws.getCell('B55').value = reportData.jobName || reportData.tecnico || '';
  ws.getCell('B55').alignment = firmaAlignment;

  ws.getCell('D55').value = reportData.firmaCoordinador || '';
  ws.getCell('D55').alignment = firmaAlignment;

  ws.getCell('F55').value = reportData.firmaVobo || '';
  ws.getCell('F55').alignment = firmaAlignment;

  ws.getCell('I55').value = reportData.firmaAdministrador || '';
  ws.getCell('I55').alignment = firmaAlignment;

  ws.getCell('K55').value = reportData.selloUnidad || '';
  ws.getCell('K55').alignment = firmaAlignment;

  // B58 → label fijo siempre
  ws.getCell('B58').value = 'Tec./Ing. De Servicio\nNombre y Firma';
  ws.getCell('B58').alignment = { wrapText: true, vertical: 'top', horizontal: 'center' };

  ws.pageSetup.paperSize          = 1;
  ws.pageSetup.orientation        = 'portrait';
  ws.pageSetup.fitToPage          = true;
  ws.pageSetup.fitToWidth         = 1;
  ws.pageSetup.fitToHeight        = 1;
  ws.pageSetup.printArea          = 'A1:M62';
  ws.pageSetup.horizontalCentered = false;
  ws.pageSetup.verticalCentered   = false;
  ws.pageSetup.margins = {
    left:   0.4,
    right:  0.4,
    top:    0.55,
    bottom: 0.0,
    header: 0.0,
    footer: 0.0,
  };

  return workbook;
};

export const generarDiagnosticoTorre = async (reportData) => {
  try {
    const FileSaver = await import('file-saver');
    const saveAs = FileSaver.saveAs || FileSaver.default?.saveAs || FileSaver.default;
    const workbook = await construirWorkbookDiagnostico(reportData);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Diagnostico_${reportData.serial}.xlsx`);
  } catch (error) {
    console.error('Error generarDiagnosticoTorre:', error);
    alert('Error al generar el archivo de diagnóstico.');
  }
};

export const generarDiagnosticoTorreBuffer = async (reportData) => {
  const workbook = await construirWorkbookDiagnostico(reportData);
  return await workbook.xlsx.writeBuffer();
};

// ─── MHOS-A0143 Preventivo — Formato_Preventivo.xlsx, worksheets[0] ──────────

export const construirWorkbookMhosA0143 = async (reportData) => {
  const b = isProd ? '/Report_MHOS' : '';
  const ExcelJS = (await import('exceljs')).default;
  const response = await fetch(`${b}/templates/Formato_Preventivo.xlsx`);
  if (!response.ok) throw new Error(`Formato_Preventivo.xlsx no encontrado: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  const ws = workbook.worksheets[0];

  const headerBase64 = await getBase64ImageFromUrl(`${b}/templates/header.png`);
  const footerBase64 = await getBase64ImageFromUrl(`${b}/templates/footer.png`);

  // Alturas fila inicio de cada página
  ws.getRow(1).height   = 75;
  ws.getRow(60).height  = 75;
  ws.getRow(101).height = 75;
  ws.getRow(142).height = 75;

  // Headers
  if (headerBase64) {
    const hId = workbook.addImage({ base64: headerBase64, extension: 'png' });
    [
      { tl: { col: 1, row: 0   }, br: { col: 11, row: 1   } },
      { tl: { col: 1, row: 60  }, br: { col: 11, row: 61  } },
      { tl: { col: 1, row: 101 }, br: { col: 11, row: 102 } },
      { tl: { col: 1, row: 142 }, br: { col: 11, row: 143 } },
    ].forEach(pos => ws.addImage(hId, { ...pos, editAs: 'absolute' }));
  }

  // Footers
  if (footerBase64) {
    const fId = workbook.addImage({ base64: footerBase64, extension: 'png' });
    [
      { tl: { col: 1, row: 57  }, br: { col: 11, row: 62  } },
      { tl: { col: 1, row: 97  }, br: { col: 11, row: 102 } },
      { tl: { col: 1, row: 138 }, br: { col: 11, row: 143 } },
      { tl: { col: 1, row: 184 }, br: { col: 11, row: 190 } },
    ].forEach(pos => ws.addImage(fId, { ...pos, editAs: 'absolute' }));
  }

  // Sección 1 — Reporte principal
  setEncabezadoReporte(ws, reportData, 0);

  // Nombre técnico en cada página
  const nombreTecnico = t(reportData.jobName || reportData.tecnico || '', 50);
  ws.getCell('B55').value  = nombreTecnico;
  ws.getCell('B96').value  = nombreTecnico;
  ws.getCell('B137').value = nombreTecnico;
  ws.getCell('B186').value = nombreTecnico;

  // Sección 2 — Check List 1 (filas 61–99)
  ws.getCell('D61').value = t(reportData.serial,    20);
  ws.getCell('D62').value = t(reportData.date,       20);
  ws.getCell('C64').value = t(reportData.client,    100);
  ws.getCell('C70').value = t(reportData.equipo,     50);
  ws.getCell('J70').value = t(reportData.numSerie,   50);
  ws.getCell('C71').value = t(reportData.marca,      50);
  ws.getCell('C72').value = t(reportData.modelo,     50);
  ws.getCell('J72').value = t(reportData.ubicacion,  50);
  for (let i = 0; i < 18; i++) {
    if (reportData.checklist1?.[i]) {
      ws.getCell(`L${77+i}`).value = 'X';
      ws.getCell(`L${77+i}`).font = { bold: true };
    }
  }

  // Sección 3 — Check List 2 (filas 102–140)
  ws.getCell('D102').value = t(reportData.serial,    20);
  ws.getCell('D103').value = t(reportData.date,       20);
  ws.getCell('C105').value = t(reportData.client,    100);
  ws.getCell('C111').value = t(reportData.equipo,     50);
  ws.getCell('J111').value = t(reportData.numSerie,   50);
  ws.getCell('C112').value = t(reportData.marca,      50);
  ws.getCell('C113').value = t(reportData.modelo,     50);
  ws.getCell('J113').value = t(reportData.ubicacion,  50);
  for (let i = 0; i < 12; i++) {
    if (reportData.checklist2?.[i]) {
      ws.getCell(`L${118+i}`).value = 'X';
      ws.getCell(`L${118+i}`).font = { bold: true };
    }
  }

  // Sección 4 — Evidencia Fotográfica (filas 143–189)
  ws.getCell('D143').value = t(reportData.serial,     20);
  ws.getCell('D144').value = t(reportData.date,        20);
  ws.getCell('C146').value = t(reportData.client,     100);
  ws.getCell('C148').value = t(reportData.contrato,    50);
  ws.getCell('F148').value = t(reportData.partida,     50);
  ws.getCell('J148').value = t(reportData.subpartida,  50);

  // Fotos
  const addImg = async (b64, col, row) => {
    if (!b64 || b64.length < 500) return;
    try {
      const sq = await cropToSquare(b64);
      const id = workbook.addImage({ base64: sq, extension: 'jpeg' });
      ws.addImage(id, { tl:{col,row}, ext:{width:180,height:180}, editAs:'absolute' });
    } catch(e) {}
  };
  if (reportData.fotos) {
    await addImg(reportData.fotos.antes1,   1, 152);
    await addImg(reportData.fotos.antes2,   4, 152);
    await addImg(reportData.fotos.antes3,   7, 152);
    await addImg(reportData.fotos.durante1, 1, 165);
    await addImg(reportData.fotos.durante2, 4, 165);
    await addImg(reportData.fotos.despues1, 1, 178);
    await addImg(reportData.fotos.despues2, 4, 178);
  }

  ws.pageSetup.paperSize   = 1;
  ws.pageSetup.orientation = 'portrait';
  ws.pageSetup.fitToPage   = false;
  ws.pageSetup.scale       = 69;
  ws.pageSetup.printArea   = 'A1:M189';
  ws.pageSetup.horizontalCentered = false;
  ws.pageSetup.verticalCentered   = false;
  ws.pageSetup.margins = {
    left: 0.4, right: 0.4,
    top: 0.55, bottom: 0.0,
    header: 0.0, footer: 0.0
  };

  return workbook;
};

export const generarMhosA0143 = async (reportData) => {
  try {
    const FileSaver = await import('file-saver');
    const saveAs = FileSaver.saveAs || FileSaver.default?.saveAs || FileSaver.default;
    const workbook = await construirWorkbookMhosA0143(reportData);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `MHOS-A0143_${reportData.serial}.xlsx`);
  } catch (error) {
    console.error('Error generarMhosA0143:', error);
    alert('Error al generar el archivo MHOS-A0143.');
  }
};

export const generarMhosA0143Buffers = async (reportData) => {
  const b = isProd ? '/Report_MHOS' : '';
  const ExcelJS = (await import('exceljs')).default;

  const response = await fetch(`${b}/templates/Formato_Preventivo.xlsx`);
  if (!response.ok) throw new Error(`Formato_Preventivo.xlsx no encontrado`);
  const templateBuffer = await response.arrayBuffer();

  const headerBase64 = await getBase64ImageFromUrl(`${b}/templates/header.png`);
  const footerBase64 = await getBase64ImageFromUrl(`${b}/templates/footer.png`);

  const loadWb = async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(templateBuffer.slice(0));
    return wb;
  };

  const applyPageSetup = (ws, printArea) => {
    ws.pageSetup.paperSize   = 9;
    ws.pageSetup.orientation = 'portrait';
    ws.pageSetup.fitToPage   = false;
    ws.pageSetup.scale       = 69;
    ws.pageSetup.fitToWidth  = 1;
    ws.pageSetup.printArea   = printArea;
    ws.pageSetup.margins = { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0, footer: 0 };
  };

  const buildPage1 = async (d) => {
    const wb = await loadWb();
    const ws = wb.worksheets[0];
    ws.getRow(1).height = 75;
    if (headerBase64) {
      const hId = wb.addImage({ base64: headerBase64, extension: 'png' });
      ws.addImage(hId, { tl: { col: 1, row: 0 }, br: { col: 11, row: 1 }, editAs: 'absolute' });
    }
    if (footerBase64) {
      const fId = wb.addImage({ base64: footerBase64, extension: 'png' });
      ws.addImage(fId, { tl: { col: 1, row: 57 }, br: { col: 11, row: 62 }, editAs: 'absolute' });
    }
    setEncabezadoReporte(ws, d, 0);
    ws.getCell('B58').value = t(d.firmaEntrega, 100);
    ws.getCell('D58').value = t(d.firmaRecibe,  100);
    ws.getCell('G58').value = t(d.firmaValida,  100);
    applyPageSetup(ws, 'A1:M59');
    return wb.xlsx.writeBuffer();
  };

  const buildPage2 = async (d) => {
    const wb = await loadWb();
    const ws = wb.worksheets[0];
    ws.getRow(60).height = 75;
    if (headerBase64) {
      const hId = wb.addImage({ base64: headerBase64, extension: 'png' });
      ws.addImage(hId, { tl: { col: 1, row: 59 }, br: { col: 11, row: 60 }, editAs: 'absolute' });
    }
    if (footerBase64) {
      const fId = wb.addImage({ base64: footerBase64, extension: 'png' });
      ws.addImage(fId, { tl: { col: 1, row: 97 }, br: { col: 11, row: 102 }, editAs: 'absolute' });
    }
    ws.getCell('D61').value = t(d.serial,    20);
    ws.getCell('D62').value = t(d.date,       20);
    ws.getCell('B64').value = t(d.client,    100);
    ws.getCell('C70').value = t(d.equipo,                        50);
    ws.getCell('J70').value = t(d.numSerieEq || d.numSerie || '', 50);
    ws.getCell('C71').value = t(d.marca,                         50);
    ws.getCell('C72').value = t(d.modelo,                        50);
    ws.getCell('G72').value = t(d.ubicacion,                     50);
    for (let i = 0; i < 18; i++) {
      if (d.checklist1?.[i]) {
        ws.getCell(`L${77 + i}`).value = 'X';
        ws.getCell(`L${77 + i}`).font  = { bold: true };
      }
    }
    ws.getCell('B99').value = t(d.firmaEntrega, 100);
    ws.getCell('D99').value = t(d.firmaRecibe,  100);
    ws.getCell('G99').value = t(d.firmaValida,  100);
    applyPageSetup(ws, 'A60:M100');
    return wb.xlsx.writeBuffer();
  };

  const buildPage3 = async (d) => {
    const wb = await loadWb();
    const ws = wb.worksheets[0];
    ws.getRow(101).height = 75;
    if (headerBase64) {
      const hId = wb.addImage({ base64: headerBase64, extension: 'png' });
      ws.addImage(hId, { tl: { col: 1, row: 100 }, br: { col: 11, row: 101 }, editAs: 'absolute' });
    }
    if (footerBase64) {
      const fId = wb.addImage({ base64: footerBase64, extension: 'png' });
      ws.addImage(fId, { tl: { col: 1, row: 138 }, br: { col: 11, row: 143 }, editAs: 'absolute' });
    }
    ws.getCell('D102').value = t(d.serial,    20);
    ws.getCell('D103').value = t(d.date,       20);
    ws.getCell('B105').value = t(d.client,    100);
    ws.getCell('C111').value = t(d.equipo,     50);
    ws.getCell('J111').value = t(d.numSerieEq || d.numSerie || '', 50);
    ws.getCell('C112').value = t(d.marca,      50);
    ws.getCell('C113').value = t(d.modelo,     50);
    ws.getCell('G113').value = t(d.ubicacion,  50);
    for (let i = 0; i < 12; i++) {
      if (d.checklist2?.[i]) {
        ws.getCell(`L${118 + i}`).value = 'X';
        ws.getCell(`L${118 + i}`).font  = { bold: true };
      }
    }
    ws.getCell('B140').value = t(d.firmaEntrega, 100);
    ws.getCell('D140').value = t(d.firmaRecibe,  100);
    ws.getCell('G140').value = t(d.firmaValida,  100);
    applyPageSetup(ws, 'A101:M141');
    return wb.xlsx.writeBuffer();
  };

  const buildPage4 = async (d) => {
    const wb = await loadWb();
    const ws = wb.worksheets[0];
    ws.getRow(142).height = 75;
    if (headerBase64) {
      const hId = wb.addImage({ base64: headerBase64, extension: 'png' });
      ws.addImage(hId, { tl: { col: 1, row: 141 }, br: { col: 11, row: 142 }, editAs: 'absolute' });
    }
    if (footerBase64) {
      const fId = wb.addImage({ base64: footerBase64, extension: 'png' });
      ws.addImage(fId, { tl: { col: 1, row: 184 }, br: { col: 11, row: 190 }, editAs: 'absolute' });
    }
    ws.getCell('D143').value = t(d.serial,     20);
    ws.getCell('D144').value = t(d.date,        20);
    ws.getCell('B146').value = t(d.client,     100);
    ws.getCell('C148').value = t(d.contrato,    50);
    ws.getCell('F148').value = t(d.partida,     50);
    ws.getCell('J148').value = t(d.subpartida,  50);
    const addFoto = async (b64, col, row) => {
      if (!b64 || b64.length < 500) return;
      try {
        const sq = await cropToSquare(b64);
        const id = wb.addImage({ base64: sq, extension: 'jpeg' });
        ws.addImage(id, { tl: { col, row }, ext: { width: 180, height: 180 }, editAs: 'absolute' });
      } catch(e) {}
    };
    if (d.fotos) {
      await addFoto(d.fotos.antes1,   1, 152);
      await addFoto(d.fotos.antes2,   4, 152);
      await addFoto(d.fotos.antes3,   7, 152);
      await addFoto(d.fotos.durante1, 1, 165);
      await addFoto(d.fotos.durante2, 4, 165);
      await addFoto(d.fotos.despues1, 1, 178);
      await addFoto(d.fotos.despues2, 4, 178);
    }
    ws.getCell('B189').value = t(d.firmaEntrega, 100);
    ws.getCell('D189').value = t(d.firmaRecibe,  100);
    ws.getCell('G189').value = t(d.firmaValida,  100);
    applyPageSetup(ws, 'A142:M189');
    return wb.xlsx.writeBuffer();
  };

  const [b1, b2, b3, b4] = await Promise.all([
    buildPage1(reportData),
    buildPage2(reportData),
    buildPage3(reportData),
    buildPage4(reportData),
  ]);
  return [b1, b2, b3, b4];
};

export const generarMhosA0143Buffer = async (reportData) => {
  const workbook = await construirWorkbookMhosA0143(reportData);
  const excelBuffer = await workbook.xlsx.writeBuffer();

  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(excelBuffer);

  const sheetFiles = Object.keys(zip.files).filter(f =>
    f.match(/xl\/worksheets\/sheet\d+\.xml/)
  );
  const sheetFile = sheetFiles[0];
  let sheetXml = await zip.file(sheetFile).async('text');

  const rowBreaksXml = '<rowBreaks count="4" manualBreakCount="4">' +
    '<brk id="1" max="12" man="1"/>' +
    '<brk id="59" max="12" man="1"/>' +
    '<brk id="100" max="12" man="1"/>' +
    '<brk id="141" max="12" man="1"/>' +
    '</rowBreaks>';

  sheetXml = sheetXml.replace(/<rowBreaks[^>]*>.*?<\/rowBreaks>/gs, '');
  sheetXml = sheetXml.replace('</worksheet>', rowBreaksXml + '</worksheet>');

  zip.file(sheetFile, sheetXml);
  return await zip.generateAsync({ type: 'arraybuffer' });
};

