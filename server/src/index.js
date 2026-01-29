/**
 * ChitChat v2 - Server Entry Point
 * HTTPS if certs exist, else HTTP
 */

const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Database
const { initializeSchema } = require('./db/schema');

// Socket.io
const { initializeSocket } = require('./socket');

// Configuration
const PORT = process.env.PORT || 3000;

// Get local IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}
const LOCAL_IP = getLocalIP();

// Initialize Database
initializeSchema();

// Initialize Express
const app = express();

// HTTPS or HTTP
const certPath = path.join(__dirname, '../../certs');
const HTTPS_ENABLED = fs.existsSync(path.join(certPath, 'localhost+2.pem'));
let server;

if (HTTPS_ENABLED) {
    try {
        const httpsOptions = {
            key: fs.readFileSync(path.join(certPath, 'localhost+2-key.pem')),
            cert: fs.readFileSync(path.join(certPath, 'localhost+2.pem'))
        };
        server = https.createServer(httpsOptions, app);
        console.log('🔐 HTTPS mode enabled');
    } catch (err) {
        server = http.createServer(app);
        console.log('🌐 HTTP mode (cert error)');
    }
} else {
    server = http.createServer(app);
    console.log('🌐 HTTP mode');
}

// Initialize Socket.io
const io = initializeSocket(server);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS - Allow all
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', https: HTTPS_ENABLED });
});

// Serve client build (if exists)
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    console.log('📦 Serving client from /client/dist');
}

// Start server
const protocol = HTTPS_ENABLED ? 'https' : 'http';

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🚀 ================================');
    console.log('   ChitChat Server Started!');
    console.log('🚀 ================================');
    console.log('');
    console.log(`📡 Local:   ${protocol}://localhost:${PORT}`);
    console.log(`📡 Network: ${protocol}://${LOCAL_IP}:${PORT}`);
    console.log('');
});
