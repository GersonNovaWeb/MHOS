import { generarExcelBuffer, generarDiagnosticoTorreBuffer, generarMhosA0143Buffers } from './excelGenerator';

export const generarPDF = async (reportData) => {
  try {
    console.log('pdfGenerator - reportData.type:', reportData.type);
    console.log('pdfGenerator - reportData:', JSON.stringify(reportData).substring(0, 200));
    const FileSaver = await import('file-saver');
    const saveAs = FileSaver.saveAs || FileSaver.default?.saveAs || FileSaver.default;

    const tipoReporte = (reportData.type || '').toLowerCase();
    const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const form = new FormData();
    if (tipoReporte === 'preventivo') {
      const pageBuffers = await generarMhosA0143Buffers(reportData);
      pageBuffers.forEach((buffer, index) => {
        form.append('files', new Blob([buffer], { type: xlsxType }), `preventivo_${index + 1}.xlsx`);
      });
    } else {
      const excelBuffer = tipoReporte === 'diagnostico'
        ? await generarDiagnosticoTorreBuffer(reportData)
        : await generarExcelBuffer(reportData);
      form.append('file', new Blob([excelBuffer], { type: xlsxType }), 'reporte.xlsx');
    }

    alert('Generando PDF... Esto puede tomar unos segundos.');

    const endpoint = tipoReporte === 'preventivo'
      ? '/api/convert-preventivo'
      : '/api/convert-to-pdf';

    const response = await fetch(endpoint, { method: 'POST', body: form });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || 'La conversión falló en el servidor.');
    }

    const pdfBlob = await response.blob();
    saveAs(pdfBlob, `${reportData.serial}_Impresion.pdf`);

  } catch (error) {
    console.error('Error en PDF Builder:', error);
    alert(`Error al generar PDF: ${error.message}`);
  }
};
