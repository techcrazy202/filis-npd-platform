import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import 'express-async-errors';
import { env, dbConfig } from '@/config/environment';
import { initDatabase } from '@/database/connection';
import { logger } from '@/utils/logger';
import healthRoutes from '@/routes/health';
import searchRoutes from '@/routes/search';
import authRoutes from '@/routes/auth';
import submissionsRoutes from '@/routes/submissions';
const app = express();
const PORT = env.PORT;
// Initialize database connection
const db = initDatabase(dbConfig);
// Security middleware
app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
}));
// CORS configuration
app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Compression
app.use(compression());
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Logging
app.use(morgan('dev'));
// Routes
app.use('/health', healthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionsRoutes);
// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'Fi-Lis NPD Platform Backend API',
        version: '1.0.0',
        environment: env.NODE_ENV,
        database: `${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT}`,
        endpoints: {
            health: '/health',
            search: '/api/search',
            autocomplete: '/api/search/autocomplete',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                sendOtp: 'POST /api/auth/send-otp',
                verifyOtp: 'POST /api/auth/verify-otp',
                profile: 'GET /api/auth/me',
                changePassword: 'POST /api/auth/change-password'
            },
            submissions: {
                create: 'POST /api/submissions',
                list: 'GET /api/submissions/my-submissions',
                details: 'GET /api/submissions/:id',
                uploadImages: 'POST /api/submissions/:id/images',
                stats: 'GET /api/submissions/stats/summary'
            }
        }
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        method: req.method
    });
});
// Start server
const server = app.listen(PORT, () => {
    logger.info(`🚀 Fi-Lis NPD Platform Backend`);
    logger.info(`📍 Environment: ${env.NODE_ENV}`);
    logger.info(`🌐 Server running on port ${PORT}`);
    logger.info(`🗄️  Database: ${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT}`);
    logger.info(`🔍 Search API: http://localhost:${PORT}/api/search`);
});
export default app;
//# sourceMappingURL=server.js.map