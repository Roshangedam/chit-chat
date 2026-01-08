import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: '0.0.0.0', // Expose on all network interfaces
        proxy: {
            '/api': {
                target: 'http://192.168.0.71:3000',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://192.168.0.71:3000',
                ws: true
            }
        }
    }
})
