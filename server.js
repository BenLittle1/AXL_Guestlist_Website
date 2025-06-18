const express = require('express');
const cors = require('cors');

console.log('🚀 Starting AXL Guestlist API...');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check - Railway might check this
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    console.log('Root endpoint requested');
    res.status(200).json({ 
        message: 'AXL Guestlist API is running', 
        timestamp: new Date().toISOString(),
        status: 'healthy'
    });
});

// Load routes only if they exist
try {
    const authRoutes = require('./routes/auth');
    const notificationRoutes = require('./routes/notifications');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/notifications', notificationRoutes);
    console.log('✅ Routes loaded successfully');
} catch (error) {
    console.log('⚠️  Routes not loaded:', error.message);
}

// Basic error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

console.log(`🔧 Attempting to start server on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server successfully started on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💓 Health check: /health`);
});

server.on('error', (error) => {
    console.error('❌ Server startup error:', error);
    process.exit(1);
});

// Keep the process alive
const keepAlive = setInterval(() => {
    console.log(`💓 Server is alive - ${new Date().toISOString()}`);
}, 30000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    clearInterval(keepAlive);
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

console.log('🎯 Server initialization complete');
