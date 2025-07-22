// backend/src/services/EmailService.ts
import nodemailer from 'nodemailer';
import { env } from '@/config/environment';
import { logger } from '@/utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Only initialize if SMTP credentials are provided
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransporter({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      });
    }
  }

  async sendWelcomeEmail(email: string, fullName: string): Promise<void> {
    if (!this.transporter) {
      logger.warn('Email service not configured, skipping welcome email');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"Fi-Lis NPD Platform" <${env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to Fi-Lis NPD Platform!',
        html: this.getWelcomeEmailTemplate(fullName)
      });

      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
    }
  }

  async sendPasswordResetEmail(email: string, fullName: string, resetToken: string): Promise<void> {
    if (!this.transporter) {
      logger.warn('Email service not configured, skipping password reset email');
      return;
    }

    const resetUrl = `${env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: `"Fi-Lis NPD Platform" <${env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        html: this.getPasswordResetTemplate(fullName, resetUrl)
      });

      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
    }
  }

  private getWelcomeEmailTemplate(fullName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Fi-Lis NPD Platform</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
          <h1>Welcome to Fi-Lis NPD Platform!</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 10px; margin-top: 20px;">
          <h2>Hello ${fullName}!</h2>
          <p>Thank you for joining Fi-Lis NPD Platform. You're now part of a community that's revolutionizing food industry analytics and new product discovery.</p>
          
          <h3>What's Next?</h3>
          <ul>
            <li>🔍 <strong>Explore</strong> our database of 275,000+ food products</li>
            <li>📱 <strong>Submit</strong> new product discoveries and earn rewards</li>
            <li>💰 <strong>Earn</strong> up to ₹300 per verified submission</li>
            <li>📈 <strong>Track</strong> your progress and tier advancement</li>
          </ul>