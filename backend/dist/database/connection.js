// backend/src/database/connection.ts
// Custom Database Layer - No ORM, Direct PostgreSQL
import { Pool } from 'pg';
import { DatabaseError } from './errors';
class DatabaseConnection {
    pool;
    static instance;
    constructor(config) {
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            max: config.max || 20,
            idleTimeoutMillis: config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        // Handle pool errors
        this.pool.on('error', (err) => {
            console.error('Database pool error:', err);
        });
        // Handle pool connection events
        this.pool.on('connect', (client) => {
            console.log('New client connected to database');
        });
        this.pool.on('remove', (client) => {
            console.log('Client removed from database pool');
        });
    }
    static getInstance(config) {
        if (!DatabaseConnection.instance) {
            if (!config) {
                throw new Error('Database configuration required for first initialization');
            }
            DatabaseConnection.instance = new DatabaseConnection(config);
        }
        return DatabaseConnection.instance;
    }
    // Execute a query with parameters
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Query executed:', {
                text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                rows: result.rowCount
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - start;
            console.error('Query failed:', {
                text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                error: error.message
            });
            throw new DatabaseError(error.message, error.code);
        }
    }
    // Execute a query with a specific client (for transactions)
    async queryWithClient(client, text, params) {
        const start = Date.now();
        try {
            const result = await client.query(text, params);
            const duration = Date.now() - start;
            console.log('Transaction query executed:', {
                text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                rows: result.rowCount
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - start;
            console.error('Transaction query failed:', {
                text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                error: error.message
            });
            throw new DatabaseError(error.message, error.code);
        }
    }
    // Get a client for transactions
    async getClient() {
        try {
            return await this.pool.connect();
        }
        catch (error) {
            throw new DatabaseError('Failed to get database client', error.code);
        }
    }
    // Execute multiple queries in a transaction
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Health check
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health_check');
            return result.rows[0]?.health_check === 1;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
    // Get pool status
    getPoolStatus() {
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
        };
    }
    // Close all connections
    async close() {
        try {
            await this.pool.end();
            console.log('Database pool closed');
        }
        catch (error) {
            console.error('Error closing database pool:', error);
            throw error;
        }
    }
}
// Database initialization
export const initDatabase = (config) => {
    return DatabaseConnection.getInstance(config);
};
// Get existing database instance
export const getDatabase = () => {
    return DatabaseConnection.getInstance();
};
//# sourceMappingURL=connection.js.map