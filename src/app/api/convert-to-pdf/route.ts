import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const isWindows = os.platform() === 'win32';
const libreOfficePath = isWindows
  ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
  : 'libreoffice';
const pythonExe = isWindows ? 'python' : 'python3';

const PREVENTIVO_RANGES: [number, number][] = [[1,59],[60,100],[101,141],[142,189]];

const PYTHON_SPLIT = `
import sys, zipfile, re
from openpyxl import load_workbook
from openpyxl.worksheet.properties import WorksheetProperties, PageSetupProperties

src, dst, start_row, end_row = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
wb = load_workbook(src)
ws = wb.worksheets[0]
total = ws.max_row
if end_row < total:
    ws.delete_rows(end_row + 1, total - end_row)
if start_row > 1:
    ws.delete_rows(1, start_row - 1)
ws.page_setup.paperSize   = 9
ws.page_setup.orientation = 'portrait'
ws.sheet_properties = WorksheetProperties()
ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
ws.page_setup.fitToWidth  = 1
ws.page_setup.fitToHeight = 1
wb.save(dst)
with zipfile.ZipFile(dst, 'r') as z:
    files = {n: z.read(n) for n in z.namelist()}
xml = files['xl/worksheets/sheet1.xml'].decode('utf-8')
xml = xml.replace('<pageSetUpPr/>', '<pageSetUpPr fitToPage="1"/>')
xml = re.sub(r'<pageSetup[^/]*/>', '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/>', xml)
files['xl/worksheets/sheet1.xml'] = xml.encode('utf-8')
with zipfile.ZipFile(dst, 'w', 8) as z:
    [z.writestr(n, d) for n, d in files.items()]
`;

async function splitXlsx(
  inputPath: string, outputPath: string,
  startRow: number, endRow: number
): Promise<void> {
  await execFileAsync(pythonExe, [
    '-c', PYTHON_SPLIT, inputPath, outputPath,
    String(startRow), String(endRow)
  ], { timeout: 30000 });
}

async function xlsxToPdf(inputPath: string, tempDir: string, profileId: string): Promise<string> {
  const profileDir = path.join(tempDir, `lo_profile_${profileId}`);
  const profileUrl = `file:///${profileDir.replace(/\\/g, '/').replace(/^\//, '')}`;
  const outputPath = inputPath.replace(/\.xlsx$/, '.pdf');

  const { stdout, stderr } = await execFileAsync(libreOfficePath, [
    '--headless', '--norestore', '--nofirststartwizard',
    `-env:UserInstallation=${profileUrl}`,
    '--convert-to', 'pdf', inputPath,
    '--outdir', tempDir,
  ], { timeout: 60000 });

  console.log('LibreOffice stdout:', stdout);
  console.log('LibreOffice stderr:', stderr);

  if (!fs.existsSync(outputPath)) {
    throw Object.assign(new Error('LibreOffice no generó el PDF'), { stdout, stderr });
  }

  return outputPath;
}

async function mergePdfs(pdfPaths: string[], outputPath: string): Promise<void> {
  const script = [
    'from pypdf import PdfWriter',
    'import sys',
    'w = PdfWriter()',
    '[w.append(f) for f in sys.argv[1:]]',
    'w.write(sys.argv[0])',
  ].join(';');
  await execFileAsync(pythonExe, ['-c', script, outputPath, ...pdfPaths], { timeout: 120000 });
}

export async function POST(req: NextRequest) {
  const tempDir = os.tmpdir();
  const uniqueId = Date.now().toString();
  const cleanup: string[] = [];

  try {
    const formData = await req.formData();
    const singleFile = formData.get('file') as Blob | null;
    const multiFiles  = formData.getAll('files') as Blob[];

    if (!singleFile && multiFiles.length === 0) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const filesToConvert = singleFile ? [singleFile] : multiFiles;
    const isPreventivo   = multiFiles.length === 4;
    const pdfPaths: string[] = [];

    for (let i = 0; i < filesToConvert.length; i++) {
      const buffer    = Buffer.from(await filesToConvert[i].arrayBuffer());
      const suffix    = filesToConvert.length === 1 ? '' : `_${i}`;
      const rawPath   = path.join(tempDir, `reporte_${uniqueId}${suffix}_raw.xlsx`);
      const inputPath = path.join(tempDir, `reporte_${uniqueId}${suffix}.xlsx`);
      fs.writeFileSync(rawPath, buffer);
      cleanup.push(rawPath);

      if (isPreventivo) {
        const [startRow, endRow] = PREVENTIVO_RANGES[i];
        await splitXlsx(rawPath, inputPath, startRow, endRow);
      } else {
        fs.copyFileSync(rawPath, inputPath);
      }
      cleanup.push(inputPath);

      const pdfPath = await xlsxToPdf(inputPath, tempDir, `${uniqueId}${suffix}`);
      cleanup.push(pdfPath);
      pdfPaths.push(pdfPath);
    }

    let finalBuffer: Buffer;
    if (pdfPaths.length === 1) {
      finalBuffer = fs.readFileSync(pdfPaths[0]);
    } else {
      const mergedPath = path.join(tempDir, `reporte_${uniqueId}_merged.pdf`);
      cleanup.push(mergedPath);
      await mergePdfs(pdfPaths, mergedPath);
      finalBuffer = fs.readFileSync(mergedPath);
    }

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error en la conversión:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: errorMsg,
      stderr: (error as any)?.stderr || '',
      stdout: (error as any)?.stdout || '',
    }, { status: 500 });
  } finally {
    for (const f of cleanup) {
      try { fs.unlinkSync(f); } catch(e) {}
    }
    try {
      fs.readdirSync(tempDir)
        .filter(name => name.startsWith(`lo_profile_${uniqueId}`))
        .forEach(name => {
          try { fs.rmSync(path.join(tempDir, name), { recursive: true }); } catch(e) {}
        });
    } catch(e) {}
  }
}
