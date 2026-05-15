import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const id = randomBytes(8).toString('hex');
  const tmpDir = tmpdir();
  const xlsxPath = join(tmpDir, `reporte_${id}.xlsx`);
  const pdfPath  = join(tmpDir, `reporte_${id}.pdf`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(xlsxPath, buffer);

    const loPath = process.platform === 'win32'
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
      : 'libreoffice';

    const profileDir = join(tmpDir, `lo_profile_${id}`);
    const profileUrl = process.platform === 'win32'
      ? `file:///${profileDir.replace(/\\/g, '/')}`
      : `file://${profileDir}`;

    const cmd = `"${loPath}" --headless --norestore -env:UserInstallation="${profileUrl}" --convert-to pdf "${xlsxPath}" --outdir "${tmpDir}"`;

    console.log('Ejecutando:', cmd);

    const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });
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
    try { await unlink(pdfPath); } catch {}
  }
}
