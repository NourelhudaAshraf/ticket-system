import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Reads .env (and .env.local). The '' prefix loads every name, not only VITE_ ones,
  // so API_PROXY_TARGET is available here without being exposed to the browser.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Forward API calls to the ASP.NET Core app so the browser sees one origin and the
      // SameSite auth cookie works in development.
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'https://localhost:7227',
          changeOrigin: true,
          secure: false, // the local dev certificate is self-signed
        },
      },
    },
  }
})
