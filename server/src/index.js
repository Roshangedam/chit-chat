/**
 * ChitChat v2 - Server Entry Point
 * LAN-based messaging application
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

// Database
const { initializeSchema } = require('./db/schema');

// Socket.io
const { initializeSocket } = require('./socket');

// Initialize database schema
initializeSchema();

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Middleware - Allow all origins for LAN
app.use(cors({
    origin: true, // Allow all origins
    credentials: true
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Start server on all interfaces (0.0.0.0)
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
    console.log('');
    console.log('🚀 ================================');
    console.log('   ChitChat Server Started!');
    console.log('🚀 ================================');
    console.log('');
    console.log(`📡 Server running on:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://192.168.0.71:${PORT}`);
    console.log('');
    console.log(`🔗 Health check: http://192.168.0.71:${PORT}/api/health`);
    console.log('');
    console.log('📅 Started at:', new Date().toLocaleString());
    console.log('');
});
