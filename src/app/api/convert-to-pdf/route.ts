import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  const id = randomBytes(8).toString('hex');
  const tmp = tmpdir();
  const xlsxPath   = join(tmp, `reporte_${id}.xlsx`);
  const pdfPath    = join(tmp, `reporte_${id}.pdf`);
  const profileDir = join(tmp, `lo_profile_${id}`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    await writeFile(xlsxPath, Buffer.from(await file.arrayBuffer()));
    await mkdir(profileDir, { recursive: true });

    const loPath = process.platform === 'win32'
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
      : 'libreoffice';

    const profileUrl = process.platform === 'win32'
      ? `file:///${profileDir.replace(/\\/g, '/')}`
      : `file://${profileDir}`;

    const args = [
      '--headless',
      '--norestore',
      `--env:UserInstallation=${profileUrl}`,
      '--convert-to', 'pdf',
      xlsxPath,
      '--outdir', tmp,
    ];

    console.log('LO path:', loPath);
    console.log('LO args:', args);

    const { stdout, stderr } = await execFileAsync(loPath, args, { timeout: 120000 });
    console.log('LO stdout:', stdout);
    console.log('LO stderr:', stderr);

    const pdfData = await readFile(pdfPath);

    return new NextResponse(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_${id}.pdf"`,
      },
    });

  } catch (error: unknown) {
    const err = error as Error & { stdout?: string; stderr?: string };
    console.error('Error PDF:', err.message);
    console.error('stdout:', err.stdout);
    console.error('stderr:', err.stderr);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    try { await unlink(xlsxPath); } catch {}
    try { await unlink(pdfPath);  } catch {}
  }
}
