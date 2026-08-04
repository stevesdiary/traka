import { WaitlistModel } from './waitlist.model.js';
import { EmailNotificationService } from '../notification/email.service.js';
import { sequelize } from '../config/database.js';
import logger from '../utils/logger.js';

export class WaitlistService {
  private emailService = new EmailNotificationService();

  async addToWaitlist(data: {
    name: string;
    email: string;
    location: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const existing = await WaitlistModel.findOne({
      where: { email: data.email, location: data.location }
    });

    if (existing) {
      return { message: 'You are already on the waitlist for this location', entry: existing };
    }

    const entry = await WaitlistModel.create(data);

    await this.sendWaitlistEmail(data.email, data.name, data.location);

    return { message: 'Successfully added to waitlist', entry };
  }

  private async sendWaitlistEmail(email: string, name: string, location: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Thank You for Your Interest in TRAKA!</h2>
        <p>Hi ${name},</p>
        <p>We appreciate your interest in using TRAKA for deliveries in <strong>${location}</strong>.</p>
        <p>We're not currently operating in your area, but we've added you to our waitlist. We'll notify you as soon as we launch services in your location!</p>
        <p>In the meantime, feel free to explore our services in other cities where we're already active.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from TRAKA. Please do not reply.</p>
      </div>
    `;

    try {
      await this.emailService.sendEmail(email, 'Welcome to TRAKA Waitlist', htmlContent);
    } catch (error) {
      logger.error('Failed to send waitlist email', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async getWaitlistByCity() {
    const rows = (await WaitlistModel.findAll({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.col('city'), sequelize.col('location')), 'city'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('COALESCE', sequelize.col('city'), sequelize.col('location'))],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true
    })) as unknown as Array<{ city: string; count: number | string }>;

    const grouped: Record<string, number> = {};
    for (const row of rows) {
      grouped[row.city] = Number(row.count);
    }

    return grouped;
  }

  async getAllWaitlist(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const { rows, count } = await WaitlistModel.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      entries: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    };
  }

  async notifyWaitlist(city: string) {
    const entries = await WaitlistModel.findAll({
      where: { city, notified: false }
    });

    for (const entry of entries) {
      await this.sendLaunchEmail(entry.email, entry.name, city);
      entry.notified = true;
      await entry.save();
    }

    return { notified: entries.length };
  }

  private async sendLaunchEmail(email: string, name: string, city: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎉 TRAKA is Now Available in ${city}!</h2>
        <p>Hi ${name},</p>
        <p>Great news! We've officially launched TRAKA delivery services in <strong>${city}</strong>.</p>
        <p>You can now enjoy fast, reliable deliveries in your area. Start sending packages today!</p>
        <p><a href="${process.env.APP_URL || 'https://traka.com'}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Get Started</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from TRAKA. Please do not reply.</p>
      </div>
    `;

    try {
      await this.emailService.sendEmail(email, `TRAKA is Now in ${city}!`, htmlContent);
    } catch (error) {
      logger.error('Failed to send launch email', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
