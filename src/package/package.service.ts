import { PackageRepository } from "./package.repository.js";
import { UserRepository } from "../user/user.repository.js";
import { PricingService, PricingRequest } from "../pricing/pricing.service.js";
import { PackageVerificationService } from "../verification/package-verification.service.js";
import { ServiceAreaService } from "../service-area/service-area.service.js";
import { GeocodingService } from "../utils/geocoding.service.js";
import { DispatchService } from "../matching/services/DispatchService.js";
import { VehicleType } from "../matching/config/vehicles.js";
import { CourierPresenceService } from "../matching/services/CourierPresenceService.js";
import { RiderRepository } from "../rider/rider.repository.js";
import {
  NotificationService,
  NotificationType,
} from "../notification/notification.service.js";
import { webhookService } from "../webhook/webhook.service.js";
import { customAlphabet } from 'nanoid';
import type { DeliveryRequest } from "../matching/models/CourierState.js";
import type { RiderModel } from "../rider/rider.model.js";

export class PackageService {
  private packageRepository: PackageRepository;
  private userRepository: UserRepository;
  private pricingService: PricingService;
  private packageVerificationService: PackageVerificationService;
  private serviceAreaService: ServiceAreaService;
  private geocodingService: GeocodingService;
  private riderRepository: RiderRepository;
  private notificationService: NotificationService;

  constructor() {
    this.packageRepository = new PackageRepository();
    this.userRepository = new UserRepository();
    this.pricingService = new PricingService();
    this.packageVerificationService = new PackageVerificationService();
    this.serviceAreaService = new ServiceAreaService();
    this.geocodingService = new GeocodingService();
    this.riderRepository = new RiderRepository();
    this.notificationService = new NotificationService();
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
      category: string;
      is_fragile?: boolean;
      payment_method?: 'DIGITAL' | 'CASH';
      payment_by?: 'SENDER' | 'RECIPIENT';
    },
    sender_id: string,
    tenant_id: string | null
  ): Promise<any> {
    // Geocode addresses to get coordinates and city/state
    const pickupGeo = await this.geocodingService.geocodeAddress(data.pickup_address);
    const deliveryGeo = await this.geocodingService.geocodeAddress(data.delivery_address);

    // Check service area coverage (city/state only)
    const pickupCoverage = await this.serviceAreaService.checkCoverage(
      pickupGeo.city,
      pickupGeo.state
    );
    if (!pickupCoverage.covered) {
      throw new Error('PICKUP_OUT_OF_COVERAGE: Pickup location is outside our service area');
    }

    const deliveryCoverage = await this.serviceAreaService.checkCoverage(
      deliveryGeo.city,
      deliveryGeo.state
    );
    if (!deliveryCoverage.covered) {
      throw new Error('DELIVERY_OUT_OF_COVERAGE: Delivery location is outside our service area');
    }

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

    const tracking_number = await this.generateTrackingNumber();
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
      category: data.category,
      is_fragile: data.is_fragile || false,
      delivery_fee: pricing.total_amount - pricing.platform_fee,
      platform_fee: pricing.platform_fee,
      total_amount: pricing.total_amount,
      estimated_distance_km: pricing.estimated_distance_km,
      guest_tracking_token: guest_tracking_token || undefined,
      tenant_id,
      payment_method: data.payment_method || 'DIGITAL',
      payment_by: data.payment_by || 'SENDER',
      payment_status: data.payment_method === 'CASH' ? 'PENDING' : 'PAID',
      paid_at: data.payment_method === 'DIGITAL' ? new Date() : undefined,
    };

    const newPackage = await this.packageRepository.createPackage(packageData);

    // Get sender information
    const sender = await this.userRepository.findById(sender_id);
    const sender_name = sender ? `${sender.first_name} ${sender.last_name}` : 'Sender';

    // Generate verification codes and QR code
    const verification = this.packageVerificationService.generatePackageVerification({
      package_id: newPackage.id,
      tracking_number,
      sender_name,
      recipient_name: data.recipient_name,
      pickup_address: data.pickup_address,
      delivery_address: data.delivery_address,
      package_size: data.package_size,
      delivery_speed: data.delivery_speed
    });

    // Send pickup code to sender
    if (sender?.email) {
      await this.packageVerificationService.sendPickupCodeToSender(
        sender.email,
        sender_name,
        verification.pickup_pin,
        tracking_number
      );
    }

    // Schedule delivery code email (will be sent 5 minutes before arrival)
    if (data.recipient_email) {
      await this.packageVerificationService.scheduleDeliveryCodeEmail(
        data.recipient_email,
        data.recipient_name,
        verification.delivery_pin,
        newPackage.id
      );
    }

    // Send tracking notification to recipient
    await this.sendTrackingNotification(newPackage);
    const dispatch = await this.attemptAutoDispatch(
      newPackage,
      data,
      pickupGeo,
      deliveryGeo
    );

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
      dispatch,
    };
  }

  async getPackageByTrackingNumber(
    tracking_number: string,
    guest_token?: string,
    requester?: { id: string; role: string }
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

    // Enforce ownership for authenticated requests
    if (requester) {
      const isStaff = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(requester.role);
      const isOwner =
        packageData.sender_id === requester.id ||
        packageData.recipient_id === requester.id;

      if (!isStaff && !isOwner) {
        throw new Error("Unauthorized");
      }
    }

    const liveTracking = await this.getLiveTrackingData(packageData);

    return {
      id: packageData.id,
      tracking_number: packageData.tracking_number,
      status: packageData.status,
      recipient_name: packageData.recipient_name,
      recipient_email: packageData.recipient_email,
      delivery_address: packageData.delivery_address,
      description: packageData.description,
      delivery_notes: packageData.delivery_notes,
      rider_id: packageData.rider_id,
      created_at: packageData.createdAt,
      delivered_at: packageData.delivered_at,
      is_guest_delivery: !packageData.recipient_id,
      live_tracking: liveTracking,
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
    rider_has_package: boolean,
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
      rider_has_package,
      cancelled_at: new Date(),
      cancelled_by: user_id
    });

    return { 
      message: "Package cancelled successfully",
      tracking_number: packageData.tracking_number,
      rider_has_package,
      action_required: rider_has_package ? 'Rider needs to return the package' : 'No return needed'
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

    const updated = updatedPackages[0];
    if (tenant_id && updated) {
      const event = status === 'DELIVERED' ? 'order.delivered' : 'order.status_changed';
      setImmediate(() => {
        webhookService.dispatch(tenant_id, event, {
          package_id: package_id,
          status,
          updated_at: new Date().toISOString(),
        });
      });
    }

    return updated;
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

  async getPackagesForUser(userId: string): Promise<any[]> {
    const packages = await this.packageRepository.findByUserId(userId);
    return packages.map((pkg: any) => ({
      id: pkg.id,
      tracking_number: pkg.tracking_number,
      status: pkg.status,
      recipient_name: pkg.recipient_name,
      delivery_address: pkg.delivery_address,
      description: pkg.description,
      package_size: pkg.package_size,
      rider_id: pkg.rider_id,
      created_at: pkg.createdAt,
      is_sender: pkg.sender_id === userId,
    }));
  }

  private async attemptAutoDispatch(
    packageData: any,
    data: {
      pickup_address: string;
      delivery_address: string;
      package_size: 'SMALL' | 'MEDIUM' | 'LARGE';
      package_weight?: number;
      is_fragile?: boolean;
    },
    pickupGeo: { latitude: number; longitude: number },
    deliveryGeo: { latitude: number; longitude: number }
  ): Promise<{
    assigned: boolean;
    attempts: number;
    message?: string;
    rider_id?: string;
    eta_seconds?: number;
  }> {
    const deliveryRequest: DeliveryRequest = {
      id: packageData.id,
      pickupLocation: {
        lat: pickupGeo.latitude,
        lng: pickupGeo.longitude,
        address: data.pickup_address,
      },
      dropoffLocation: {
        lat: deliveryGeo.latitude,
        lng: deliveryGeo.longitude,
        address: data.delivery_address,
      },
      package: {
        weight: this.resolvePackageWeight(data.package_size, data.package_weight),
        volume: this.resolvePackageVolume(data.package_size),
        fragile: Boolean(data.is_fragile),
      },
      requiredVehicleType: this.resolveRequiredVehicleType(
        data.package_size,
        data.package_weight
      ),
      createdAt: Date.now(),
    };

    try {
      const dispatchResult = await DispatchService.dispatchDelivery(deliveryRequest);

      if (!dispatchResult.success || !dispatchResult.assignedCourier) {
        return {
          assigned: false,
          attempts: dispatchResult.attempts,
          message: dispatchResult.message,
        };
      }

      const assignedRider = await this.resolveAssignedRider(
        dispatchResult.assignedCourier.id
      );

      if (!assignedRider) {
        return {
          assigned: false,
          attempts: dispatchResult.attempts,
          message: "Courier accepted but rider profile could not be resolved",
        };
      }

      await this.packageRepository.assignRider(packageData.id, assignedRider.userId);

      await Promise.allSettled([
        this.riderRepository.updateRiderProfile(assignedRider.userId, {
          status: "BUSY",
          is_available: false,
        }),
        CourierPresenceService.updateCourierStatus(
          dispatchResult.assignedCourier.id,
          "BUSY",
          assignedRider.vehicleType
        ),
      ]);

      const notificationPayload = {
        package_id: packageData.id,
        tracking_number: packageData.tracking_number,
        pickup_address: data.pickup_address,
        delivery_address: data.delivery_address,
        rider_name: assignedRider.fullName,
      };

      await Promise.allSettled([
        this.notificationService.sendToRider(
          assignedRider.userId,
          NotificationType.DELIVERY_ASSIGNED,
          notificationPayload
        ),
        this.notificationService.sendToCustomer(
          packageData.sender_id,
          NotificationType.RIDER_ASSIGNED,
          notificationPayload
        ),
      ]);

      if (packageData.tenant_id) {
        setImmediate(() => {
          webhookService.dispatch(packageData.tenant_id, 'rider.assigned', {
            package_id: packageData.id,
            tracking_number: packageData.tracking_number,
            rider_id: assignedRider.userId,
            eta_seconds: dispatchResult.eta ? Math.round(dispatchResult.eta) : undefined,
          });
        });
      }

      return {
        assigned: true,
        attempts: dispatchResult.attempts,
        message: dispatchResult.message,
        rider_id: assignedRider.userId,
        eta_seconds: dispatchResult.eta
          ? Math.round(dispatchResult.eta)
          : undefined,
      };
    } catch (error) {
      console.error("Auto-dispatch failed", error);
      return {
        assigned: false,
        attempts: 0,
        message: "Automatic rider assignment failed",
      };
    }
  }

  private async resolveAssignedRider(
    courierId: string
  ): Promise<{
    userId: string;
    fullName: string;
    vehicleType: VehicleType;
  } | null> {
    let rider: RiderModel | null = null;

    const riderByPrimaryId = await this.riderRepository.findById(courierId);
    if (riderByPrimaryId) {
      rider =
        (await this.riderRepository.getRiderByUserId(riderByPrimaryId.user_id)) ||
        riderByPrimaryId;
    } else {
      rider = await this.riderRepository.getRiderByUserId(courierId);
    }

    if (!rider) {
      return null;
    }

    const fullName = rider.user
      ? `${rider.user.first_name} ${rider.user.last_name}`.trim()
      : "Rider";

    return {
      userId: rider.user_id,
      fullName,
      vehicleType:
        rider.vehicle_type === "BICYCLE"
          ? VehicleType.BICYCLE
          : VehicleType.MOTORCYCLE,
    };
  }

  private resolvePackageWeight(
    packageSize: 'SMALL' | 'MEDIUM' | 'LARGE',
    packageWeight?: number
  ): number {
    if (packageWeight && packageWeight > 0) {
      return packageWeight;
    }

    if (packageSize === "SMALL") return 1;
    if (packageSize === "MEDIUM") return 5;
    return 12;
  }

  private resolvePackageVolume(packageSize: 'SMALL' | 'MEDIUM' | 'LARGE'): number {
    if (packageSize === "SMALL") return 1;
    if (packageSize === "MEDIUM") return 2;
    return 3;
  }

  private resolveRequiredVehicleType(
    packageSize: 'SMALL' | 'MEDIUM' | 'LARGE',
    packageWeight?: number
  ): VehicleType | undefined {
    const resolvedWeight = this.resolvePackageWeight(packageSize, packageWeight);
    if (packageSize === "LARGE" || resolvedWeight > 10) {
      return VehicleType.MOTORCYCLE;
    }
    return undefined;
  }

  private async getLiveTrackingData(packageData: any): Promise<{
    enabled: boolean;
    available: boolean;
    source?: "REALTIME" | "LAST_KNOWN";
    websocket_channel?: string;
    message?: string;
    rider_location?: {
      latitude: number;
      longitude: number;
      timestamp: number;
      status?: string;
    };
  }> {
    const activeStatuses = ["PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY"];

    if (!activeStatuses.includes(packageData.status)) {
      return {
        enabled: true,
        available: false,
        message: "Live tracking is available only for active deliveries.",
      };
    }

    if (!packageData.rider_id) {
      return {
        enabled: true,
        available: false,
        message: "Rider not assigned yet. Live GPS tracking will start after assignment.",
      };
    }

    const rider = await this.riderRepository.getRiderByUserId(packageData.rider_id);
    if (!rider) {
      return {
        enabled: true,
        available: false,
        message: "Live rider GPS tracking coming soon.",
      };
    }

    try {
      const state = await CourierPresenceService.getCourierState(rider.id);
      const hasRealtimeLocation =
        state.location.timestamp > 0 &&
        state.location.lat !== 0 &&
        state.location.lng !== 0;

      if (hasRealtimeLocation) {
        return {
          enabled: true,
          available: true,
          source: "REALTIME",
          websocket_channel: `tracking:package:${packageData.id}`,
          rider_location: {
            latitude: Number(state.location.lat),
            longitude: Number(state.location.lng),
            timestamp: Number(state.location.timestamp),
            status: state.status,
          },
        };
      }
    } catch (error) {
      console.error("Failed to read realtime rider location", error);
    }

    if (rider.current_latitude != null && rider.current_longitude != null) {
      return {
        enabled: true,
        available: true,
        source: "LAST_KNOWN",
        websocket_channel: `tracking:package:${packageData.id}`,
        rider_location: {
          latitude: Number(rider.current_latitude),
          longitude: Number(rider.current_longitude),
          timestamp: Date.now(),
          status: rider.status,
        },
      };
    }

    return {
      enabled: true,
      available: false,
      message: "Live rider GPS tracking coming soon.",
    };
  }

  private async generateTrackingNumber(): Promise<string> {
    // Generate TRK-XXXX format with random alphanumeric (uppercase letters and numbers)
    const nanoid = customAlphabet('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789', 4);
    let trackingNumber: string;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomCode = nanoid();
      trackingNumber = `TRK-${randomCode}`;
      
      // Check if tracking number already exists
      const existing = await this.packageRepository.findByTrackingNumber(trackingNumber);
      if (!existing) {
        return trackingNumber;
      }
      attempts++;
    }

    // Fallback: use timestamp-based code if all random attempts fail
    const fallbackCode = customAlphabet('ABCDEFGHIJKLMNPQRSTUVWXYZ123456789', 6)();
    return `TRK-${fallbackCode}`;
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
