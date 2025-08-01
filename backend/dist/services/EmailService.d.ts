export declare class EmailService {
    private transporter;
    constructor();
    sendWelcomeEmail(email: string, fullName: string): Promise<void>;
    sendPasswordResetEmail(email: string, fullName: string, resetToken: string): Promise<void>;
    private getWelcomeEmailTemplate;
}
//# sourceMappingURL=EmailService.d.ts.map