import { redis } from '../config/database.js';
import { UserRepository } from '../user/user.repository.js';
import { EmailNotificationService } from '../notification/email.service.js';
import { SMSService } from '../notification/sms.service.js';

export class VerificationService {
  private userRepository: UserRepository;
  private emailService: EmailNotificationService;
  private smsService: SMSService;
  private readonly CODE_EXPIRY = 900; // 15 minutes

  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailNotificationService();
    this.smsService = new SMSService();
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendEmailVerification(email: string, first_name: string): Promise<void> {
    const code = this.generateCode();
    const key = `verify:email:${email}`;
    
    await redis.setEx(key, this.CODE_EXPIRY, code);
    
    await this.emailService.sendEmail(
      email,
      'Verify Your TRAKA Account',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to TRAKA, ${first_name}!</h2>
          <p>Your verification number is:</p>
          <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${code}</h1>
          <p>This number will expire in 10 minutes.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        </div>
      `
    );
  }

  async sendPhoneVerification(phone: string): Promise<void> {
    const code = this.generateCode();
    const key = `verify:phone:${phone}`;
    
    await redis.setEx(key, this.CODE_EXPIRY, code);
    
    await this.smsService.sendOTP(phone, code);
  }

  async verifyEmail(email: string, code: string): Promise<boolean> {
    const key = `verify:email:${email}`;
    const storedCode = await redis.get(key);
    
    if (!storedCode || storedCode !== code) {
      return false;
    }

    await redis.del(key);
    await this.userRepository.updateByEmail(email, { email_verified: true });
    return true;
  }

  async verifyPhone(phone: string, code: string): Promise<boolean> {
    const key = `verify:phone:${phone}`;
    const storedCode = await redis.get(key);
    
    if (!storedCode || storedCode !== code) {
      return false;
    }

    await redis.del(key);
    await this.userRepository.updateByPhone(phone, { phone_verified: true });
    return true;
  }

  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');
    if (user.email_verified) throw new Error('Email already verified');
    
    const name = user.first_name || 'User';
    await this.sendEmailVerification(email, name);
  }

  async resendPhoneVerification(phone: string): Promise<void> {
    const user = await this.userRepository.findByPhone(phone);
    if (!user) throw new Error('User not found');
    if (user.phone_verified) throw new Error('Phone already verified');
    
    await this.sendPhoneVerification(phone);
  }
}
