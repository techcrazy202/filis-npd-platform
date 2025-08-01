import jwt from 'jsonwebtoken';
import { UserRepository } from '@/database/repositories/UserRepository';
import { jwtConfig } from '@/config/environment';
import { logger } from '@/utils/logger';
// Authenticate user with JWT token
export const authenticateToken = async (req, res, next) => {
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
        const decoded = jwt.verify(token, jwtConfig.accessTokenSecret);
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
    }
    catch (error) {
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
export const requirePhoneVerification = (req, res, next) => {
    if (!req.user?.phoneVerified) {
        return res.status(403).json({
            success: false,
            error: 'Phone number verification required'
        });
    }
    next();
};
// Require email verification
export const requireEmailVerification = (req, res, next) => {
    if (!req.user?.emailVerified) {
        return res.status(403).json({
            success: false,
            error: 'Email verification required'
        });
    }
    next();
};
// Require specific user tier
export const requireUserTier = (minTier) => {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const minTierIndex = tierOrder.indexOf(minTier);
    return (req, res, next) => {
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
export const requireAdmin = (req, res, next) => {
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
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return next(); // Continue without user
        }
        const decoded = jwt.verify(token, jwtConfig.accessTokenSecret);
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
    }
    catch (error) {
        // Silently fail for optional auth
        logger.debug('Optional auth failed:', error);
    }
    next();
};
//# sourceMappingURL=AuthService.js.map