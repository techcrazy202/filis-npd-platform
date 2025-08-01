import { QueryResult } from 'pg';
import type { PoolClient } from 'pg';
interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
declare class DatabaseConnection {
    private pool;
    private static instance;
    private constructor();
    static getInstance(config?: DatabaseConfig): DatabaseConnection;
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    queryWithClient<T = any>(client: PoolClient, text: string, params?: any[]): Promise<QueryResult<T>>;
    getClient(): Promise<PoolClient>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    healthCheck(): Promise<boolean>;
    getPoolStatus(): {
        totalCount: number;
        idleCount: number;
        waitingCount: number;
    };
    close(): Promise<void>;
}
export declare const initDatabase: (config: DatabaseConfig) => DatabaseConnection;
export declare const getDatabase: () => DatabaseConnection;
export type { DatabaseConfig, PoolClient };
//# sourceMappingURL=connection.d.ts.map