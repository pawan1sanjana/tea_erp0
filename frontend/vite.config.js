import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Vite configuration with explicit HTTPS using local certificates.
// Generate self‑signed certificates (e.g., via mkcert) for the IP address 192.168.195.22
// and place them under the `certs` folder at the project root.
// Example commands (run in terminal):
//   mkcert -install
//   mkcert 192.168.195.22 localhost 127.0.0.1 ::1
//   mkdir -p certs && mv 192.168.195.22+2.pem certs/localhost.crt && mv 192.168.195.22+2-key.pem certs/localhost.key

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    basicSsl(),
  ],
  server: {
    port: 5174,
    host: true,
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },

  },
  base: '/',
});
