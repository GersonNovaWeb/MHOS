import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

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

    const loPath = process.env.LIBREOFFICE_BIN || (process.platform === 'win32'
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
      : 'libreoffice');

    const profileUrl = process.platform === 'win32'
      ? `file:///${profileDir.replace(/\\/g, '/')}`
      : `file://${profileDir}`;

    const cmd = process.platform === 'win32'
      ? `"${loPath}" --headless --norestore "-env:UserInstallation=${profileUrl}" --convert-to pdf "${xlsxPath}" --outdir "${tmp}"`
      : `"${loPath}" --headless --norestore -env:UserInstallation="${profileUrl}" --convert-to pdf "${xlsxPath}" --outdir "${tmp}"`;

    console.log('Ejecutando:', cmd);

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 180000, windowsHide: true });
      console.log('LO stdout:', stdout);
      console.log('LO stderr:', stderr);
    } catch (loErr: unknown) {
      const e = loErr as Error & { stdout?: string; stderr?: string };
      console.warn('LO exit non-zero (verificando PDF):', e.message);
      console.warn('LO stdout:', e.stdout);
      console.warn('LO stderr:', e.stderr);
    }

    let pdfData: Buffer;
    try {
      pdfData = await readFile(pdfPath);
    } catch {
      throw new Error('LibreOffice no generó el PDF');
    }

    return new NextResponse(new Uint8Array(pdfData), {
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
