// backend/src/database/repositories/UserRepository.ts
// User-specific database operations
import { BaseRepository } from './BaseRepository';
import { getDatabase } from '../connection';
import { DatabaseError, NotFoundError, DuplicateError } from '../errors';
import * as bcrypt from 'bcrypt';
export class UserRepository extends BaseRepository {
    constructor() {
        super('users');
    }
    // Create user with password hashing
    async createUser(userData) {
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
            const result = await db.query(query, [
                userData.email,
                userData.phone,
                password_hash,
                userData.full_name
            ]);
            return result.rows[0];
        }
        catch (error) {
            if (error.code === '23505') { // Unique violation
                throw new DuplicateError('User', 'email or phone');
            }
            throw new DatabaseError('Failed to create user', error.code);
        }
    }
    // Find user by email or phone
    async findByEmailOrPhone(email, phone) {
        const db = getDatabase();
        const query = `
      SELECT * FROM users 
      WHERE email = $1 OR phone = $2
      LIMIT 1
    `;
        try {
            const result = await db.query(query, [email, phone]);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new DatabaseError('Failed to find user by email or phone', error.code);
        }
    }
    // Find user by email
    async findByEmail(email) {
        const db = getDatabase();
        const query = `SELECT * FROM users WHERE email = $1`;
        try {
            const result = await db.query(query, [email]);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new DatabaseError('Failed to find user by email', error.code);
        }
    }
    // Find user by phone
    async findByPhone(phone) {
        const db = getDatabase();
        const query = `SELECT * FROM users WHERE phone = $1`;
        try {
            const result = await db.query(query, [phone]);
            return result.rows[0] || null;
        }
        catch (error) {
            throw new DatabaseError('Failed to find user by phone', error.code);
        }
    }
    // Verify user password
    async verifyPassword(userId, password) {
        const user = await this.findById(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }
        return await bcrypt.compare(password, user.password_hash);
    }
    // Update user password
    async updatePassword(userId, newPassword) {
        const saltRounds = 12;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);
        await this.update(userId, { password_hash });
    }
    // Update user tier based on performance
    async updateUserTier(userId) {
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
            const result = await db.query(query, [userId]);
            if (result.rows.length === 0) {
                throw new NotFoundError('User', userId);
            }
            return result.rows[0];
        }
        catch (error) {
            throw new DatabaseError('Failed to update user tier', error.code);
        }
    }
    // Get user statistics
    async getUserStats(userId) {
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
        }
        catch (error) {
            throw new DatabaseError('Failed to get user statistics', error.code);
        }
    }
    // Get users by tier
    async getUsersByTier(tier) {
        const filters = { user_tier: tier, is_active: true };
        const sorts = [{ field: 'quality_score', direction: 'DESC' }];
        const result = await this.find(filters, sorts);
        return result.data;
    }
    // Update user earnings
    async updateEarnings(userId, amount) {
        const db = getDatabase();
        const query = `
      UPDATE users 
      SET total_earnings = total_earnings + $2
      WHERE id = $1
      RETURNING *
    `;
        try {
            const result = await db.query(query, [userId, amount]);
            if (result.rows.length === 0) {
                throw new NotFoundError('User', userId);
            }
            return result.rows[0];
        }
        catch (error) {
            throw new DatabaseError('Failed to update user earnings', error.code);
        }
    }
}
//# sourceMappingURL=UserRepository.js.map