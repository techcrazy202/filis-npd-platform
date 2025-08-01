import { Router } from 'express';
import { getDatabase } from '@/database/connection';
const router = Router();
router.get('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const db = getDatabase();
        const dbHealthy = await db.healthCheck();
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();
        const health = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: `${Math.floor(uptime)}s`,
            environment: process.env.NODE_ENV,
            version: '1.0.0',
            database: {
                status: dbHealthy ? 'connected' : 'disconnected',
                pool: db.getPoolStatus()
            },
            memory: {
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            },
            responseTime: `${Date.now() - startTime}ms`
        };
        res.json(health);
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: 'Service unavailable',
            responseTime: `${Date.now() - startTime}ms`
        });
    }
});
export default router;
//# sourceMappingURL=health.js.map