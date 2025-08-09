import { Router } from 'express';
import { getDatabase } from '@/database/connection';

const router = Router();

// Search products
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      q = '',           // search query
      category = '',    // category filter
      country = '',     // country filter
      page = '1',       // page number
      limit = '20'      // results per page
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Build search conditions
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Search query with ILIKE (simpler than full-text search)
    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      whereConditions.push(`(
        product_name ILIKE $${paramIndex} OR
        company_name ILIKE $${paramIndex} OR
        brand ILIKE $${paramIndex} OR
        ingredients_list ILIKE $${paramIndex} OR
        product_description ILIKE $${paramIndex}
      )`);
      params.push(searchTerm);
      paramIndex++;
    }

    // Industry filter
    if (category && category.trim() !== '') {
      whereConditions.push(`industry ILIKE $${paramIndex}`);
      params.push(`%${category.trim()}%`);
      paramIndex++;
    }

    // Country filter
    if (country && country.trim() !== '') {
      whereConditions.push(`country ILIKE $${paramIndex}`);
      params.push(`%${country.trim()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 
      `WHERE ${whereConditions.join(' AND ')}` : '';

    console.log('🔍 Search params:', params);
    console.log('📝 Where clause:', whereClause);

    // Main search query - SIMPLE VERSION
    const searchQuery = `
      SELECT 
        id, continentsdb, country, industry, sector, sub_sector,
        segment, sub_segment, product_id, product_name, company_name, 
        standardized_company_name, brand, geo, country_of_origin,
        product_description, ingredients_list, standardized_ingredients,
        product_link, source_name, website_address, volume_scale,
        volume_subscale, currency, price, manufacture_date, expiry_date,
        flavour, calories, claims, year, date_of_entry, remarks
      FROM filis_data
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN product_name ILIKE $${paramIndex} THEN 1
          WHEN company_name ILIKE $${paramIndex} THEN 2
          WHEN brand ILIKE $${paramIndex} THEN 3
          ELSE 4
        END,
        product_name ASC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM filis_data
      ${whereClause}
    `;

    // Prepare parameters for search query
    let searchParams: any[];
    if (q && q.trim() !== '') {
      // Add the search term again for ORDER BY relevance
      searchParams = [...params, `%${q.trim()}%`, parseInt(limit as string), offset];
    } else {
      // No search term, just add limit and offset
      searchParams = [...params, '', parseInt(limit as string), offset];
    }

    console.log('🔍 Final search params:', searchParams);
    console.log('📊 Count params:', params);

    // Execute queries
    const [searchResult, countResult] = await Promise.all([
      db.query(searchQuery, searchParams),
      db.query(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit as string));

    console.log(`✅ Search completed: ${searchResult.rows.length} results, ${total} total`);

    res.json({
      success: true,
      data: {
        products: searchResult.rows,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit as string),
          hasNextPage: parseInt(page as string) < totalPages,
          hasPreviousPage: parseInt(page as string) > 1
        }
      }
    });

  } catch (error) {
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
    const { q, type = 'product_name' } = req.query;

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    let field = 'country';
    if (type === 'industry') field = 'industry';
    if (type === 'sector') field = 'sector';
    if (type === 'continent') field = 'continentsdb';
    if (type === 'name' || type === 'product_name') field = 'product_name';
    if (type === 'brand') field = 'brand';
    if (type === 'company') field = 'company_name';

    const query = `
      SELECT DISTINCT ${field} as suggestion
      FROM filis_data
      WHERE ${field} ILIKE $1 AND ${field} IS NOT NULL AND ${field} != ''
      ORDER BY ${field}
      LIMIT 10
    `;

    const result = await db.query(query, [`%${q}%`]);

    res.json({
      success: true,
      data: result.rows.map(row => row.suggestion).filter(Boolean)
    });

  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: 'Autocomplete failed'
    });
  }
});

// Get available filter options
router.get('/filters', async (req, res) => {
  try {
    const db = getDatabase();

    const queries = [
      'SELECT DISTINCT industry FROM filis_data WHERE industry IS NOT NULL AND industry != \'\' ORDER BY industry LIMIT 50',
      'SELECT DISTINCT country FROM filis_data WHERE country IS NOT NULL AND country != \'\' ORDER BY country LIMIT 50',
      'SELECT DISTINCT sector FROM filis_data WHERE sector IS NOT NULL AND sector != \'\' ORDER BY sector LIMIT 50',
      'SELECT DISTINCT continentsdb FROM filis_data WHERE continentsdb IS NOT NULL AND continentsdb != \'\' ORDER BY continentsdb'
    ];

    const [industries, countries, sectors, continents] = await Promise.all(
      queries.map(query => db.query(query))
    );

    res.json({
      success: true,
      data: {
        industries: industries.rows.map(row => row.industry),
        countries: countries.rows.map(row => row.country),
        sectors: sectors.rows.map(row => row.sector),
        continents: continents.rows.map(row => row.continentsdb)
      }
    });

  } catch (error) {
    console.error('Filters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load filters'
    });
  }
});

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();

    const queries = [
      'SELECT COUNT(*) as total_products FROM filis_data',
      'SELECT COUNT(DISTINCT country) as total_countries FROM filis_data WHERE country IS NOT NULL AND country != \'\'',
      'SELECT COUNT(DISTINCT industry) as total_industries FROM filis_data WHERE industry IS NOT NULL AND industry != \'\'',
      'SELECT COUNT(DISTINCT company_name) as total_companies FROM filis_data WHERE company_name IS NOT NULL AND company_name != \'\''
    ];

    const [products, countries, industries, companies] = await Promise.all(
      queries.map(query => db.query(query))
    );

    res.json({
      success: true,
      data: {
        totalProducts: parseInt(products.rows[0].total_products),
        totalCountries: parseInt(countries.rows[0].total_countries),
        totalIndustries: parseInt(industries.rows[0].total_industries),
        totalCompanies: parseInt(companies.rows[0].total_companies)
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load statistics'
    });
  }
});

export default router;