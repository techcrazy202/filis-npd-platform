import { Request, Response, NextFunction } from 'express';
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
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requirePhoneVerification: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireEmailVerification: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireUserTier: (minTier: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export { AuthenticatedRequest };
//# sourceMappingURL=authMiddleware.d.ts.map