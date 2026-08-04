import { redis } from '../config/database.js';
import { EmailNotificationService } from '../notification/email.service.js';
import { PackageRepository } from '../package/package.repository.js';

export interface PackageVerification {
  package_id: string;
  pickup_pin: string;
  delivery_pin: string;
  qr_code_data: string;
  pickup_confirmed: boolean;
  delivery_confirmed: boolean;
  pickup_confirmed_at?: Date;
  delivery_confirmed_at?: Date;
}

export interface QRCodeData {
  tracking_number: string;
  sender_name: string;
  recipient_name: string;
  pickup_address: string;
  delivery_address: string;
  package_size: string;
  delivery_speed: string;
  created_at: string;
}

export class PackageVerificationService {
  private emailService: EmailNotificationService;
  private packageRepository: PackageRepository;

  constructor() {
    this.emailService = new EmailNotificationService();
    this.packageRepository = new PackageRepository();
  }

  async sendPickupCodeToSender(senderEmail: string, senderName: string, pickupCode: string, trackingNumber: string): Promise<void> {
    await this.emailService.sendEmail(
      senderEmail,
      'Pickup Confirmation Code',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${senderName},</h2>
          <p>Your package (${trackingNumber}) is ready for pickup.</p>
          <p>Please share this pickup confirmation code with the rider:</p>
          <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${pickupCode}</h1>
          <p>This code confirms that the rider has collected your package.</p>
          <p>Thank you for choosing Traka Logistics.</p>
        </div>
      `
    );
  }

  async sendDeliveryCodeToRecipient(recipientEmail: string, recipientName: string, deliveryCode: string): Promise<void> {
    await this.emailService.sendEmail(
      recipientEmail,
      'Delivery Confirmation Code',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${recipientName},</h2>
          <p>Good news! Your package is almost here 🎉</p>
          <p>To complete the delivery, please share this delivery confirmation code with the rider:</p>
          <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px;">${deliveryCode}</h1>
          <p>This code helps us ensure your package gets to the right hands, yours.</p>
          <p>If you have any questions or need help, we are happy to assist.</p>
          <p>Thank you for choosing us,</p>
          <p><strong>Traka Logistics</strong></p>
        </div>
      `
    );
  }

  async scheduleDeliveryCodeEmail(recipientEmail: string, recipientName: string, deliveryCode: string, packageId: string): Promise<void> {
    const key = `delivery_code_scheduled:${packageId}`;
    await redis.setEx(key, 300, JSON.stringify({ recipientEmail, recipientName, deliveryCode }));
  }

  async triggerDeliveryCodeEmail(packageId: string): Promise<void> {
    const key = `delivery_code_scheduled:${packageId}`;
    const data = await redis.get(key);
    
    if (data) {
      const { recipientEmail, recipientName, deliveryCode } = JSON.parse(data);
      await this.sendDeliveryCodeToRecipient(recipientEmail, recipientName, deliveryCode);
      await redis.del(key);
    }
  }

  async generatePackageVerification(packageData: {
    package_id: string;
    tracking_number: string;
    sender_name: string;
    recipient_name: string;
    pickup_address: string;
    delivery_address: string;
    package_size: string;
    delivery_speed: string;
  }): Promise<PackageVerification> {
    const pickup_pin = this.generatePIN();
    const delivery_pin = this.generatePIN();

    const qrData: QRCodeData = {
      tracking_number: packageData.tracking_number,
      sender_name: packageData.sender_name,
      recipient_name: packageData.recipient_name,
      pickup_address: packageData.pickup_address,
      delivery_address: packageData.delivery_address,
      package_size: packageData.package_size,
      delivery_speed: packageData.delivery_speed,
      created_at: new Date().toISOString()
    };

    const qr_code_data = this.generateQRCodeData(qrData);

    await this.packageRepository.updatePackage(packageData.package_id, {
      pickup_pin,
      delivery_pin,
      qr_code_data,
    });

    return {
      package_id: packageData.package_id,
      pickup_pin,
      delivery_pin,
      qr_code_data,
      pickup_confirmed: false,
      delivery_confirmed: false,
    };
  }

  async confirmPickup(package_id: string, pin: string): Promise<boolean> {
    const pkg = await this.packageRepository.findById(package_id);
    if (!pkg) throw new Error('Package verification not found');
    if (pkg.pickup_confirmed) throw new Error('Package already picked up');
    if (pkg.pickup_pin !== pin) throw new Error('Invalid pickup PIN');
    return true;
  }

  async confirmDelivery(package_id: string, pin: string): Promise<boolean> {
    const pkg = await this.packageRepository.findById(package_id);
    if (!pkg) throw new Error('Package verification not found');
    if (!pkg.pickup_confirmed) throw new Error('Package must be picked up first');
    if (pkg.delivery_confirmed) throw new Error('Package already delivered');
    if (pkg.delivery_pin !== pin) throw new Error('Invalid delivery PIN');
    return true;
  }

  async getVerificationStatus(package_id: string): Promise<PackageVerification | null> {
    const pkg = await this.packageRepository.findById(package_id);
    if (!pkg || !pkg.pickup_pin) return null;
    return {
      package_id: pkg.id,
      pickup_pin: pkg.pickup_pin,
      delivery_pin: pkg.delivery_pin!,
      qr_code_data: pkg.qr_code_data ?? '',
      pickup_confirmed: pkg.pickup_confirmed,
      delivery_confirmed: pkg.delivery_confirmed,
      pickup_confirmed_at: pkg.pickup_confirmed_at,
      delivery_confirmed_at: pkg.delivery_confirmed_at,
    };
  }

  decodeQRCode(qr_code_data: string): QRCodeData {
    try {
      return JSON.parse(Buffer.from(qr_code_data, 'base64').toString());
    } catch (error) {
      throw new Error('Invalid QR code data');
    }
  }

  private generatePIN(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  private generateQRCodeData(data: QRCodeData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }
}