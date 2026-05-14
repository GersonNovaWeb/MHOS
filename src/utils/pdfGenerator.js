import { generarExcelBuffer, generarDiagnosticoTorreBuffer, generarMhosA0143Buffers } from './excelGenerator';

export const generarPDF = async (reportData) => {
  try {
    const FileSaver = await import('file-saver');
    const saveAs = FileSaver.saveAs || FileSaver.default?.saveAs || FileSaver.default;

    const isPreventivo  = reportData.type === 'preventivo';
    const isDiagnostico = reportData.type === 'diagnostico' || reportData._generator === 'diagnostico';
    const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const formData = new FormData();

    if (isPreventivo) {
      const buffers = await generarMhosA0143Buffers(reportData);
      buffers.forEach((buf, i) => {
        formData.append('files', new Blob([buf], { type: xlsxType }), `page${i + 1}.xlsx`);
      });
    } else {
      const excelBuffer = isDiagnostico
        ? await generarDiagnosticoTorreBuffer(reportData)
        : await generarExcelBuffer(reportData);
      formData.append('file', new Blob([excelBuffer], { type: xlsxType }), 'temp.xlsx');
    }

    alert("Generando PDF con LibreOffice... Esto puede tomar unos segundos.");

    const response = await fetch('/api/convert-to-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const detail = errBody.stderr || errBody.stdout || errBody.error || response.statusText;
      throw new Error(`La conversión falló en el servidor: ${detail}`);
    }

    const pdfBlob = await response.blob();
    saveAs(pdfBlob, `${reportData.serial}_Impresion.pdf`);

  } catch (error) {
    console.error("Error en PDF Builder:", error);
    alert("Error al generar PDF. Asegúrate de tener LibreOffice instalado y la API funcionando.");
  }
};
