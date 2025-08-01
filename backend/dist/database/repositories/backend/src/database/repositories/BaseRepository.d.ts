export interface PaginationOptions {
    page?: number;
    limit?: number;
    offset?: number;
}
export interface FilterOptions {
    [key: string]: any;
}
export interface SortOptions {
    field: string;
    direction: 'ASC' | 'DESC';
}
export declare abstract class BaseRepository<T> {
    protected tableName: string;
    protected primaryKey: string;
    constructor(tableName: string);
    protected buildWhereClause(filters: FilterOptions): {
        clause: string;
        params: any[];
    };
    protected buildOrderClause(sorts: SortOptions[]): string;
    protected buildLimitClause(pagination: PaginationOptions): {
        clause: string;
        params: any[];
    };
    findById(id: string): Promise<T | null>;
    find(filters?: FilterOptions, sorts?: SortOptions[], pagination?: PaginationOptions): Promise<{
        data: T[];
        total: number;
    }>;
    create(data: Partial<T>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
    bulkInsert(items: Partial<T>[]): Promise<T[]>;
    count(filters?: FilterOptions): Promise<number>;
    exists(id: string): Promise<boolean>;
}
//# sourceMappingURL=BaseRepository.d.ts.map