const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Load env vars
dotenv.config();

const app = express();

// Enable CORS with specific options for Railway
app.use(cors({
    origin: true,
    credentials: true
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Railway health check endpoint (Railway might check this)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Basic health check route
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'AXL Guestlist API is running', 
        timestamp: new Date().toISOString(),
        status: 'healthy',
        env: process.env.NODE_ENV || 'development'
    });
});

// Catch-all for 404s before API routes
app.get('/favicon.ico', (req, res) => res.status(204).send());

// Define routes
try {
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/notifications', require('./routes/notifications'));
} catch (error) {
    console.error('Error loading routes:', error);
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server started successfully on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀 Health check: http://localhost:${PORT}/health`);
});

// Improved error handling
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Handle graceful shutdown
const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close((err) => {
        if (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
