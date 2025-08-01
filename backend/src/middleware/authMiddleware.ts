import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDatabase } from '@/database/connection';
import { env } from '@/config/environment';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    phone: string;
    full_name: string;
    user_tier: string;
    email_verified: boolean;
    phone_verified: boolean;
    kyc_status: string;
    is_active: boolean;
  };
}

// Verify JWT token and attach user to request
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    const db = getDatabase();

    const result = await db.query(
      'SELECT id, email, phone, full_name, user_tier, email_verified, phone_verified, kyc_status, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or user not found'
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Require phone verification
export const requirePhoneVerification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.phone_verified) {
    return res.status(403).json({
      success: false,
      error: 'Phone verification required'
    });
  }
  next();
};

// Require email verification
export const requireEmailVerification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required'
    });
  }
  next();
};

// Require specific user tier
export const requireUserTier = (minTier: string) => {
  const tierLevels = { bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5 };
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userTierLevel = tierLevels[req.user?.user_tier as keyof typeof tierLevels] || 0;
    const requiredTierLevel = tierLevels[minTier as keyof typeof tierLevels] || 0;
    
    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({
        success: false,
        error: `${minTier} tier or higher required`
      });
    }
    next();
  };
};

export { AuthenticatedRequest };