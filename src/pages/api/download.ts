import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import ffmpegPath from 'ffmpeg-static';
import { BROWSERS, parseMediaUrl } from '../../lib/media';

export const prerender = false;

const YTDLP = path.resolve(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
const MIME: Record<string, string> = { mp4: 'video/mp4', mp3: 'audio/mpeg' };

const json = (error: string, status = 400) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });

function formatSectionTime(seconds: number): string {
  const totalMilliseconds = Math.round(seconds * 1000);
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;
  const milliseconds = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function run(args: string[]): Promise<{ code: number; err: string }> {
  return new Promise((resolve) => {
    const p = spawn(YTDLP, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
    p.on('error', (e) => resolve({ code: -1, err: String(e) }));
    p.on('close', (code) => resolve({ code: code ?? -1, err }));
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return json('Solicitud inválida');
    body = parsed as Record<string, unknown>;
  } catch {
    return json('Solicitud inválida');
  }

  const format = String(body.format ?? 'mp4').toLowerCase();
  if (!Object.hasOwn(MIME, format)) return json('Formato no soportado');

  const url = parseMediaUrl(body.url);
  if (!url) return json('Pegá un enlace válido de YouTube, Instagram, TikTok o Facebook');

  const browser = body.browser ? String(body.browser) : '';
  if (browser && !BROWSERS.includes(browser)) return json('Navegador no soportado');

  const hasStart = body.start !== null && body.start !== undefined && body.start !== '';
  const hasEnd = body.end !== null && body.end !== undefined && body.end !== '';
  if (hasStart !== hasEnd) return json('Indicá tanto el inicio como el fin del recorte');
  const start = hasStart ? Number(body.start) : null;
  const end = hasEnd ? Number(body.end) : null;
  if (
    (start !== null && (!Number.isFinite(start) || start < 0)) ||
    (end !== null && (!Number.isFinite(end) || end <= (start ?? 0)))
  ) {
    return json('El fin del recorte debe ser mayor que el inicio');
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'dl-'));
  const args = [
    '--no-playlist',
    '--no-warnings',
    '--restrict-filenames',
    '-o', path.join(dir, '%(title).80B.%(ext)s'),
  ];
  if (typeof ffmpegPath === 'string') args.push('--ffmpeg-location', ffmpegPath);
  if (browser) args.push('--cookies-from-browser', browser);
  if (start !== null && end !== null) {
    args.push('--download-sections', `*${formatSectionTime(start)}-${formatSectionTime(end)}`);
  }

  if (format === 'mp3') args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
  else args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/bv*+ba/b', '--merge-output-format', 'mp4');

  args.push('--', url.toString());

  const { code, err } = await run(args);
  const files = await readdir(dir);
  const file = files.find((f) => f.toLowerCase().endsWith('.' + format));

  if (code !== 0 || !file) {
    await rm(dir, { recursive: true, force: true });
    const hint = /login|private|cookies|authentication|sign in/i.test(err)
      ? ' Este contenido requiere sesión: elegí tu navegador (donde tengas la sesión iniciada) en "Usar sesión de".'
      : '';
    const detail = err.split('\n').filter(Boolean).pop() ?? '';
    return json(`No se pudo descargar.${hint} ${detail}`.trim(), 502);
  }

  const full = path.join(dir, file);
  const { size } = await stat(full);
  const stream = createReadStream(full);
  const cleanup = () => rm(dir, { recursive: true, force: true }).catch(() => {});
  stream.on('close', cleanup);
  stream.on('error', cleanup);

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': MIME[format],
      'Content-Length': String(size),
      'Content-Disposition': `attachment; filename="${file.replace(/[^\w.\-]/g, '_')}"`,
    },
  });
};
