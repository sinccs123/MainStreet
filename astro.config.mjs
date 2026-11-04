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

const ytDlpPath = resolveBinary().path;

export default defineConfig({
  output: 'server',
  integrations: [react()],
  adapter: vercel({
    includeFiles: [
      includeFromProject(ytDlpPath),
      includeFromProject(path.join(path.dirname(ytDlpPath), 'package.json')),
      ...(ffmpegPath ? [includeFromProject(ffmpegPath)] : [])
    ]
  }),

  vite: {
    plugins: [tailwindcss()]
  }
});