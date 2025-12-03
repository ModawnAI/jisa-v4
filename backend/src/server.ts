/**
 * JISA KakaoTalk Backend Server
 * Express.js server for handling KakaoTalk webhook communication
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './config/index.js';
import kakaoRoutes from './routes/kakao.route.js';

// Validate environment variables before starting
try {
  validateConfig();
  console.log('[Server] Configuration validated successfully');
} catch (error) {
  console.error('[Server] Configuration validation failed:', error);
  process.exit(1);
}

const app = express();

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for KakaoTalk webhook compatibility
}));

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for KakaoTalk webhook
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (config.nodeEnv === 'development') {
      console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
});

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'jisa-kakao-backend',
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'JISA KakaoTalk Backend',
    version: '1.0.0',
    description: 'KakaoTalk Chatbot Backend for JISA Insurance HR/Information System',
    endpoints: {
      health: '/health',
      kakaoChat: '/api/kakao/chat',
      kakaoHealth: '/api/kakao/health',
    },
    documentation: 'https://github.com/jisa/backend',
  });
});

// KakaoTalk routes
app.use('/api/kakao', kakaoRoutes);

// Legacy route compatibility (direct /kakao/chat access)
app.use('/kakao', kakaoRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Server Startup
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('JISA KAKAOTALK BACKEND SERVER');
  console.log('='.repeat(60));
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Port: ${PORT}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log('Endpoints:');
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  KakaoTalk: http://localhost:${PORT}/api/kakao/chat`);
  console.log('='.repeat(60));
  console.log('Server is ready to receive KakaoTalk webhooks!');
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
