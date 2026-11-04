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
