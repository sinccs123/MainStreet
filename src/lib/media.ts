export const BROWSERS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'vivaldi', 'chromium'];

const HOSTS = /(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|fb\.watch|fb\.com)$/i;

export function parseMediaUrl(value: unknown): URL | null {
  try {
    const url = new URL(String(value ?? '').trim());
    if (!/^https?:$/.test(url.protocol) || !HOSTS.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export function getAccessHint(error: string): string {
  if (/sign in to confirm.*not a bot|confirm you.re not a bot|captcha|unusual traffic/i.test(error)) {
    return process.env.VERCEL === '1'
      ? ' YouTube bloqueó la solicitud desde Vercel. Ese servidor no puede usar las cookies del navegador de tu computadora.'
      : ' YouTube pide una sesión válida. Ejecuta la aplicación localmente y selecciona el navegador donde tengas permiso para ver el video.';
  }

  if (/login|private|cookies|authentication|sign in/i.test(error)) {
    return ' El contenido requiere una sesión válida con permiso para acceder.';
  }

  return '';
}
