import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

const LO_PATH = process.platform === 'win32'
  ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
  : 'libreoffice';

async function convertirPagina(xlsxPath: string, outDir: string, id: string): Promise<string> {
  const profileDir = join(outDir, `profile_${id}`);
  await mkdir(profileDir, { recursive: true });

  const profileUrl = process.platform === 'win32'
    ? `file:///${profileDir.replace(/\\/g, '/')}`
    : `file://${profileDir}`;

  const cmd = process.platform === 'win32'
    ? `"${LO_PATH}" --headless --norestore "-env:UserInstallation=${profileUrl}" --convert-to pdf "${xlsxPath}" --outdir "${outDir}"`
    : `"${LO_PATH}" --headless --norestore -env:UserInstallation="${profileUrl}" --convert-to pdf "${xlsxPath}" --outdir "${outDir}"`;

  const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });
  console.log('[PREVENTIVO] stdout:', stdout);
  console.log('[PREVENTIVO] stderr:', stderr);

  const pdfPath = xlsxPath.replace('.xlsx', '.pdf');
  return pdfPath;
}

export async function POST(req: NextRequest) {
  const id = randomBytes(8).toString('hex');
  const tmpDir = tmpdir();
  const xlsxPath = join(tmpDir, `preventivo_${id}.xlsx`);
  const pdfPath  = join(tmpDir, `preventivo_${id}.pdf`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(xlsxPath, buffer);

    const resultPdf = await convertirPagina(xlsxPath, tmpDir, id);
    const pdfData = await readFile(resultPdf);

    return new NextResponse(new Uint8Array(pdfData), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="preventivo_${id}.pdf"`,
      },
    });

  } catch (error: unknown) {
    const err = error as Error & { stdout?: string; stderr?: string };
    console.error('[PREVENTIVO] Error:', err.message);
    console.error('[PREVENTIVO] stdout:', err.stdout);
    console.error('[PREVENTIVO] stderr:', err.stderr);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    try { await unlink(xlsxPath); } catch {}
    try { await unlink(pdfPath); } catch {}
  }
}
