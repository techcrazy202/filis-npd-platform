// backend/src/database/repositories/ProductRepository.ts
// Product-specific database operations
import { BaseRepository } from './BaseRepository';
import { getDatabase } from '../connection';
import { DatabaseError } from '../errors';
export class ProductRepository extends BaseRepository {
    constructor() {
        super('products');
    }
    // Advanced search with full-text search and filters
    async search(searchFilters, pagination = {}) {
        const db = getDatabase();
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        // Full-text search
        if (searchFilters.query) {
            whereConditions.push(`
        to_tsvector('english', 
          COALESCE(name, '') || ' ' || 
          COALESCE(brand, '') || ' ' || 
          COALESCE(description, '') || ' ' || 
          COALESCE(ingredients_list, '')
        ) @@ plainto_tsquery('english', ${paramIndex})
      `);
            params.push(searchFilters.query);
            paramIndex++;
        }
        // Category filter
        if (searchFilters.category && searchFilters.category.length > 0) {
            const placeholders = searchFilters.category.map(() => `${paramIndex++}`).join(', ');
            whereConditions.push(`category IN (${placeholders})`);
            params.push(...searchFilters.category);
        }
        // Brand filter
        if (searchFilters.brand && searchFilters.brand.length > 0) {
            const placeholders = searchFilters.brand.map(() => `${paramIndex++}`).join(', ');
            whereConditions.push(`brand IN (${placeholders})`);
            params.push(...searchFilters.brand);
        }
        // Country filter
        if (searchFilters.country && searchFilters.country.length > 0) {
            const placeholders = searchFilters.country.map(() => `${paramIndex++}`).join(', ');
            whereConditions.push(`country IN (${placeholders})`);
            params.push(...searchFilters.country);
        }
        // Price range filter
        if (searchFilters.priceRange) {
            whereConditions.push(`mrp BETWEEN ${paramIndex} AND ${paramIndex + 1}`);
            params.push(searchFilters.priceRange[0], searchFilters.priceRange[1]);
            paramIndex += 2;
        }
        // Regional exclusivity filter
        if (searchFilters.isRegional !== undefined) {
            whereConditions.push(`is_regional_exclusive = ${paramIndex++}`);
            params.push(searchFilters.isRegional);
        }
        // NPD filter
        if (searchFilters.isNpd !== undefined) {
            whereConditions.push(`is_npd = ${paramIndex++}`);
            params.push(searchFilters.isNpd);
        }
        // Verification status filter
        if (searchFilters.verificationStatus && searchFilters.verificationStatus.length > 0) {
            const placeholders = searchFilters.verificationStatus.map(() => `${paramIndex++}`).join(', ');
            whereConditions.push(`verification_status IN (${placeholders})`);
            params.push(...searchFilters.verificationStatus);
        }
        // Date range filter
        if (searchFilters.dateRange) {
            whereConditions.push(`created_at BETWEEN ${paramIndex} AND ${paramIndex + 1}`);
            params.push(searchFilters.dateRange[0], searchFilters.dateRange[1]);
            paramIndex += 2;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // Build pagination
        const limit = pagination.limit || 20;
        const offset = pagination.offset || (pagination.page ? (pagination.page - 1) * limit : 0);
        // Main query with ranking for full-text search
        let orderClause = 'ORDER BY created_at DESC';
        if (searchFilters.query) {
            orderClause = `
        ORDER BY 
          ts_rank(
            to_tsvector('english', 
              COALESCE(name, '') || ' ' || 
              COALESCE(brand, '') || ' ' || 
              COALESCE(description, '') || ' ' || 
              COALESCE(ingredients_list, '')
            ), 
            plainto_tsquery('english', $1)
          ) DESC,
          ai_confidence_score DESC,
          created_at DESC
      `;
        }
        const mainQuery = `
      SELECT * FROM products
      ${whereClause}
      ${orderClause}
      LIMIT ${paramIndex} OFFSET ${paramIndex + 1}
    `;
        const countQuery = `
      SELECT COUNT(*) as total FROM products
      ${whereClause}
    `;
        try {
            const [dataResult, countResult] = await Promise.all([
                db.query(mainQuery, [...params, limit, offset]),
                db.query(countQuery, params)
            ]);
            return {
                data: dataResult.rows,
                total: parseInt(countResult.rows[0].total, 10)
            };
        }
        catch (error) {
            throw new DatabaseError('Failed to search products', error.code);
        }
    }
    // Get autocomplete suggestions
    async getAutocompleteSuggestions(query, field = 'name') {
        const db = getDatabase();
        const dbQuery = `
      SELECT DISTINCT ${field}
      FROM products
      WHERE ${field} ILIKE $1
      AND verification_status = 'verified'
      ORDER BY ${field}
      LIMIT 10
    `;
        try {
            const result = await db.query(dbQuery, [`%${query}%`]);
            return result.rows.map(row => row[field]).filter(Boolean);
        }
        catch (error) {
            throw new DatabaseError('Failed to get autocomplete suggestions', error.code);
        }
    }
    // Get filter facets (for filter dropdowns)
    async getFilterFacets() {
        const db = getDatabase();
        const queries = {
            categories: `
        SELECT category as value, COUNT(*) as count
        FROM products
        WHERE category IS NOT NULL AND verification_status = 'verified'
        GROUP BY category
        ORDER BY count DESC, category
        LIMIT 50
      `,
            brands: `
        SELECT brand as value, COUNT(*) as count
        FROM products
        WHERE brand IS NOT NULL AND verification_status = 'verified'
        GROUP BY brand
        ORDER BY count DESC, brand
        LIMIT 50
      `,
            countries: `
        SELECT country as value, COUNT(*) as count
        FROM products
        WHERE country IS NOT NULL AND verification_status = 'verified'
        GROUP BY country
        ORDER BY count DESC, country
        LIMIT 50
      `
        };
        try {
            const [categoriesResult, brandsResult, countriesResult] = await Promise.all([
                db.query(queries.categories),
                db.query(queries.brands),
                db.query(queries.countries)
            ]);
            return {
                categories: categoriesResult.rows.map(row => ({
                    value: row.value,
                    count: parseInt(row.count, 10)
                })),
                brands: brandsResult.rows.map(row => ({
                    value: row.value,
                    count: parseInt(row.count, 10)
                })),
                countries: countriesResult.rows.map(row => ({
                    value: row.value,
                    count: parseInt(row.count, 10)
                }))
            };
        }
        catch (error) {
            throw new DatabaseError('Failed to get filter facets', error.code);
        }
    }
    // Find similar products (for duplicate detection)
    async findSimilarProducts(name, brand, threshold = 0.7) {
        const db = getDatabase();
        const query = `
      SELECT *, 
        similarity(name, $1) + similarity(brand, $2) as sim_score
      FROM products
      WHERE (similarity(name, $1) + similarity(brand, $2)) > $3
      AND verification_status = 'verified'
      ORDER BY sim_score DESC
      LIMIT 10
    `;
        try {
            const result = await db.query(query, [name, brand, threshold]);
            return result.rows;
        }
        catch (error) {
            throw new DatabaseError('Failed to find similar products', error.code);
        }
    }
    // Get products by barcode
    async findByBarcode(barcode) {
        const db = getDatabase();
        const query = `
      SELECT * FROM products
      WHERE barcode = $1 AND verification_status = 'verified'
      LIMIT 1
    `;
        try {
            const result = await db.query(query, [barcode]);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new DatabaseError('Failed to find product by barcode', error.code);
        }
    }
    // Update product verification status
    async updateVerificationStatus(productId, status, confidenceScore) {
        const updateData = {
            verification_status: status,
            last_verified_at: new Date()
        };
        if (confidenceScore !== undefined) {
            updateData.ai_confidence_score = confidenceScore;
        }
        return await this.update(productId, updateData);
    }
    // Get products discovered by user
    async getProductsByDiscoverer(userId) {
        const filters = { first_discovered_by: userId, is_npd: true };
        const sorts = [{ field: 'discovery_date', direction: 'DESC' }];
        const result = await this.find(filters, sorts);
        return result.data;
    }
    // Get recent NPD products
    async getRecentNPDProducts(limit = 20) {
        const filters = { is_npd: true, verification_status: 'verified' };
        const sorts = [{ field: 'discovery_date', direction: 'DESC' }];
        const pagination = { limit };
        const result = await this.find(filters, sorts, pagination);
        return result.data;
    }
}
//# sourceMappingURL=ProductRepository.js.map