// backend/src/database/repositories/ProductRepository.ts
// Product-specific database operations

import { BaseRepository, FilterOptions, SortOptions, PaginationOptions } from './BaseRepository';
import { getDatabase } from '../connection';
import { DatabaseError } from '../errors';

export interface Product {
  id: string;
  name: string;
  product_id?: string;
  brand: string;
  description?: string;
  industry?: string;
  sector?: string;
  sub_sector?: string;
  segment?: string;
  sub_segment?: string;
  category?: string;
  continents?: string;
  country?: string;
  geo?: string;
  country_of_origin?: string;
  availability_regions?: any;
  is_regional_exclusive: boolean;
  barcode?: string;
  product_code?: string;
  sku?: string;
  ingredients_list?: string;
  standardized_ingredients?: any;
  nutritional_info?: any;
  calories?: string;
  claims?: string;
  flavour?: string;
  allergen_info?: any;
  dietary_preferences?: any;
  price?: string;
  volume_scale?: string;
  volume_subscale?: string;
  currency: string;
  mrp?: number;
  pack_size?: string;
  company_name?: string;
  standardized_company_name?: string;
  manufacturer?: string;
  distributor?: string;
  retailer?: string;
  product_link?: string;
  source_name?: string;
  website_address?: string;
  manufacture_date?: Date;
  expiry_date?: Date;
  year?: string;
  date_of_entry?: Date;
  remarks?: string;
  verification_status: 'pending' | 'verified' | 'rejected' | 'flagged';
  ai_confidence_score: number;
  submission_count: number;
  last_verified_at?: Date;
  first_discovered_by?: string;
  discovery_date?: Date;
  is_npd: boolean;
  regional_popularity_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface SearchFilters {
  query?: string;
  category?: string[];
  brand?: string[];
  country?: string[];
  countryOfOrigin?: string[];
  priceRange?: [number, number];
  isRegional?: boolean;
  verificationStatus?: string[];
  dateRange?: [Date, Date];
  isNpd?: boolean;
}

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products');
  }

  // Advanced search with full-text search and filters
  async search(
    searchFilters: SearchFilters,
    pagination: PaginationOptions = {}
  ): Promise<{ data: Product[]; total: number }> {
    const db = getDatabase();
    
    let whereConditions: string[] = [];
    let params: any[] = [];
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
        db.query<Product>(mainQuery, [...params, limit, offset]),
        db.query<{ total: string }>(countQuery, params)
      ]);

      return {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].total, 10)
      };
    } catch (error) {
      throw new DatabaseError('Failed to search products', error.code);
    }
  }

  // Get autocomplete suggestions
  async getAutocompleteSuggestions(query: string, field: 'name' | 'brand' | 'category' = 'name'): Promise<string[]> {
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
      const result = await db.query<{ [key: string]: string }>(dbQuery, [`%${query}%`]);
      return result.rows.map(row => row[field]).filter(Boolean);
    } catch (error) {
      throw new DatabaseError('Failed to get autocomplete suggestions', error.code);
    }
  }

  // Get filter facets (for filter dropdowns)
  async getFilterFacets(): Promise<{
    categories: Array<{ value: string; count: number }>;
    brands: Array<{ value: string; count: number }>;
    countries: Array<{ value: string; count: number }>;
  }> {
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
        db.query<{ value: string; count: string }>(queries.categories),
        db.query<{ value: string; count: string }>(queries.brands),
        db.query<{ value: string; count: string }>(queries.countries)
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
    } catch (error) {
      throw new DatabaseError('Failed to get filter facets', error.code);
    }
  }

  // Find similar products (for duplicate detection)
  async findSimilarProducts(name: string, brand: string, threshold: number = 0.7): Promise<Product[]> {
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
      const result = await db.query<Product & { sim_score: number }>(query, [name, brand, threshold]);
      return result.rows;
    } catch (error) {
      throw new DatabaseError('Failed to find similar products', error.code);
    }
  }

  // Get products by barcode
  async findByBarcode(barcode: string): Promise<Product | null> {
    const db = getDatabase();
    
    const query = `
      SELECT * FROM products
      WHERE barcode = $1 AND verification_status = 'verified'
      LIMIT 1
    `;

    try {
      const result = await db.query<Product>(query, [barcode]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError('Failed to find product by barcode', error.code);
    }
  }

  // Update product verification status
  async updateVerificationStatus(
    productId: string, 
    status: Product['verification_status'],
    confidenceScore?: number
  ): Promise<Product> {
    const updateData: any = { 
      verification_status: status,
      last_verified_at: new Date()
    };

    if (confidenceScore !== undefined) {
      updateData.ai_confidence_score = confidenceScore;
    }

    return await this.update(productId, updateData);
  }

  // Get products discovered by user
  async getProductsByDiscoverer(userId: string): Promise<Product[]> {
    const filters = { first_discovered_by: userId, is_npd: true };
    const sorts = [{ field: 'discovery_date', direction: 'DESC' as const }];
    
    const result = await this.find(filters, sorts);
    return result.data;
  }

  // Get recent NPD products
  async getRecentNPDProducts(limit: number = 20): Promise<Product[]> {
    const filters = { is_npd: true, verification_status: 'verified' };
    const sorts = [{ field: 'discovery_date', direction: 'DESC' as const }];
    const pagination = { limit };
    
    const result = await this.find(filters, sorts, pagination);
    return result.data;
  }
}

export { User, CreateUserData, UpdateUserData } from './UserRepository';