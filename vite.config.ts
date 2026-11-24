/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

// HTTPS + LAN host: phones only grant getUserMedia on a secure origin, so http://192.168.x.x won't work.
// mkcert only for the local dev server: hosting (Vercel) provides real HTTPS and must not install a local CA.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    command === 'serve' && !process.env.VITEST ? mkcert() : null,
    {
      // iOS offers "install profile" only for this MIME type (public/dev-ca.crt = mkcert root, see README)
      name: 'dev-ca-mime',
      configureServer: (s) =>
        void s.middlewares.use('/dev-ca.crt', (_req, res, next) => {
          res.setHeader('Content-Type', 'application/x-x509-ca-cert')
          next()
        }),
    },
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: { environment: 'node' },
}))
