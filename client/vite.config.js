import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Check if HTTPS certificates exist
const certPath = path.resolve(__dirname, '../certs')
const httpsEnabled = fs.existsSync(path.join(certPath, 'localhost+2.pem'))

const httpsConfig = httpsEnabled ? {
    key: fs.readFileSync(path.join(certPath, 'localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(certPath, 'localhost+2.pem'))
} : false

const backendUrl = httpsEnabled ? 'https://localhost:3000' : 'http://localhost:3000'

console.log(httpsEnabled ? '🔐 HTTPS enabled' : '🌐 HTTP mode')

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: '0.0.0.0',
        https: httpsConfig,
        proxy: {
            '/socket.io': {
                target: backendUrl,
                ws: true,
                secure: false,
                changeOrigin: true,
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq, req) => {
                        const clientIp = req.socket.remoteAddress?.replace('::ffff:', '') || '127.0.0.1';
                        proxyReq.setHeader('X-Forwarded-For', clientIp);
                    });
                }
            },
            '/api': {
                target: backendUrl,
                secure: false,
                changeOrigin: true
            },
            '/uploads': {
                target: backendUrl,
                secure: false,
                changeOrigin: true
            }
        }
    }
})
