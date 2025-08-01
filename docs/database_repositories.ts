// backend/src/database/repositories/BaseRepository.ts
// Base Repository with common database operations

import { PoolClient, QueryResult } from 'pg';
import { getDatabase } from '../connection';
import { DatabaseError, NotFoundError, ValidationError } from '../errors';

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

export abstract class BaseRepository<T> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Build WHERE clause from filters
  protected buildWhereClause(filters: FilterOptions): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // IN clause for arrays
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          conditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else if (typeof value === 'string' && value.includes('%')) {
          // LIKE clause for partial matches
          conditions.push(`${key} ILIKE $${paramIndex++}`);
          params.push(value);
        } else {
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
  protected buildOrderClause(sorts: SortOptions[]): string {
    if (!sorts || sorts.length === 0) {
      return `ORDER BY ${this.primaryKey} DESC`;
    }

    const orderItems = sorts.map(sort => `${sort.field} ${sort.direction}`);
    return `ORDER BY ${orderItems.join(', ')}`;
  }

  // Build LIMIT and OFFSET clause
  protected buildLimitClause(pagination: PaginationOptions): { clause: string; params: any[] } {
    const params: any[] = [];
    let clause = '';

    if (pagination.limit) {
      clause += ` LIMIT $${params.length + 1}`;
      params.push(pagination.limit);
    }

    if (pagination.offset) {
      clause += ` OFFSET $${params.length + 1}`;
      params.push(pagination.offset);
    } else if (pagination.page && pagination.limit) {
      const offset = (pagination.page - 1) * pagination.limit;
      clause += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }

    return { clause, params };
  }

  // Generic find by ID
  async findById(id: string): Promise<T | null> {
    const db = getDatabase();
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    
    try {
      const result = await db.query<T>(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.tableName} by ID`, error.code);
    }
  }

  // Generic find with filters, sorting, and pagination
  async find(
    filters: FilterOptions = {},
    sorts: SortOptions[] = [],
    pagination: PaginationOptions = {}
  ): Promise<{ data: T[]; total: number }> {
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
        db.query<T>(query, [...whereParams, ...limitParams]),
        db.query<{ total: string }>(countQuery, whereParams)
      ]);

      return {
        data: dataResult.rows,
        total: parseInt(countResult.rows[0].total, 10)
      };
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.tableName}`, error.code);
    }
  }

  // Generic create
  async create(data: Partial<T>): Promise<T> {
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
      const result = await db.query<T>(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new DatabaseError(`Duplicate entry in ${this.tableName}`, error.code);
      }
      throw new DatabaseError(`Failed to create ${this.tableName}`, error.code);
    }
  }

  // Generic update
  async update(id: string, data: Partial<T>): Promise<T> {
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
      const result = await db.query<T>(query, [id, ...values]);
      
      if (result.rows.length === 0) {
        throw new NotFoundError(this.tableName, id);
      }
      
      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update ${this.tableName}`, error.code);
    }
  }

  // Generic delete
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    
    const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;

    try {
      const result = await db.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to delete ${this.tableName}`, error.code);
    }
  }

  // Bulk insert
  async bulkInsert(items: Partial<T>[]): Promise<T[]> {
    if (items.length === 0) {
      return [];
    }

    const db = getDatabase();
    
    return await db.transaction(async (client) => {
      const results: T[] = [];
      
      for (const item of items) {
        const fields = Object.keys(item);
        const values = Object.values(item);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${this.tableName} (${fields.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;

        const result = await db.queryWithClient<T>(client, query, values);
        results.push(result.rows[0]);
      }
      
      return results;
    });
  }

  // Count with filters
  async count(filters: FilterOptions = {}): Promise<number> {
    const db = getDatabase();
    
    const { clause: whereClause, params } = this.buildWhereClause(filters);
    const query = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;

    try {
      const result = await db.query<{ total: string }>(query, params);
      return parseInt(result.rows[0].total, 10);
    } catch (error) {
      throw new DatabaseError(`Failed to count ${this.tableName}`, error.code);
    }
  }

  // Check if record exists
  async exists(id: string): Promise<boolean> {
    const db = getDatabase();
    
    const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 LIMIT 1`;

    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to check existence in ${this.tableName}`, error.code);
    }
  }
}

---

// backend/src/database/repositories/UserRepository.ts
// User-specific database operations

import { BaseRepository, FilterOptions, SortOptions, PaginationOptions } from './BaseRepository';
import { getDatabase } from '../connection';
import { DatabaseError, NotFoundError, DuplicateError } from '../errors';
import * as bcrypt from 'bcrypt';

export interface User {
  id: string;
  email: string;
  phone: string;
  password_hash: string;
  full_name: string;
  pan_number?: string;
  aadhaar_number?: string;
  pan_verified: boolean;
  aadhaar_verified: boolean;
  upi_id?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_holder_name?: string;
  total_earnings: number;
  total_submissions: number;
  approved_submissions: number;
  user_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  quality_score: number;
  streak_count: number;
  last_submission_date?: Date;
  email_verified: boolean;
  phone_verified: boolean;
  kyc_status: 'pending' | 'partial' | 'complete' | 'rejected';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  phone: string;
  password: string;
  full_name: string;
}

export interface UpdateUserData {
  full_name?: string;
  pan_number?: string;
  aadhaar_number?: string;
  upi_id?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_holder_name?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  kyc_status?: User['kyc_status'];
  is_active?: boolean;
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  // Create user with password hashing
  async createUser(userData: CreateUserData): Promise<User> {
    const db = getDatabase();

    // Check if user already exists
    const existingUser = await this.findByEmailOrPhone(userData.email, userData.phone);
    if (existingUser) {
      throw new DuplicateError('User', 'email or phone');
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(userData.password, saltRounds);

    const query = `
      INSERT INTO users (email, phone, password_hash, full_name)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    try {
      const result = await db.query<User>(query, [
        userData.email,
        userData.phone,
        password_hash,
        userData.full_name
      ]);

      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new DuplicateError('User', 'email or phone');
      }
      throw new DatabaseError('Failed to create user', error.code);
    }
  }

  // Find user by email or phone
  async findByEmailOrPhone(email: string, phone: string): Promise<User | null> {
    const db = getDatabase();
    
    const query = `
      SELECT * FROM users 
      WHERE email = $1 OR phone = $2
      LIMIT 1
    `;

    try {
      const result = await db.query<User>(query, [email, phone]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError('Failed to find user by email or phone', error.code);
    }
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    const db = getDatabase();
    
    const query = `SELECT * FROM users WHERE email = $1`;

    try {
      const result = await db.query<User>(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError('Failed to find user by email', error.code);
    }
  }

  // Find user by phone
  async findByPhone(phone: string): Promise<User | null> {
    const db = getDatabase();
    
    const query = `SELECT * FROM users WHERE phone = $1`;

    try {
      const result = await db.query<User>(query, [phone]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DatabaseError('Failed to find user by phone', error.code);
    }
  }

  // Verify user password
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return await bcrypt.compare(password, user.password_hash);
  }

  // Update user password
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    await this.update(userId, { password_hash } as any);
  }

  // Update user tier based on performance
  async updateUserTier(userId: string): Promise<User> {
    const db = getDatabase();
    
    const query = `
      UPDATE users 
      SET user_tier = CASE
        WHEN total_submissions >= 100 AND quality_score >= 9.0 THEN 'diamond'
        WHEN total_submissions >= 50 AND quality_score >= 8.5 THEN 'platinum'
        WHEN total_submissions >= 25 AND quality_score >= 8.0 THEN 'gold'
        WHEN total_submissions >= 10 AND quality_score >= 7.0 THEN 'silver'
        ELSE 'bronze'
      END
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query<User>(query, [userId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('User', userId);
      }
      return result.rows[0];
    } catch (error) {
      throw new DatabaseError('Failed to update user tier', error.code);
    }
  }

  // Get user statistics
  async getUserStats(userId: string): Promise<{
    totalEarnings: number;
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    pendingSubmissions: number;
    qualityScore: number;
    userTier: string;
  }> {
    const db = getDatabase();
    
    const query = `
      SELECT 
        u.total_earnings,
        u.total_submissions,
        u.approved_submissions,
        u.quality_score,
        u.user_tier,
        COUNT(CASE WHEN s.status = 'rejected' THEN 1 END) as rejected_submissions,
        COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_submissions
      FROM users u
      LEFT JOIN npd_submissions s ON u.id = s.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.total_earnings, u.total_submissions, u.approved_submissions, u.quality_score, u.user_tier
    `;

    try {
      const result = await db.query(query, [userId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('User', userId);
      }

      const row = result.rows[0];
      return {
        totalEarnings: parseFloat(row.total_earnings) || 0,
        totalSubmissions: parseInt(row.total_submissions) || 0,
        approvedSubmissions: parseInt(row.approved_submissions) || 0,
        rejectedSubmissions: parseInt(row.rejected_submissions) || 0,
        pendingSubmissions: parseInt(row.pending_submissions) || 0,
        qualityScore: parseFloat(row.quality_score) || 0,
        userTier: row.user_tier
      };
    } catch (error) {
      throw new DatabaseError('Failed to get user statistics', error.code);
    }
  }

  // Get users by tier
  async getUsersByTier(tier: User['user_tier']): Promise<User[]> {
    const filters = { user_tier: tier, is_active: true };
    const sorts = [{ field: 'quality_score', direction: 'DESC' as const }];
    
    const result = await this.find(filters, sorts);
    return result.data;
  }

  // Update user earnings
  async updateEarnings(userId: string, amount: number): Promise<User> {
    const db = getDatabase();
    
    const query = `
      UPDATE users 
      SET total_earnings = total_earnings + $2
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query<User>(query, [userId, amount]);
      if (result.rows.length === 0) {
        throw new NotFoundError('User', userId);
      }
      return result.rows[0];
    } catch (error) {
      throw new DatabaseError('Failed to update user earnings', error.code);
    }
  }
}

---

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