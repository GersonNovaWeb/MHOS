import { generarExcelBuffer, generarDiagnosticoTorreBuffer, generarMhosA0143Buffer } from './excelGenerator';

export const generarPDF = async (reportData) => {
  try {
    const FileSaver = await import('file-saver');
    const saveAs = FileSaver.saveAs || FileSaver.default?.saveAs || FileSaver.default;

    const excelBuffer = reportData.type === 'diagnostico' || reportData._generator === 'diagnostico'
      ? await generarDiagnosticoTorreBuffer(reportData)
      : reportData.type === 'preventivo'
      ? await generarMhosA0143Buffer(reportData)
      : await generarExcelBuffer(reportData);

    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const formData = new FormData();

    formData.append('file', blob, 'temp.xlsx');

    alert("Generando PDF con LibreOffice... Esto puede tomar unos segundos.");

    const response = await fetch('/api/convert-to-pdf', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('La conversión falló en el servidor.');
    }

    const pdfBlob = await response.blob();
    saveAs(pdfBlob, `${reportData.serial}_Impresion.pdf`);

  } catch (error) {
    console.error("Error en PDF Builder:", error);
    alert("Error al generar PDF. Asegúrate de tener LibreOffice instalado y la API funcionando.");
  }
};
