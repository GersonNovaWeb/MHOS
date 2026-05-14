import { generarExcelBuffer, generarDiagnosticoTorreBuffer, generarMhosA0143Buffer } from './excelGenerator';

export const generarPDF = async (reportData) => {
  try {
    const FileSaver = await import('file-saver');
    const saveAs = FileSaver.saveAs || FileSaver.default?.saveAs || FileSaver.default;

    const isPreventivo  = reportData.type === 'preventivo';
    const isDiagnostico = reportData.type === 'diagnostico' || reportData._generator === 'diagnostico';
    const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    let excelBuffer;
    if (isPreventivo) {
      excelBuffer = await generarMhosA0143Buffer(reportData);
    } else if (isDiagnostico) {
      excelBuffer = await generarDiagnosticoTorreBuffer(reportData);
    } else {
      excelBuffer = await generarExcelBuffer(reportData);
    }

    const formData = new FormData();
    formData.append('file', new Blob([excelBuffer], { type: xlsxType }), 'reporte.xlsx');
    if (isPreventivo) formData.append('preventivo', 'true');

    alert('Generando PDF... Esto puede tomar unos segundos.');

    const response = await fetch('/api/convert-to-pdf', {
      method: 'POST',
      body: formData,
    });

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
