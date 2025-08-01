import { BaseRepository } from './BaseRepository';
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
export declare class UserRepository extends BaseRepository<User> {
    constructor();
    createUser(userData: CreateUserData): Promise<User>;
    findByEmailOrPhone(email: string, phone: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByPhone(phone: string): Promise<User | null>;
    verifyPassword(userId: string, password: string): Promise<boolean>;
    updatePassword(userId: string, newPassword: string): Promise<void>;
    updateUserTier(userId: string): Promise<User>;
    getUserStats(userId: string): Promise<{
        totalEarnings: number;
        totalSubmissions: number;
        approvedSubmissions: number;
        rejectedSubmissions: number;
        pendingSubmissions: number;
        qualityScore: number;
        userTier: string;
    }>;
    getUsersByTier(tier: User['user_tier']): Promise<User[]>;
    updateEarnings(userId: string, amount: number): Promise<User>;
}
//# sourceMappingURL=UserRepository.d.ts.map