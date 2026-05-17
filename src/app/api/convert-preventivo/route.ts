import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

const LO_PATH = process.env.LIBREOFFICE_BIN || (process.platform === 'win32'
  ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
  : 'libreoffice');

const PYTHON_BIN = process.env.PDF_PYTHON_BIN || (process.platform === 'win32'
  ? 'C:\\Users\\ger_s\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe'
  : 'python3');
const MERGE_SCRIPT = join(process.cwd(), 'scripts', 'merge_pdfs.py');
const STAMP_SCRIPT = join(process.cwd(), 'scripts', 'stamp_header_footer.py');

export async function POST(req: NextRequest) {
  const id = randomBytes(8).toString('hex');
  const baseTmp = tmpdir();
  const reqTmp = join(baseTmp, `preventivo_${id}`);
  const outputPdf = join(reqTmp, 'preventivo_final.pdf');

  try {
    const formData = await req.formData();
    const files = formData.getAll('files').filter((item): item is File => item instanceof File);
    const fallbackFile = formData.get('file');
    if (!files.length && fallbackFile instanceof File) files.push(fallbackFile);
    if (!files.length) return NextResponse.json({ error: 'No file' }, { status: 400 });

    await mkdir(reqTmp, { recursive: true });

    const pdfFiles: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const xlsxPath = join(reqTmp, `page_${i + 1}.xlsx`);
      const pdfPath = join(reqTmp, `page_${i + 1}.pdf`);
      const profileDir = join(reqTmp, `lo_profile_${i + 1}`);
      await mkdir(profileDir, { recursive: true });
      await writeFile(xlsxPath, Buffer.from(await file.arrayBuffer()));

      const profileUrl = process.platform === 'win32'
        ? `file:///${profileDir.replace(/\\/g, '/')}`
        : `file://${profileDir}`;

      const cmd = process.platform === 'win32'
        ? `"${LO_PATH}" --headless --norestore "-env:UserInstallation=${profileUrl}" --convert-to pdf "${xlsxPath}" --outdir "${reqTmp}"`
        : `"${LO_PATH}" --headless --norestore -env:UserInstallation="${profileUrl}" --convert-to pdf "${xlsxPath}" --outdir "${reqTmp}"`;

      console.log('[PREVENTIVO] Ejecutando LibreOffice:', cmd);
      try {
        const { stdout, stderr } = await execAsync(cmd, { timeout: 300000, windowsHide: true });
        console.log('[PREVENTIVO] stdout:', stdout);
        if (stderr) console.warn('[PREVENTIVO] stderr:', stderr);
      } catch (loErr: unknown) {
        const e = loErr as Error & { stdout?: string; stderr?: string };
        console.warn('[PREVENTIVO] LibreOffice exit non-zero (verificando PDF):', e.message);
        console.warn('[PREVENTIVO] stdout:', e.stdout);
        console.warn('[PREVENTIVO] stderr:', e.stderr);
      }

      try {
        await readFile(pdfPath);
        pdfFiles.push(pdfPath);
      } catch {
        throw new Error(`LibreOffice no generó la página preventiva ${i + 1}`);
      }
    }

    if (pdfFiles.length === 1) {
      await writeFile(outputPdf, await readFile(pdfFiles[0]));
    } else {
      const quotedPdfs = pdfFiles.map(p => `"${p}"`).join(' ');
      const cmd = `"${PYTHON_BIN}" "${MERGE_SCRIPT}" "${outputPdf}" ${quotedPdfs}`;
      console.log('[PREVENTIVO] Uniendo PDFs:', cmd);
      const { stdout, stderr } = await execAsync(cmd, { timeout: 120000, windowsHide: true });
      console.log('[PREVENTIVO] merge stdout:', stdout);
      if (stderr) console.warn('[PREVENTIVO] merge stderr:', stderr);
    }

    const stampedPdf = join(reqTmp, 'preventivo_stamped.pdf');
    const headerPath = join(process.cwd(), 'public', 'templates', 'header.png');
    const footerPath = join(process.cwd(), 'public', 'templates', 'footer.png');
    const stampCmd = `"${PYTHON_BIN}" "${STAMP_SCRIPT}" "${outputPdf}" "${stampedPdf}" "${headerPath}" "${footerPath}"`;
    console.log('[PREVENTIVO] Estampando header/footer:', stampCmd);
    const stampResult = await execAsync(stampCmd, { timeout: 120000, windowsHide: true });
    console.log('[PREVENTIVO] stamp stdout:', stampResult.stdout);
    if (stampResult.stderr) console.warn('[PREVENTIVO] stamp stderr:', stampResult.stderr);

    const pdfData = await readFile(stampedPdf);
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
    try { await unlink(outputPdf); } catch {}
    try { await unlink(join(reqTmp, 'preventivo_stamped.pdf')); } catch {}
    try { await rm(reqTmp, { recursive: true, force: true }); } catch {}
  }
}
