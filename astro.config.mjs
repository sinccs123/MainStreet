// @ts-check
import { defineConfig } from 'astro/config';
import path from 'node:path';

import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import ffmpegPath from 'ffmpeg-static';
import { resolveBinary } from '@involvex/yt-dlp';
import tailwindcss from '@tailwindcss/vite';

const includeFromProject = (file) =>
  path.relative(process.cwd(), file).split(path.sep).join('/');

export default defineConfig({
  output: 'server',
  integrations: [react()],
  adapter: vercel({
    includeFiles: [
      includeFromProject(resolveBinary().path),
      ...(ffmpegPath ? [includeFromProject(ffmpegPath)] : [])
    ]
  }),

  vite: {
    plugins: [tailwindcss()]
  }
});