# MainStreet

Aplicación Astro para previsualizar enlaces compatibles y descargar contenido en MP4 o MP3. El botón de búsqueda reintenta detectar la duración; al activar el interruptor de recorte se puede indicar el inicio y el fin, también manualmente cuando no se detecta la duración. Con el interruptor apagado se descarga el video completo.

## Ejecutar localmente

Requiere Node.js 22.23.4 o superior.

```powershell
npm install
npm run dev
```

Abre http://localhost:4321. Para compilar y revisar la versión de producción, ejecuta `npm run build` y luego `npm run preview`.

## Compatibilidad y límites

- La descarga se procesa en el servidor con `yt-dlp` y `ffmpeg`.
- La vista previa se incrusta desde YouTube, Instagram, TikTok o Facebook cuando el enlace y la configuración de privacidad de la plataforma lo permiten.
- Los enlaces privados requieren una sesión con permiso para acceder al contenido. El uso de cookies del navegador depende del navegador y del entorno donde se ejecute el servidor.
- El proyecto usa el adaptador de Vercel para renderizar la página y desplegar sus rutas de servidor.
- La API de descarga ejecuta `bin/yt-dlp` y `ffmpeg`. `bin/` está excluida de Git y el ejecutable `.exe` local no funciona en Vercel; por eso las descargas necesitan una configuración de binarios compatible con Linux/serverless. Vercel tampoco puede leer las cookies del navegador local del visitante.
