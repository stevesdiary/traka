import { redis } from '../../config/database.js';
import { PackageModel } from '../../package/package.model.js';
import { EmailNotificationService } from '../../notification/email.service.js';
import logger from '../../utils/logger.js';

export class DispatchTimeoutService {
  private static readonly TIMEOUT_MINUTES = 30;
  private static readonly DISPATCH_ATTEMPT_PREFIX = 'dispatch:attempt:';
  private emailService = new EmailNotificationService();

  async trackDispatchAttempt(packageId: string): Promise<void> {
    const key = `${DispatchTimeoutService.DISPATCH_ATTEMPT_PREFIX}${packageId}`;
    const timeoutSeconds = DispatchTimeoutService.TIMEOUT_MINUTES * 60;
    
    await redis.setEx(key, timeoutSeconds, JSON.stringify({
      packageId,
      startedAt: Date.now(),
      expiresAt: Date.now() + (timeoutSeconds * 1000)
    }));
  }

  async checkAndHandleTimeout(packageId: string): Promise<boolean> {
    const key = `${DispatchTimeoutService.DISPATCH_ATTEMPT_PREFIX}${packageId}`;
    const attempt = await redis.get(key);
    
    if (!attempt) {
      return await this.handleNoRiderFound(packageId);
    }
    
    return false;
  }

  private async handleNoRiderFound(packageId: string): Promise<boolean> {
    const packageData = await PackageModel.findByPk(packageId, {
      include: ['sender']
    });
    
    if (!packageData || packageData.status !== 'PENDING') {
      return false;
    }

    // Update package status to indicate no rider found
    await packageData.update({
      status: 'CANCELLED',
      cancellation_reason: 'LONG_PICKUP_TIME',
      cancellation_note: 'No rider available within 30 minutes',
      cancelled_at: new Date()
    });

    // Notify sender
    await this.notifySenderNoRider(packageData);

    return true;
  }

  private async notifySenderNoRider(packageData: any): Promise<void> {
    const senderEmail = packageData.sender?.email;
    if (!senderEmail) return;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>No Rider Available</h2>
        <p>Hi ${packageData.sender?.first_name || 'there'},</p>
        <p>We're sorry, but we couldn't find an available rider for your delivery within 30 minutes.</p>
        <p><strong>Tracking Number:</strong> ${packageData.tracking_number}</p>
        <p><strong>Pickup Address:</strong> ${packageData.pickup_address || 'N/A'}</p>
        <p><strong>Delivery Address:</strong> ${packageData.delivery_address}</p>
        <p>Your package has been cancelled and no charges have been applied.</p>
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Try again later when more riders are available</li>
          <li>Schedule your delivery for a later time</li>
          <li>Contact support for assistance</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from TRAKA.</p>
      </div>
    `;

    try {
      await this.emailService.sendEmail(
        senderEmail,
        'Delivery Cancelled - No Rider Available',
        htmlContent
      );
    } catch (error) {
      logger.error('Failed to send no-rider notification', { error: (error as Error).message });
    }
  }

  async clearDispatchAttempt(packageId: string): Promise<void> {
    const key = `${DispatchTimeoutService.DISPATCH_ATTEMPT_PREFIX}${packageId}`;
    await redis.del(key);
  }
}
