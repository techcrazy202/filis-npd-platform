import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '@/database/connection';
import { env } from '@/config/environment';
import { authenticateToken, AuthenticatedRequest } from '@/middleware/authMiddleware';

const router = Router();

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('phone').isMobilePhone('en-IN'),
  body('password').isLength({ min: 8 }),
  body('full_name').isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, phone, password, full_name } = req.body;
    const db = getDatabase();

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email or phone'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, phone, password_hash, full_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, phone, full_name, user_tier, created_at`,
      [email, phone, password_hash, full_name]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          full_name: user.full_name,
          user_tier: user.user_tier
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    const db = getDatabase();

    // Find user
    const result = await db.query(
      'SELECT id, email, phone, password_hash, full_name, user_tier, email_verified, phone_verified, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          full_name: user.full_name,
          user_tier: user.user_tier,
          email_verified: user.email_verified,
          phone_verified: user.phone_verified
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Send OTP for phone verification
router.post('/send-otp', [
  body('phone').isMobilePhone('en-IN'),
  body('purpose').isIn(['verification', 'password_reset'])
], async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    const db = getDatabase();

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP (replace existing)
    await db.query(
      `INSERT INTO otp_codes (phone, code, purpose, expires_at) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (phone, purpose) 
       DO UPDATE SET code = $2, expires_at = $4, attempts = 0, created_at = NOW()`,
      [phone, code, purpose, expires_at]
    );

    // TODO: Send SMS using your SMS provider
    console.log(`OTP for ${phone}: ${code}`);

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP'
    });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('phone').isMobilePhone('en-IN'),
  body('code').isLength({ min: 6, max: 6 }),
  body('purpose').isIn(['verification', 'password_reset'])
], async (req, res) => {
  try {
    const { phone, code, purpose } = req.body;
    const db = getDatabase();

    // Find OTP
    const result = await db.query(
      'SELECT * FROM otp_codes WHERE phone = $1 AND purpose = $2 AND expires_at > NOW()',
      [phone, purpose]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    const otpRecord = result.rows[0];

    if (otpRecord.attempts >= 3) {
      return res.status(400).json({
        success: false,
        error: 'Too many attempts. Please request a new OTP'
      });
    }

    if (otpRecord.code !== code) {
      // Increment attempts
      await db.query(
        'UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1',
        [otpRecord.id]
      );
      
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    // OTP is valid - delete it
    await db.query('DELETE FROM otp_codes WHERE id = $1', [otpRecord.id]);

    // If verification purpose, update user
    if (purpose === 'verification') {
      await db.query(
        'UPDATE users SET phone_verified = true WHERE phone = $1',
        [phone]
      );
    }

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'OTP verification failed'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const db = getDatabase();
    
    const result = await db.query(
      `SELECT id, email, phone, full_name, user_tier, total_earnings, 
              total_submissions, approved_submissions, quality_score,
              email_verified, phone_verified, kyc_status, created_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    );

    res.json({
      success: true,
      data: { user: result.rows[0] }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// Change password
router.post('/change-password', [
  authenticateToken,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 })
], async (req: AuthenticatedRequest, res) => {
  try {
    const { current_password, new_password } = req.body;
    const db = getDatabase();

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.id]
    );

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const new_password_hash = await bcrypt.hash(new_password, 12);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [new_password_hash, req.user!.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

export default router;