// backend/src/database/repositories/BaseRepository.ts
// Base Repository with common database operations
import { getDatabase } from '../connection';
import { DatabaseError, NotFoundError, ValidationError } from '../errors';
export class BaseRepository {
    tableName;
    primaryKey = 'id';
    constructor(tableName) {
        this.tableName = tableName;
    }
    // Build WHERE clause from filters
    buildWhereClause(filters) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    // IN clause for arrays
                    const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
                    conditions.push(`${key} IN (${placeholders})`);
                    params.push(...value);
                }
                else if (typeof value === 'string' && value.includes('%')) {
                    // LIKE clause for partial matches
                    conditions.push(`${key} ILIKE $${paramIndex++}`);
                    params.push(value);
                }
                else {
                    // Exact match
                    conditions.push(`${key} = $${paramIndex++}`);
                    params.push(value);
                }
            }
        }
        const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        return { clause, params };
    }
    // Build ORDER BY clause
    buildOrderClause(sorts) {
        if (!sorts || sorts.length === 0) {
            return `ORDER BY ${this.primaryKey} DESC`;
        }
        const orderItems = sorts.map(sort => `${sort.field} ${sort.direction}`);
        return `ORDER BY ${orderItems.join(', ')}`;
    }
    // Build LIMIT and OFFSET clause
    buildLimitClause(pagination) {
        const params = [];
        let clause = '';
        if (pagination.limit) {
            clause += ` LIMIT $${params.length + 1}`;
            params.push(pagination.limit);
        }
        if (pagination.offset) {
            clause += ` OFFSET $${params.length + 1}`;
            params.push(pagination.offset);
        }
        else if (pagination.page && pagination.limit) {
            const offset = (pagination.page - 1) * pagination.limit;
            clause += ` OFFSET $${params.length + 1}`;
            params.push(offset);
        }
        return { clause, params };
    }
    // Generic find by ID
    async findById(id) {
        const db = getDatabase();
        const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        try {
            const result = await db.query(query, [id]);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new DatabaseError(`Failed to find ${this.tableName} by ID`, error.code);
        }
    }
    // Generic find with filters, sorting, and pagination
    async find(filters = {}, sorts = [], pagination = {}) {
        const db = getDatabase();
        const { clause: whereClause, params: whereParams } = this.buildWhereClause(filters);
        const orderClause = this.buildOrderClause(sorts);
        const { clause: limitClause, params: limitParams } = this.buildLimitClause(pagination);
        // Build the main query
        const query = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `;
        // Build the count query
        const countQuery = `
      SELECT COUNT(*) as total FROM ${this.tableName}
      ${whereClause}
    `;
        try {
            // Execute both queries
            const [dataResult, countResult] = await Promise.all([
                db.query(query, [...whereParams, ...limitParams]),
                db.query(countQuery, whereParams)
            ]);
            return {
                data: dataResult.rows,
                total: parseInt(countResult.rows[0].total, 10)
            };
        }
        catch (error) {
            throw new DatabaseError(`Failed to find ${this.tableName}`, error.code);
        }
    }
    // Generic create
    async create(data) {
        const db = getDatabase();
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
        try {
            const result = await db.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new DatabaseError(`Duplicate entry in ${this.tableName}`, error.code);
            }
            throw new DatabaseError(`Failed to create ${this.tableName}`, error.code);
        }
    }
    // Generic update
    async update(id, data) {
        const db = getDatabase();
        const fields = Object.keys(data);
        const values = Object.values(data);
        if (fields.length === 0) {
            throw new ValidationError('No data provided for update');
        }
        const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.primaryKey} = $1
      RETURNING *
    `;
        try {
            const result = await db.query(query, [id, ...values]);
            if (result.rows.length === 0) {
                throw new NotFoundError(this.tableName, id);
            }
            return result.rows[0];
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Failed to update ${this.tableName}`, error.code);
        }
    }
    // Generic delete
    async delete(id) {
        const db = getDatabase();
        const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
        try {
            const result = await db.query(query, [id]);
            return result.rowCount > 0;
        }
        catch (error) {
            throw new DatabaseError(`Failed to delete ${this.tableName}`, error.code);
        }
    }
    // Bulk insert
    async bulkInsert(items) {
        if (items.length === 0) {
            return [];
        }
        const db = getDatabase();
        return await db.transaction(async (client) => {
            const results = [];
            for (const item of items) {
                const fields = Object.keys(item);
                const values = Object.values(item);
                const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
                const query = `
          INSERT INTO ${this.tableName} (${fields.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
                const result = await db.queryWithClient(client, query, values);
                results.push(result.rows[0]);
            }
            return results;
        });
    }
    // Count with filters
    async count(filters = {}) {
        const db = getDatabase();
        const { clause: whereClause, params } = this.buildWhereClause(filters);
        const query = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
        try {
            const result = await db.query(query, params);
            return parseInt(result.rows[0].total, 10);
        }
        catch (error) {
            throw new DatabaseError(`Failed to count ${this.tableName}`, error.code);
        }
    }
    // Check if record exists
    async exists(id) {
        const db = getDatabase();
        const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 LIMIT 1`;
        try {
            const result = await db.query(query, [id]);
            return result.rows.length > 0;
        }
        catch (error) {
            throw new DatabaseError(`Failed to check existence in ${this.tableName}`, error.code);
        }
    }
}
//# sourceMappingURL=BaseRepository.js.map