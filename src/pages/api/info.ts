import type { APIRoute } from 'astro';
import { spawnYtDlp } from '@involvex/yt-dlp';
import { BROWSERS, getAccessHint, parseMediaUrl } from '../../lib/media';

export const prerender = false;

const json = (data: object, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function getDuration(args: string[]): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    const process = spawnYtDlp(args);
    let out = '';
    let err = '';
    process.stdout.on('data', (data) => (out += data));
    process.stderr.on('data', (data) => (err = (err + data).slice(-4000)));
    process.on('error', (error) => resolve({ code: -1, out, err: String(error) }));
    process.on('close', (code) => resolve({ code: code ?? -1, out, err }));
  });
}

export const GET: APIRoute = async ({ request }) => {
  const params = new URL(request.url).searchParams;
  const url = parseMediaUrl(params.get('url'));
  if (!url) return json({ error: 'Pegá un enlace válido de YouTube, Instagram, TikTok o Facebook' }, 400);

  const browser = params.get('browser') ?? '';
  if (browser && !BROWSERS.includes(browser)) return json({ error: 'Navegador no soportado' }, 400);

  const args = ['--no-warnings', '--no-playlist', '--skip-download', '--print', '%(duration)s'];
  if (browser) args.push('--cookies-from-browser', browser);
  args.push('--', url.toString());

  const result = await getDuration(args);
  if (result.code !== 0) {
    const detail = result.err.split('\n').filter(Boolean).pop() ?? '';
    const hint = getAccessHint(result.err);
    return json({ error: `No se pudo detectar la duración.${hint} ${detail}`.trim() }, 502);
  }

  const duration = Number(result.out.trim().split(/\r?\n/).pop());
  return json({ duration: Number.isFinite(duration) && duration > 0 ? duration : null });
};
