import { Router } from 'express';
import { getDatabase } from '@/database/connection';
const router = Router();
// Search products
router.get('/', async (req, res) => {
    try {
        const db = getDatabase();
        const { q = '', // search query
        category = '', // category filter
        country = '', // country filter
        page = '1', // page number
        limit = '20' // results per page
         } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        // Build search conditions
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        // Full-text search
        if (q) {
            whereConditions.push(`
        to_tsvector('english', 
          COALESCE(name, '') || ' ' || 
          COALESCE(brand, '') || ' ' || 
          COALESCE(description, '') || ' ' || 
          COALESCE(ingredients_list, '')
        ) @@ plainto_tsquery('english', $${paramIndex})
      `);
            params.push(q);
            paramIndex++;
        }
        // Category filter
        if (category) {
            whereConditions.push(`category ILIKE $${paramIndex}`);
            params.push(`%${category}%`);
            paramIndex++;
        }
        // Country filter
        if (country) {
            whereConditions.push(`country ILIKE $${paramIndex}`);
            params.push(`%${country}%`);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ?
            `WHERE ${whereConditions.join(' AND ')}` : '';
        // Main search query
        const searchQuery = `
      SELECT 
        id, name, brand, category, country, description, 
        price, currency, verification_status,
        CASE WHEN $1 != '' THEN
          ts_rank(
            to_tsvector('english', 
              COALESCE(name, '') || ' ' || 
              COALESCE(brand, '') || ' ' || 
              COALESCE(description, '') || ' ' || 
              COALESCE(ingredients_list, '')
            ), 
            plainto_tsquery('english', $1)
          )
        ELSE 0 END as relevance_score
      FROM products
      ${whereClause}
      ORDER BY 
        CASE WHEN $1 != '' THEN relevance_score ELSE 0 END DESC,
        name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        // Count query
        const countQuery = `
      SELECT COUNT(*) as total
      FROM products
      ${whereClause}
    `;
        // Execute queries
        const [searchResult, countResult] = await Promise.all([
            db.query(searchQuery, [q || '', ...params, parseInt(limit), offset]),
            db.query(countQuery, params)
        ]);
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / parseInt(limit));
        res.json({
            success: true,
            data: {
                products: searchResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPreviousPage: parseInt(page) > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Search failed'
        });
    }
});
// Get autocomplete suggestions
router.get('/autocomplete', async (req, res) => {
    try {
        const db = getDatabase();
        const { q, type = 'name' } = req.query;
        if (!q) {
            return res.json({ success: true, data: [] });
        }
        let field = 'name';
        if (type === 'brand')
            field = 'brand';
        if (type === 'category')
            field = 'category';
        const query = `
      SELECT DISTINCT ${field} as suggestion
      FROM products
      WHERE ${field} ILIKE $1
      AND verification_status = 'verified'
      ORDER BY ${field}
      LIMIT 10
    `;
        const result = await db.query(query, [`%${q}%`]);
        res.json({
            success: true,
            data: result.rows.map(row => row.suggestion).filter(Boolean)
        });
    }
    catch (error) {
        console.error('Autocomplete error:', error);
        res.status(500).json({
            success: false,
            error: 'Autocomplete failed'
        });
    }
});
export default router;
//# sourceMappingURL=search.js.map