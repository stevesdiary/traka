import { PackageRepository } from "./package.repository.js";
import { UserRepository } from "../user/user.repository.js";
import { PricingService, PricingRequest } from "../pricing/pricing.service.js";
import { PackageVerificationService } from "../verification/package-verification.service.js";

export class PackageService {
  private packageRepository: PackageRepository;
  private userRepository: UserRepository;
  private pricingService: PricingService;
  private packageVerificationService: PackageVerificationService;

  constructor() {
    this.packageRepository = new PackageRepository();
    this.userRepository = new UserRepository();
    this.pricingService = new PricingService();
    this.packageVerificationService = new PackageVerificationService();
  }

  async createPackage(
    data: {
      recipient_name: string;
      recipient_email?: string;
      recipient_phone: string;
      pickup_address: string;
      delivery_address: string;
      description: string;
      delivery_notes?: string;
      package_size: 'SMALL' | 'MEDIUM' | 'LARGE';
      package_weight?: number;
      delivery_speed: 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
    },
    sender_id: string,
    tenant_id: string | null
  ): Promise<any> {
    // Calculate pricing
    const pricingRequest: PricingRequest = {
      pickup_address: data.pickup_address,
      delivery_address: data.delivery_address,
      package_size: data.package_size,
      package_weight: data.package_weight,
      delivery_speed: data.delivery_speed,
      tenant_id
    };
    
    const pricing = await this.pricingService.calculateDeliveryPrice(pricingRequest);
    // Check if recipient has an account by phone or email
    const existingRecipient =
      (await this.userRepository.findByPhone(data.recipient_phone)) ||
      (data.recipient_email
        ? await this.userRepository.findByEmail(data.recipient_email)
        : null);

    const tracking_number = this.generateTrackingNumber();
    const guest_tracking_token = existingRecipient
      ? null
      : this.generateGuestToken();

    const packageData = {
      tracking_number,
      sender_id,
      recipient_id: existingRecipient?.id || undefined,
      recipient_name: data.recipient_name,
      recipient_email: data.recipient_email,
      recipient_phone: data.recipient_phone,
      delivery_address: data.delivery_address,
      description: data.description,
      delivery_notes: data.delivery_notes,
      package_size: data.package_size,
      package_weight: data.package_weight,
      delivery_speed: data.delivery_speed,
      delivery_fee: pricing.total_amount - pricing.platform_fee,
      platform_fee: pricing.platform_fee,
      total_amount: pricing.total_amount,
      estimated_distance_km: pricing.estimated_distance_km,
      guest_tracking_token: guest_tracking_token || undefined,
      tenant_id,
    };

    const newPackage = await this.packageRepository.createPackage(packageData);

    // Generate verification codes and QR code
    const verification = this.packageVerificationService.generatePackageVerification({
      package_id: newPackage.id,
      tracking_number,
      sender_name: 'Sender', // TODO: Get from sender user data
      recipient_name: data.recipient_name,
      pickup_address: data.pickup_address,
      delivery_address: data.delivery_address,
      package_size: data.package_size,
      delivery_speed: data.delivery_speed
    });

    // Send tracking notification to recipient
    await this.sendTrackingNotification(newPackage);

    return {
      ...newPackage,
      pickup_pin: verification.pickup_pin,
      delivery_pin: verification.delivery_pin,
      qr_code_data: verification.qr_code_data,
      pricing_breakdown: {
        base_fee: pricing.base_fee,
        distance_fee: pricing.distance_fee,
        size_fee: pricing.size_fee,
        speed_fee: pricing.speed_fee,
        platform_fee: pricing.platform_fee,
        total_amount: pricing.total_amount
      },
      tracking_url: this.generateTrackingUrl(
        tracking_number,
        guest_tracking_token || undefined
      ),
    };
  }

  async getPackageByTrackingNumber(
    tracking_number: string,
    guest_token?: string
  ): Promise<any> {
    const packageData = await this.packageRepository.findByTrackingNumber(
      tracking_number
    );
    if (!packageData) {
      throw new Error("Package not found");
    }

    // For guest packages, verify token if provided
    if (!packageData.recipient_id && packageData.guest_tracking_token) {
      if (!guest_token || guest_token !== packageData.guest_tracking_token) {
        throw new Error("Invalid tracking access");
      }
    }

    return {
      id: packageData.id,
      tracking_number: packageData.tracking_number,
      status: packageData.status,
      recipient_name: packageData.recipient_name,
      recipient_email: packageData.recipient_email,
      delivery_address: packageData.delivery_address,
      description: packageData.description,
      delivery_notes: packageData.delivery_notes,
      created_at: packageData.createdAt,
      delivered_at: packageData.delivered_at,
      is_guest_delivery: !packageData.recipient_id,
    };
  }

  async claimPackageToAccount(
    tracking_number: string,
    guest_token: string,
    user_id: string
  ): Promise<any> {
    const packageData = await this.packageRepository.findByTrackingNumber(
      tracking_number
    );
    if (!packageData) {
      throw new Error("Package not found");
    }

    if (packageData.recipient_id) {
      throw new Error("Package already claimed");
    }

    if (packageData.guest_tracking_token !== guest_token) {
      throw new Error("Invalid guest token");
    }

    // Update package to link with user account
    await this.packageRepository.updatePackage(packageData.id, {
      recipient_id: user_id,
      guest_tracking_token: undefined,
    });

    return { message: "Package claimed successfully" };
  }

  async cancelPackage(
    package_id: string,
    user_id: string,
    cancellation_reason: string,
    cancellation_note?: string
  ): Promise<any> {
    const packageData = await this.packageRepository.findById(package_id);
    if (!packageData) {
      throw new Error("Package not found");
    }

    if (packageData.sender_id !== user_id) {
      throw new Error("Unauthorized: Only sender can cancel package");
    }

    if (packageData.status === 'DELIVERED') {
      throw new Error("Cannot cancel delivered package");
    }

    if (packageData.status === 'CANCELLED') {
      throw new Error("Package already cancelled");
    }

    await this.packageRepository.updatePackage(package_id, {
      status: 'CANCELLED',
      cancellation_reason,
      cancellation_note,
      cancelled_at: new Date(),
      cancelled_by: user_id
    });

    return { 
      message: "Package cancelled successfully",
      tracking_number: packageData.tracking_number
    };
  }

  async updatePackageStatus(
    package_id: string,
    status: string,
    tenant_id: string | null
  ): Promise<any> {
    const updateData: any = { status };
    if (status === "DELIVERED") {
      updateData.delivered_at = new Date();
      updateData.delivery_confirmed = true;
      updateData.delivery_confirmed_at = new Date();
    }
    if (status === "IN_TRANSIT") {
      updateData.pickup_confirmed = true;
      updateData.pickup_confirmed_at = new Date();
    }

    const [affectedRows, updatedPackages] =
      await this.packageRepository.updateStatus(
        package_id,
        tenant_id,
        updateData
      );

    if (affectedRows === 0) {
      throw new Error("Package not found or unauthorized");
    }

    return updatedPackages[0];
  }

  async confirmPickup(package_id: string, pin: string, tenant_id: string | null): Promise<any> {
    const verification = this.packageVerificationService.getVerificationStatus(package_id);
    if (!verification) {
      throw new Error('Package verification not found');
    }

    await this.packageVerificationService.confirmPickup(package_id, pin);
    
    // Update package status
    await this.updatePackageStatus(package_id, 'IN_TRANSIT', tenant_id);
    
    return { message: 'Package pickup confirmed', status: 'IN_TRANSIT' };
  }

  async confirmDelivery(package_id: string, pin: string, tenant_id: string | null): Promise<any> {
    const verification = this.packageVerificationService.getVerificationStatus(package_id);
    if (!verification) {
      throw new Error('Package verification not found');
    }

    await this.packageVerificationService.confirmDelivery(package_id, pin);
    
    // Update package status
    await this.updatePackageStatus(package_id, 'DELIVERED', tenant_id);
    
    return { message: 'Package delivery confirmed', status: 'DELIVERED' };
  }

  async getQRCodeData(qr_code_data: string): Promise<any> {
    return this.packageVerificationService.decodeQRCode(qr_code_data);
  }

  private generateTrackingNumber(): string {
    return (
      "TRK" +
      Date.now().toString() +
      Math.random().toString(36).substr(2, 5).toUpperCase()
    );
  }

  private generateGuestToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private generateTrackingUrl(
    tracking_number: string,
    guest_token?: string
  ): string {
    const appScheme = process.env.APP_SCHEME || "traka";
    const webUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const tokenParam = guest_token ? `?token=${guest_token}` : "";

    // Universal link that opens app if installed, otherwise web browser
    return `${webUrl}/track/${tracking_number}${tokenParam}`;
  }

  private generateDeepLink(
    tracking_number: string,
    guest_token?: string
  ): string {
    const appScheme = process.env.APP_SCHEME || "traka";
    const tokenParam = guest_token ? `&token=${guest_token}` : "";
    return `${appScheme}://track?number=${tracking_number}${tokenParam}`;
  }

  private async sendTrackingNotification(packageData: any): Promise<void> {
    const trackingUrl = this.generateTrackingUrl(
      packageData.tracking_number,
      packageData.guest_tracking_token
    );
    const deepLink = this.generateDeepLink(
      packageData.tracking_number,
      packageData.guest_tracking_token
    );

    const message = `Hi ${packageData.recipient_name}! Your package (${packageData.tracking_number}) is on its way. Track it here: ${trackingUrl}`;

    try {
      // Primary: Send via SMS
      await this.sendSMS(packageData.recipient_phone, message);

      // Secondary: Send via WhatsApp if available
      await this.sendWhatsApp(packageData.recipient_phone, message);

      // Fallback: Send email if provided
      if (packageData.recipient_email) {
        await this.sendEmail(
          packageData.recipient_email,
          "Package Tracking",
          message
        );
      }
    } catch (error) {
      console.error("Failed to send tracking notification:", error);
    }
  }

  private async sendSMS(phone: string, message: string): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS sent to ${phone}: ${message}`);
  }

  private async sendWhatsApp(phone: string, message: string): Promise<void> {
    // TODO: Integrate with WhatsApp Business API
    console.log(`WhatsApp sent to ${phone}: ${message}`);
  }

  private async sendEmail(
    email: string,
    subject: string,
    message: string
  ): Promise<void> {
    // TODO: Integrate with email service
    console.log(`Email sent to ${email}: ${subject} - ${message}`);
  }
}
