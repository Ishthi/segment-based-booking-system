import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 so the port is reachable from outside the container
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // inotify events don't cross macOS/Windows bind mounts
    },
  },
})
