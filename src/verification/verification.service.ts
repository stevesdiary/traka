import { EmailService } from './email.service.js';

interface OTPRecord {
  email: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
}

export class VerificationService {
  private emailService: EmailService;
  private otpRecords: Map<string, OTPRecord> = new Map();

  constructor() {
    this.emailService = new EmailService();
  }

  async sendOTP(email: string): Promise<void> {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 10 minutes

    // Store OTP record
    this.otpRecords.set(email, {
      email,
      otp,
      expiresAt,
      verified: false
    });

    // Send OTP via email
    await this.emailService.sendOTP(email, otp);
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const record = this.otpRecords.get(email);
    
    if (!record) {
      return false;
    }

    if (record.expiresAt < new Date()) {
      this.otpRecords.delete(email);
      return false;
    }

    if (record.otp !== otp) {
      return false;
    }

    // Mark as verified
    record.verified = true;
    return true;
  }

  async isEmailVerified(email: string): Promise<boolean> {
    const record = this.otpRecords.get(email);
    return record?.verified || false;
  }

  async clearVerification(email: string): Promise<void> {
    this.otpRecords.delete(email);
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}