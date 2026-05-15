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

const pythonScript = `
import sys, subprocess, os, shutil

xlsx_src   = sys.argv[1]
output_pdf = sys.argv[2]
lo_path    = sys.argv[3]
tmp_dir    = sys.argv[4]

profile = os.path.join(tmp_dir, 'lo_profile')
profile_url = 'file:///' + profile.replace(os.sep, '/').lstrip('/')

result = subprocess.run(
  [lo_path, '--headless', '--norestore',
   f'-env:UserInstallation={profile_url}',
   '--convert-to', 'pdf', xlsx_src, '--outdir', tmp_dir],
  capture_output=True, timeout=120
)

if result.returncode != 0:
  print('STDERR:', result.stderr.decode(), file=sys.stderr)
  sys.exit(1)

pdf = xlsx_src.replace('.xlsx', '.pdf')
if not os.path.exists(pdf):
  print('PDF no generado', file=sys.stderr)
  sys.exit(1)

shutil.copy(pdf, output_pdf)
print('OK')
try: shutil.rmtree(profile)
except: pass
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
        '-c', pythonScript,
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
