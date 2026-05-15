import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

const LO_PATH = process.platform === 'win32'
  ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
  : 'libreoffice';

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'split_convert.py');

export async function POST(req: NextRequest) {
  const id = randomBytes(8).toString('hex');
  const baseTmp  = tmpdir();
  const reqTmp   = join(baseTmp, `preventivo_${id}`);
  const xlsxPath = join(reqTmp, `input.xlsx`);
  const pdfPath  = join(reqTmp, `output.pdf`);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    await mkdir(reqTmp, { recursive: true });
    await writeFile(xlsxPath, Buffer.from(await file.arrayBuffer()));

    const cmd = `python "${SCRIPT_PATH}" "${xlsxPath}" "${pdfPath}" "${LO_PATH}" "${reqTmp}"`;
    console.log('[PREVENTIVO] Ejecutando:', cmd);

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 300000, windowsHide: true });
      console.log('[PREVENTIVO] stdout:', stdout);
      if (stderr) console.warn('[PREVENTIVO] stderr:', stderr);
    } catch (pyErr: unknown) {
      const e = pyErr as Error & { stdout?: string; stderr?: string };
      console.error('[PREVENTIVO] Python error:', e.message);
      console.error('[PREVENTIVO] stdout:', e.stdout);
      console.error('[PREVENTIVO] stderr:', e.stderr);
      throw new Error(`Python script falló: ${e.message}\n${e.stderr ?? ''}`);
    }

    const pdfData = await readFile(pdfPath);

    return new NextResponse(new Uint8Array(pdfData), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="preventivo_${id}.pdf"`,
      },
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[PREVENTIVO] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    try { await rm(reqTmp, { recursive: true, force: true }); } catch {}
  }
}
