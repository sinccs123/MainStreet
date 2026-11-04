# MainStreet

Aplicación Astro para previsualizar enlaces compatibles y descargar contenido en MP4 o MP3. El botón de búsqueda reintenta detectar la duración; el recorte aparece al ingresar un enlace y permite indicar inicio y fin, también manualmente cuando no se detecta la duración.

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
- La configuración actual usa el adaptador Node y ejecuta binarios del servidor. Para desplegar en Vercel hay que adaptar y probar la API de descarga; una función serverless no puede leer las cookies del navegador local del visitante.
