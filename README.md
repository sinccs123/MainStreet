# MainStreet

Aplicación Astro para previsualizar enlaces compatibles y descargar contenido en MP4 o MP3. El botón de búsqueda reintenta detectar la duración; al activar el interruptor de recorte se puede indicar el inicio y el fin, también manualmente cuando no se detecta la duración. Con el interruptor apagado se descarga el video completo.

## Ejecutar localmente

Requiere Node.js 22.23.4 o superior.

```powershell
npm install
npm run dev
```

Abre http://localhost:4321. Para compilar y revisar la versión de producción, ejecuta `npm run build` y luego `npm run preview`.

## Compartirla desde tu PC (sin Vercel)

YouTube bloquea con frecuencia las IPs de servidores en la nube (Vercel incluido), por eso la app se ejecuta en tu PC y se publica con un túnel de Cloudflare:

1. Haz doble clic en `iniciar-publico.bat`. Instala `cloudflared` si falta, compila y arranca el servidor.
2. Copia la URL `https://...trycloudflare.com` que aparece y compártela. La URL cambia cada vez que se inicia.
3. La PC debe permanecer encendida y con la ventana abierta mientras otros la usen.

Quien use la URL puede elegir "Usar sesión de" un navegador: eso usa las cookies de tu PC. Déjalo en "Ninguno" salvo que lo necesites y uses una cuenta que no te importe exponer.

## Compatibilidad y límites

- La descarga se procesa en el servidor con `yt-dlp` y `ffmpeg`.
- La vista previa se incrusta desde YouTube, Instagram, TikTok o Facebook cuando el enlace y la configuración de privacidad de la plataforma lo permiten.
- Los enlaces privados requieren una sesión con permiso para acceder al contenido. En Vercel no se puede usar el navegador ni las cookies locales del visitante; YouTube también puede rechazar solicitudes desde servidores.
- El proyecto usa el adaptador de Node (`@astrojs/node`, modo standalone); el servidor compilado se inicia con `node dist/server/entry.mjs`.
- Las APIs usan binarios de `yt-dlp` y `ffmpeg` instalados en la máquina que ejecuta el servidor. El acceso autenticado depende de las cookies de esa máquina, no de las del visitante.
