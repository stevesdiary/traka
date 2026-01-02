import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes.js';
import { connectDatabases, disconnectDatabases } from './config/database.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('=== ERROR DETAILS ===');
  console.error('URL:', req.method, req.originalUrl);
  console.error('Body:', req.body);
  console.error('Headers:', req.headers);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('=====================');
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'TRAKA API is running' });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabases();
    const server = app.listen(port, () => {
      console.log(`TRAKA API running on port ${port}`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        await disconnectDatabases();
        console.log('👋 Server shut down gracefully');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();