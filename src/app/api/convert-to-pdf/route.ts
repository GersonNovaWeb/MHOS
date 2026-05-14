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
    const pdfPaths: string[] = [];

    for (let i = 0; i < filesToConvert.length; i++) {
      const buffer    = Buffer.from(await filesToConvert[i].arrayBuffer());
      const suffix    = filesToConvert.length === 1 ? '' : `_${i}`;
      const inputPath = path.join(tempDir, `reporte_${uniqueId}${suffix}.xlsx`);
      fs.writeFileSync(inputPath, buffer);
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
