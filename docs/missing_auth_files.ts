// backend/src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository } from '@/database/repositories/UserRepository';
import { jwtConfig } from '@/config/environment';
import { logger } from '@/utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    userTier: string;
    kycStatus: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    isActive: boolean;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  tokenType: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// Authenticate user with JWT token
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtConfig.accessTokenSecret) as JWTPayload;

    if (decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type'
      });
    }

    // Get user from database
    const userRepo = new UserRepository();
    const user = await userRepo.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.full_name,
      userTier: user.user_tier,
      kycStatus: user.kyc_status,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      isActive: user.is_active
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Require verified phone number
export const requirePhoneVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.phoneVerified) {
    return res.status(403).json({
      success: false,
      error: 'Phone number verification required'
    });
  }
  next();
};

// Require email verification
export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.emailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required'
    });
  }
  next();
};

// Require specific user tier
export const requireUserTier = (minTier: string) => {
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const minTierIndex = tierOrder.indexOf(minTier);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userTierIndex = tierOrder.indexOf(req.user?.userTier || 'bronze');

    if (userTierIndex < minTierIndex) {
      return res.status(403).json({
        success: false,
        error: `${minTier} tier or higher required`
      });
    }
    next();
  };
};

// Require admin role (you can add admin field to user table later)
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // For now, check if user email is admin
  if (req.user?.email !== 'admin@fi-lis.com') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without user
    }

    const decoded = jwt.verify(token, jwtConfig.accessTokenSecret) as JWTPayload;
    
    if (decoded.tokenType === 'access') {
      const userRepo = new UserRepository();
      const user = await userRepo.findById(decoded.userId);

      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.full_name,
          userTier: user.user_tier,
          kycStatus: user.kyc_status,
          emailVerified: user.email_verified,
          phoneVerified: user.phone_verified,
          isActive: user.is_active
        };
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error);
  }

  next();
};

---

// backend/src/routes/auth.ts
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '@/services/AuthService';
import { authenticateToken, AuthenticatedRequest } from '@/middleware/authMiddleware';
import { logger } from '@/utils/logger';

const router = Router();
const authService = new AuthService();

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  body('full_name')
    .isLength({ min: 2 })
    .withMessage('Full name is required'),
  handleValidationErrors
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// OTP validation rules
const otpValidation = [
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Valid 6-digit OTP code is required'),
  body('purpose')
    .isIn(['registration', 'login', 'phone_verification', 'password_reset'])
    .withMessage('Valid purpose is required'),
  handleValidationErrors
];

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { email, phone, password, confirmPassword, full_name } = req.body;

    const result = await authService.register({
      email,
      phone,
      password,
      confirmPassword,
      full_name
    });

    logger.info(`User registered: ${email}`);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', otpValidation, async (req, res) => {
  try {
    const { phone, code, purpose } = req.body;

    await authService.verifyOTP(phone, code, purpose);

    logger.info(`OTP verified: ${phone} for ${purpose}`);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    logger.error('OTP verification error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', [
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('purpose')
    .isIn(['registration', 'login', 'phone_verification', 'password_reset'])
    .withMessage('Valid purpose is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { phone, purpose } = req.body;

    await authService.sendVerificationOTP(phone, purpose);

    logger.info(`OTP sent: ${phone} for ${purpose}`);

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/refresh-token
router.post('/refresh-token', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshTokens(refreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  handleValidationErrors
], async (req: AuthenticatedRequest, res) => {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    logger.info(`User logged out: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/logout-all
router.post('/logout-all', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    await authService.logoutAllDevices(req.user!.id);

    logger.info(`User logged out from all devices: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  handleValidationErrors
], async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.user!.id, currentPassword, newPassword);

    logger.info(`Password changed: ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/auth/me (get current user)
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;