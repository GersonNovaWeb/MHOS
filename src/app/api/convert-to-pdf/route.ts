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

const PYTHON_FULL = `
import sys, os, zipfile, re, subprocess, shutil
from openpyxl import load_workbook
from openpyxl.worksheet.properties import WorksheetProperties, PageSetupProperties

xlsx_src   = sys.argv[1]
output_pdf = sys.argv[2]
lo_path    = sys.argv[3]
tmp_dir    = sys.argv[4]

RANGES = [(1,59),(60,100),(101,141),(142,189)]

def make_page(src, start_row, end_row, dst):
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

pdf_files = []
for i, (s, e) in enumerate(RANGES):
    page_xlsx = os.path.join(tmp_dir, f'page_{i}.xlsx')
    make_page(xlsx_src, s, e, page_xlsx)
    profile = os.path.join(tmp_dir, f'lo_profile_{i}')
    profile_url = 'file:///' + profile.replace(os.sep, '/').lstrip('/')
    subprocess.run([lo_path,'--headless','--norestore',
        f'-env:UserInstallation={profile_url}',
        '--convert-to','pdf', page_xlsx, '--outdir', tmp_dir],
        check=True, capture_output=True, timeout=60)
    pdf = page_xlsx.replace('.xlsx','.pdf')
    if os.path.exists(pdf):
        pdf_files.append(pdf)
    try: shutil.rmtree(profile)
    except: pass

from pypdf import PdfWriter
w = PdfWriter()
[w.append(p) for p in pdf_files]
w.write(output_pdf)
print(f'OK: {len(pdf_files)} paginas')
`;

async function xlsxToPdf(inputPath: string, tempDir: string, profileId: string): Promise<string> {
  const profileDir = path.join(tempDir, `lo_profile_${profileId}`);
  const profileUrl = `file:///${profileDir.replace(/\\/g, '/').replace(/^\//, '')}`;
  const outputPath = inputPath.replace(/\.xlsx$/, '.pdf');
  await execFileAsync(libreOfficePath, [
    '--headless', '--norestore', '--nofirststartwizard',
    `-env:UserInstallation=${profileUrl}`,
    '--convert-to', 'pdf', inputPath,
    '--outdir', tempDir,
  ], { timeout: 60000 });
  if (!fs.existsSync(outputPath)) throw new Error('LibreOffice no generó el PDF');
  return outputPath;
}

export async function POST(req: NextRequest) {
  const tempDir  = os.tmpdir();
  const uniqueId = Date.now().toString();
  const cleanup: string[] = [];

  try {
    const formData     = await req.formData();
    const file          = formData.get('file') as Blob | null;
    const isPreventivo  = formData.get('preventivo') === 'true';

    if (!file) return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });

    const xlsxPath = path.join(tempDir, `reporte_${uniqueId}.xlsx`);
    fs.writeFileSync(xlsxPath, Buffer.from(await file.arrayBuffer()));
    cleanup.push(xlsxPath);

    let finalBuffer: Buffer;

    if (isPreventivo) {
      const outputPdf = path.join(tempDir, `reporte_${uniqueId}_merged.pdf`);
      cleanup.push(outputPdf);
      const { stdout, stderr } = await execFileAsync(pythonExe, [
        '-c', PYTHON_FULL,
        xlsxPath, outputPdf, libreOfficePath, tempDir
      ], { timeout: 300000 });
      console.log('[PREVENTIVO] stdout:', stdout);
      if (stderr) console.error('[PREVENTIVO] stderr:', stderr);
      if (!fs.existsSync(outputPdf)) throw new Error(`Python no generó PDF. ${stdout} ${stderr}`);
      finalBuffer = fs.readFileSync(outputPdf);
    } else {
      const pdfPath = await xlsxToPdf(xlsxPath, tempDir, uniqueId);
      cleanup.push(pdfPath);
      finalBuffer = fs.readFileSync(pdfPath);
    }

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte.pdf"`,
      },
    });

  } catch (error) {
    console.error('[PDF ERROR]', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    for (const f of cleanup) { try { fs.unlinkSync(f); } catch(e) {} }
  }
}
