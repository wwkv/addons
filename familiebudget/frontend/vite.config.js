import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* The version shown in Settings.

   Read from the ADD-ON's package.json (../package.json), not this folder's —
   frontend/package.json is a private workspace manifest still sitting at
   1.0.0 and has never tracked releases. config.yaml carries the same number;
   the two are bumped together, and HA installs by the config.yaml one, so if
   they ever drift this display follows package.json and would be wrong.
   Keeping them in step is the release step that prevents that. */
function addonVersion() {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  } catch (e) {
    // Degrade to an honest "unknown" rather than failing the build. A missing
    // manifest means the build context does not include it (see the COPY in
    // the add-on Dockerfile) — worth a loud warning, but not worth leaving
    // the user with no app at all over a line of footer text.
    console.warn('[vite] ../package.json unreadable, version will show as "onbekend":', e.message)
    return null
  }
}

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(addonVersion()),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
