import { redis, mongoClient } from '../config/database';
import { EmailService } from './email.service';

export class VerificationService {
  private emailService: EmailService;
  private otpCollection;

  constructor() {
    this.emailService = new EmailService();
    this.otpCollection = mongoClient.db().collection('otp_verifications');
  }

  async sendOTP(email: string): Promise<void> {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in Redis with TTL
    try {
      await redis.setEx(`otp:${email}`, 600, otp);
    } catch (error) {
      console.error('Redis OTP storage failed:', error);
    }

    // Store in MongoDB as fallback
    await this.otpCollection.updateOne(
      { email },
      { 
        $set: { 
          otp, 
          expiresAt, 
          verified: false,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    await this.emailService.sendOTP(email, otp);
  }

  async verifyOTP(email: string, inputOTP: string): Promise<boolean> {
    let storedOTP: string | null = null;

    // Try Redis first
    try {
      storedOTP = await redis.get(`otp:${email}`);
    } catch (error) {
      console.error('Redis OTP retrieval failed:', error);
    }

    // Fallback to MongoDB
    if (!storedOTP) {
      const otpDoc = await this.otpCollection.findOne({
        email,
        expiresAt: { $gt: new Date() },
        verified: false
      });
      storedOTP = otpDoc?.otp || null;
    }

    if (!storedOTP || storedOTP !== inputOTP) {
      return false;
    }

    // Mark as verified and cleanup
    await this.cleanup(email);
    return true;
  }

  private async cleanup(email: string): Promise<void> {
    // Remove from Redis
    try {
      await redis.del(`otp:${email}`);
    } catch (error) {
      console.error('Redis cleanup failed:', error);
    }

    // Mark as verified in MongoDB
    await this.otpCollection.updateOne(
      { email },
      { $set: { verified: true } }
    );
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}