import { useEffect, useState } from 'react';

const FORMATS = ['MP4', 'MP3'];
const BROWSERS = ['chrome', 'edge', 'firefox', 'brave', 'opera', 'vivaldi', 'chromium'];

function getPreview(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com') {
    const id = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|live|embed)\/([^/?]+)/)?.[1];
    return id && /^[\w-]{11}$/.test(id)
      ? { src: `https://www.youtube.com/embed/${id}`, label: 'YouTube' }
      : null;
  }

  if (host === 'instagram.com') {
    const match = url.pathname.match(/^\/(p|reel|tv)\/([\w-]+)/);
    return match
      ? { src: `https://www.instagram.com/${match[1]}/${match[2]}/embed/`, label: 'Instagram' }
      : null;
  }

  if (host === 'tiktok.com') {
    const id = url.pathname.match(/\/video\/(\d+)/)?.[1];
    return id ? { src: `https://www.tiktok.com/player/v1/${id}`, label: 'TikTok' } : null;
  }

  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch' || host === 'fb.com') {
    return {
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false`,
      label: 'Facebook',
    };
  }

  return null;
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':');
}

export default function Downloader({ browserSessionAvailable = true }) {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('MP4');
  const [browser, setBrowser] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState(null);
  const [duration, setDuration] = useState(null);
  const [durationError, setDurationError] = useState('');
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [trimEnabled, setTrimEnabled] = useState(false);
  const preview = getPreview(url);

  async function searchVideo() {
    if (!url.trim()) {
      setDurationError('Pegá un enlace antes de buscar.');
      return;
    }

    setSearching(true);
    setDurationError('');
    try {
      const params = new URLSearchParams({ url, browser });
      const response = await fetch(`/api/info?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo buscar el video.');
      if (Number.isFinite(data.duration) && data.duration >= 1) {
        const seconds = Math.floor(data.duration);
        setDuration(seconds);
        setStart(0);
        setEnd(seconds);
      } else {
        setDuration(null);
        setDurationError('No se pudo detectar la duración. Puedes indicar el inicio y el fin manualmente.');
      }
    } catch (error) {
      setDurationError(error.message);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    setDuration(null);
    setDurationError('');
    setStart(0);
    setEnd(0);
    setManualStart('');
    setManualEnd('');

    if (!preview) return undefined;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ url, browser });
        const response = await fetch(`/api/info?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo obtener la duración');
        if (Number.isFinite(data.duration) && data.duration >= 1) {
          const seconds = Math.floor(data.duration);
          setDuration(seconds);
          setEnd(seconds);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setDurationError(error.message);
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [url, browser]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const hasManualStart = manualStart !== '';
      const hasManualEnd = manualEnd !== '';
      if (trimEnabled && duration === null && (!hasManualStart || !hasManualEnd)) {
        throw new Error('Indicá tanto el inicio como el fin del recorte.');
      }

      const startTime = !trimEnabled
        ? null
        : duration === null
        ? (hasManualStart ? Number(manualStart) : null)
        : start;
      const endTime = startTime === null
        ? null
        : (duration === null ? Number(manualEnd) : end);
      if ((startTime === null) !== (endTime === null)) {
        throw new Error('Indicá tanto el inicio como el fin del recorte.');
      }
      if (startTime !== null && (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime < 0 || endTime <= startTime)) {
        throw new Error('El fin del recorte debe ser mayor que el inicio.');
      }

      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          format: format.toLowerCase(),
          browser,
          start: startTime,
          end: endTime,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error desconocido');
      }
      const name = /filename="(.+?)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || `video.${format.toLowerCase()}`;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg({ ok: true, text: `Descargado: ${name}` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur space-y-6">
      <div className="space-y-2">
        <label htmlFor="url" className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          URL del contenido
        </label>
        <div className="flex gap-2">
          <input
            id="url"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pegá un enlace de YouTube, Instagram, TikTok..."
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={searchVideo}
            disabled={searching}
            aria-label="Buscar video"
            title="Buscar video"
            className="flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-violet-600 px-4 text-white transition hover:bg-violet-500 disabled:opacity-60"
          >
            {searching ? (
              <span className="text-sm">...</span>
            ) : (
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {preview && (
        <section className="space-y-3" aria-label="Previsualización">
          <div className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
            <iframe
              key={preview.src}
              src={preview.src}
              title={`Previsualización de ${preview.label}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="text-xs text-zinc-500">
            La previsualización depende de que {preview.label} permita insertar ese contenido. Los videos privados pueden no mostrarse aquí.
          </p>
        </section>
      )}

      {url && !preview && (
        <p className="text-xs text-amber-300">
          No se pudo crear una previsualización para este enlace. Si la plataforma lo permite, podrás descargarlo igualmente.
        </p>
      )}

      {url.trim() && <div className="space-y-3 rounded-lg border border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Fragmento a descargar (opcional)</p>
          <button
            type="button"
            role="switch"
            aria-checked={trimEnabled}
            aria-label="Recorte de video"
            onClick={() => setTrimEnabled((enabled) => !enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              trimEnabled ? 'bg-violet-600' : 'bg-zinc-700'
            }`}
          >
            <span className="sr-only">{trimEnabled ? 'Recorte activado' : 'Recorte desactivado'}</span>
            <span
              aria-hidden="true"
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                trimEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {trimEnabled ? (
          <>
        {duration !== null ? (
          <>
            <label htmlFor="start-time" className="block text-xs text-zinc-400">
              Inicio: {formatTime(start)}
            </label>
            <input
              id="start-time"
              type="range"
              min="0"
              max={Math.max(0, Math.min(duration - 1, end - 1))}
              step="1"
              value={start}
              onChange={(e) => setStart(Math.min(Number(e.target.value), end - 1))}
              className="w-full accent-violet-500"
              aria-label="Inicio del fragmento"
            />
            <label htmlFor="end-time" className="block text-xs text-zinc-400">
              Fin: {formatTime(end)} / {formatTime(duration)}
            </label>
            <input
              id="end-time"
              type="range"
              min={Math.min(duration, start + 1)}
              max={duration}
              step="1"
              value={end}
              onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 1))}
              className="w-full accent-violet-500"
              aria-label="Fin del fragmento"
            />
          </>
        ) : (
          <>
            <p className="text-xs text-zinc-500">
              No se pudo detectar la duración. Si quieres recortar, indica ambos tiempos en segundos.
              {durationError ? ` ${durationError}` : ''}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-xs text-zinc-400">
                Inicio (segundos)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  placeholder="0"
                />
              </label>
              <label className="space-y-1 text-xs text-zinc-400">
                Fin (segundos)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  placeholder="60"
                />
              </label>
            </div>
          </>
        )}
          </>
        ) : (
          <p className="text-xs text-zinc-500">Apagado: se descargará el video completo.</p>
        )}
      </div>}

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Formato de descarga</span>
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-lg border py-2 text-sm font-semibold transition ${
                format === f ? 'border-violet-500 bg-violet-500/20 text-violet-200' : 'border-white/10 text-zinc-400 hover:border-white/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">Calidad: hasta la máxima disponible</p>
      </div>

      {browserSessionAvailable ? (
        <div className="space-y-2">
          <label htmlFor="browser" className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Usar sesión de (opcional)
          </label>
          <select
            id="browser"
            value={browser}
            onChange={(e) => setBrowser(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="">Ninguno (contenido público)</option>
            {BROWSERS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            Para contenido al que ya tienes acceso. El navegador debe estar instalado en el servidor local.
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Las sesiones de navegador no están disponibles en Vercel; ese servidor no puede acceder a las cookies de tu computadora.
        </p>
      )}

      <button
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-violet-500 disabled:opacity-60"
      >
        {loading ? 'Descargando…' : 'Descargar'}
      </button>

      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>
      )}
    </form>
  );
}
