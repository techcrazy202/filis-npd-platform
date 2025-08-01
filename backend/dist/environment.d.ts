export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    ENCRYPTION_KEY: string;
    CORS_ORIGIN: string;
    UPLOAD_DIR: string;
    MAX_FILE_SIZE: number;
};
export declare const dbConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
};
//# sourceMappingURL=environment.d.ts.map