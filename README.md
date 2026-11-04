# MainStreet

Aplicación Astro para previsualizar enlaces compatibles y descargar contenido en MP4 o MP3. El botón de búsqueda reintenta detectar la duración; al activar el interruptor de recorte se puede indicar el inicio y el fin, también manualmente cuando no se detecta la duración. Con el interruptor apagado se descarga el video completo.

## Ejecutar localmente

Requiere Node.js 22.23.4 o superior.

```powershell
npm install
npm run dev
```

Abre http://localhost:4321. Para compilar y revisar la versión de producción, ejecuta `npm run build` y luego `npm run preview`.

## Abrir sin iniciar un servidor

Abre `index.html` con el navegador. El archivo carga la aplicación publicada en https://mainstreet-gold.vercel.app/ dentro de la página, así que requiere conexión a internet; no es una copia que funcione sin conexión.

## Compatibilidad y límites

- La descarga se procesa en el servidor con `yt-dlp` y `ffmpeg`.
- La vista previa se incrusta desde YouTube, Instagram, TikTok o Facebook cuando el enlace y la configuración de privacidad de la plataforma lo permiten.
- Los enlaces privados requieren una sesión con permiso para acceder al contenido. En Vercel no se puede usar el navegador ni las cookies locales del visitante; YouTube también puede rechazar solicitudes desde servidores.
- El proyecto usa el adaptador de Vercel para renderizar la página y desplegar sus rutas de servidor.
- Las APIs usan binarios de `yt-dlp` y `ffmpeg` instalados para la plataforma de despliegue. Vercel no puede leer las cookies del navegador local del visitante; el acceso autenticado depende de cookies disponibles en el servidor.
