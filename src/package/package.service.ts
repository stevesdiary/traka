import { PackageRepository } from "./package.repository.js";
import { UserRepository } from "../user/user.repository.js";
import { PricingService, PricingRequest } from "../pricing/pricing.service.js";
import { PackageVerificationService } from "../verification/package-verification.service.js";
import { ServiceAreaService } from "../service-area/service-area.service.js";
import { GeocodingService, type GeocodingResult } from "../utils/geocoding.service.js";
import { DispatchService } from "../matching/services/DispatchService.js";
import { VehicleType } from "../matching/config/vehicles.js";
import { CourierPresenceService } from "../matching/services/CourierPresenceService.js";
import { RiderRepository } from "../rider/rider.repository.js";
import {
  NotificationService,
  NotificationType,
} from "../notification/notification.service.js";
import { EmailNotificationService } from "../notification/email.service.js";
import { trackingStartedEmail, liveTrackingEmail } from "../notification/email-templates.js";
import { TrackingTokenService } from "../tracking/tracking-token.service.js";
import { SMSService } from "../notification/sms.service.js";
import { webhookService } from "../webhook/webhook.service.js";
import { ReferralService } from "../referral/referral.service.js";
import { PromotionService } from "../promotion/promotion.service.js";
import { customAlphabet } from 'nanoid';
import type { DeliveryRequest } from "../matching/models/CourierState.js";
import type { RiderModel } from "../rider/rider.model.js";
import { emitDeliveryAssigned } from "../websocket/websocket.service.js";
import logger from '../utils/logger.js';

export class PackageService {
  private packageRepository: PackageRepository;
  private userRepository: UserRepository;
  private pricingService: PricingService;
  private packageVerificationService: PackageVerificationService;
  private serviceAreaService: ServiceAreaService;
  private geocodingService: GeocodingService;
  private riderRepository: RiderRepository;
  private notificationService: NotificationService;
  private emailService: EmailNotificationService;
  private smsService: SMSService;
  private referralService: ReferralService;
  private promotionService: PromotionService;

  constructor() {
    this.packageRepository = new PackageRepository();
    this.userRepository = new UserRepository();
    this.pricingService = new PricingService();
    this.packageVerificationService = new PackageVerificationService();
    this.serviceAreaService = new ServiceAreaService();
    this.geocodingService = new GeocodingService();
    this.riderRepository = new RiderRepository();
    this.notificationService = new NotificationService();
    this.emailService = new EmailNotificationService();
    this.smsService = new SMSService();
    this.referralService = new ReferralService();
    this.promotionService = new PromotionService();
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
      payment_method?: 'DIGITAL' | 'CASH' | 'BANK_TRANSFER';
      payment_by?: 'SENDER' | 'RECIPIENT';
      promo_code?: string;
    },
    sender_id: string,
    tenant_id: string | null
  ): Promise<any> {
    // Geocode addresses to get coordinates and city/state
    let pickupGeo: GeocodingResult;
    let deliveryGeo: GeocodingResult;
    try {
      pickupGeo = await this.geocodingService.geocodeAddress(data.pickup_address);
      deliveryGeo = await this.geocodingService.geocodeAddress(data.delivery_address);
    } catch (error) {
      logger.error('Geocoding failed — refusing to create package without verified coverage', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error('LOCATION_VERIFICATION_FAILED: Could not verify pickup/delivery location. Please try again or use a more specific address.');
    }

    // Check service area coverage — fail closed, never skip when geocoding is unavailable
    const pickupCoverage = await this.serviceAreaService.checkCoverage({
      city: pickupGeo.city,
      state: pickupGeo.state,
      latitude: pickupGeo.latitude,
      longitude: pickupGeo.longitude
    });
    if (!pickupCoverage.covered) {
      throw new Error('PICKUP_OUT_OF_COVERAGE: Pickup location is outside our service area');
    }

    const deliveryCoverage = await this.serviceAreaService.checkCoverage({
      city: deliveryGeo.city,
      state: deliveryGeo.state,
      latitude: deliveryGeo.latitude,
      longitude: deliveryGeo.longitude
    });
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

    // Apply referral discount (20% off delivery fee for first N orders)
    const referralDiscount = await this.referralService.getActiveReferralDiscount(sender_id);
    let deliveryFee = pricing.total_amount - pricing.platform_fee;
    let totalAmount = pricing.total_amount;
    let discountPercent: number | undefined;
    let discountAmount: number | undefined;

    if (referralDiscount) {
      discountPercent = Number(referralDiscount.discount_percent ?? 0);
      discountAmount = Math.round(pricing.total_amount * discountPercent / 100);
      totalAmount = pricing.total_amount - discountAmount;
      deliveryFee = totalAmount - pricing.platform_fee;
    }

    // Apply promo code (seasonal promos) after referral discount
    let promoCode: string | undefined;
    let promoDiscountAmount: number | undefined;
    let promotionId: string | undefined;

    if (data.promo_code) {
      promoCode = data.promo_code.trim().toUpperCase();

      const promoInfo = await this.promotionService.validatePromotionForAmount(
        promoCode,
        sender_id,
        totalAmount
      );

      if (referralDiscount && !promoInfo.promotion.stackable) {
        throw new Error('This promotion cannot be combined with your referral discount');
      }

      const appliesTo = (promoInfo.promotion.applies_to || 'DELIVERY_FEE') as string;
      const promoBase = appliesTo === 'TOTAL' ? totalAmount : deliveryFee;
      const validated = await this.promotionService.validatePromotionForAmount(
        promoCode,
        sender_id,
        promoBase
      );

      promoDiscountAmount = validated.discount_amount;
      promotionId = validated.promotion.id;
      totalAmount = totalAmount - promoDiscountAmount;
      deliveryFee = totalAmount - pricing.platform_fee;
    }

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
      pickup_address: data.pickup_address,
      delivery_address: data.delivery_address,
      description: data.description,
      delivery_notes: data.delivery_notes,
      package_size: data.package_size,
      package_weight: data.package_weight,
      delivery_speed: data.delivery_speed,
      category: data.category,
      is_fragile: data.is_fragile || false,
      delivery_fee: deliveryFee,
      platform_fee: pricing.platform_fee,
      total_amount: totalAmount,
      estimated_distance_km: pricing.estimated_distance_km,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      promo_code: promoCode,
      promo_discount_amount: promoDiscountAmount,
      guest_tracking_token: guest_tracking_token || undefined,
      tenant_id,
      payment_method: data.payment_method || 'DIGITAL',
      payment_by: data.payment_by || 'SENDER',
      payment_status: (data.payment_method === 'CASH' || data.payment_method === 'BANK_TRANSFER') ? 'PENDING' : 'PAID',
      paid_at: (data.payment_method === 'DIGITAL' || !data.payment_method) ? new Date() : undefined,
    };

    const newPackage = await this.packageRepository.createPackage(packageData);

    // Consume one referral discount order (after successful creation)
    if (referralDiscount) {
      await this.referralService.recordDiscountedOrder(referralDiscount);
    }

    // Record promo usage (after successful creation)
    if (promotionId && promoCode) {
      await this.promotionService.recordUsage({
        promotion_id: promotionId,
        user_id: sender_id,
        package_id: newPackage.id,
        discount_amount: promoDiscountAmount
      });
    }

    // Get sender information
    const sender = await this.userRepository.findById(sender_id);
    const sender_name = sender ? `${sender.first_name} ${sender.surname}` : 'Sender';

    // Generate verification codes and QR code
    const verification = await this.packageVerificationService.generatePackageVerification({
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

    // Send tracking notification to recipient
    await this.sendTrackingNotification(newPackage);
    const dispatch = await this.attemptAutoDispatch(
      newPackage,
      data,
      pickupGeo,
      deliveryGeo
    );

    return {
      id: newPackage.id,
      tracking_number: newPackage.tracking_number,
      status: newPackage.status,
      pickup_address: (newPackage as any).pickup_address,
      delivery_address: newPackage.delivery_address,
      recipient_name: newPackage.recipient_name,
      recipient_phone: newPackage.recipient_phone,
      recipient_email: newPackage.recipient_email,
      description: newPackage.description,
      package_size: newPackage.package_size,
      delivery_speed: newPackage.delivery_speed,
      category: newPackage.category,
      total_amount: newPackage.total_amount,
      estimated_cost: newPackage.total_amount,
      pickup_pin: verification.pickup_pin,
      delivery_pin: verification.delivery_pin,
      qr_code_data: verification.qr_code_data,
      pricing_breakdown: {
        base_fee: pricing.base_fee,
        distance_fee: pricing.distance_fee,
        speed_fee: pricing.speed_fee,
        weight_multiplier: pricing.weight_multiplier,
        platform_fee: pricing.platform_fee,
        discount_percent: discountPercent ?? 0,
        discount_amount: discountAmount ?? 0,
        promo_code: promoCode ?? null,
        promo_discount_amount: promoDiscountAmount ?? 0,
        total_amount: totalAmount
      },
      tracking_url: this.generateTrackingUrl(
        tracking_number,
        guest_tracking_token || undefined
      ),
      dispatch,
    };
  }

  async updateRecipientDetails(
    tracking_number: string,
    tenant_id: string,
    updates: {
      recipient_name?: string;
      recipient_phone?: string;
      recipient_email?: string;
      delivery_address?: string;
    }
  ): Promise<{ tracking_number: string; updated_fields: string[]; pricing_breakdown?: any }> {
    const pkg = await this.packageRepository.findByTrackingNumber(tracking_number);
    if (!pkg || pkg.tenant_id !== tenant_id) {
      throw new Error('Order not found');
    }
    if (pkg.status !== 'PENDING') {
      throw new Error(`Cannot update order in ${pkg.status} status`);
    }

    const updateData: Record<string, any> = {};
    const updated_fields: string[] = [];

    if (updates.recipient_name) {
      updateData.recipient_name = updates.recipient_name;
      updated_fields.push('recipient_name');
    }
    if (updates.recipient_phone) {
      updateData.recipient_phone = updates.recipient_phone;
      updated_fields.push('recipient_phone');
    }
    if (updates.recipient_email !== undefined) {
      updateData.recipient_email = updates.recipient_email;
      updated_fields.push('recipient_email');
    }

    let pricing_breakdown: any | undefined;

    if (updates.delivery_address) {
      updateData.delivery_address = updates.delivery_address;
      updated_fields.push('delivery_address');

      const pricing = await this.pricingService.calculateDeliveryPrice({
        pickup_address: (pkg as any).pickup_address as string,
        delivery_address: updates.delivery_address,
        package_size: pkg.package_size as 'SMALL' | 'MEDIUM' | 'LARGE',
        package_weight: pkg.package_weight ? Number(pkg.package_weight) : undefined,
        delivery_speed: pkg.delivery_speed as 'STANDARD' | 'EXPRESS' | 'SAME_DAY',
        tenant_id,
      });

      updateData.delivery_fee = pricing.total_amount - pricing.platform_fee;
      updateData.platform_fee = pricing.platform_fee;
      updateData.total_amount = pricing.total_amount;
      updateData.estimated_distance_km = pricing.estimated_distance_km;

      pricing_breakdown = {
        base_fee: pricing.base_fee,
        distance_fee: pricing.distance_fee,
        speed_fee: pricing.speed_fee,
        weight_multiplier: pricing.weight_multiplier,
        platform_fee: pricing.platform_fee,
        total_amount: pricing.total_amount,
      };
    }

    await this.packageRepository.updatePackage(pkg.id, updateData);

    return {
      tracking_number,
      updated_fields,
      ...(pricing_breakdown ? { pricing_breakdown } : {}),
    };
  }

  async unassignRiderSelf(packageId: string, userId: string): Promise<void> {
    const pkg = await this.packageRepository.findById(packageId);
    if (!pkg) throw new Error('Package not found');
    if (pkg.rider_id !== userId) throw new Error('You are not assigned to this package');
    if (pkg.status === 'IN_TRANSIT') throw new Error('Cannot cancel after pickup is confirmed');

    await this.packageRepository.assignRider(packageId, null as any);
    await Promise.allSettled([
      this.riderRepository.updateRiderProfile(userId, { status: 'AVAILABLE', is_available: true }),
    ]);
  }

  async assignRiderSelf(packageId: string, userId: string): Promise<void> {
    const pkg = await this.packageRepository.findById(packageId);
    if (!pkg) throw new Error('Package not found');
    if (pkg.rider_id) throw new Error('Package already assigned to a rider');
    if (pkg.status !== 'PENDING') throw new Error('Package is no longer available');

    await this.packageRepository.assignRider(packageId, userId);

    await Promise.allSettled([
      this.riderRepository.updateRiderProfile(userId, { status: 'BUSY', is_available: false }),
      this.notificationService.sendToCustomer(
        pkg.sender_id,
        NotificationType.RIDER_ASSIGNED,
        { package_id: packageId, tracking_number: pkg.tracking_number }
      ),
    ]);
  }

  async initializeTransferPayment(packageId: string, userId: string): Promise<{
    account_number: string;
    account_name: string;
    bank_name: string;
    amount: number;
    reference: string;
    expires_at: string;
  }> {
    const pkg = await this.packageRepository.findById(packageId);
    if (!pkg) throw new Error('Package not found');
    if (pkg.sender_id !== userId) throw new Error('Unauthorized');
    if (pkg.payment_status === 'PAID') throw new Error('Package already paid');

    const amount = Number(pkg.total_amount);
    if (!amount || amount <= 0) throw new Error('Invalid package amount');

    const { redis } = await import('../config/database.js');
    const { PaymentGatewayService } = await import('../wallet/payment-gateway.service.js');
    const { UserRepository } = await import('../user/user.repository.js');

    const userRepo = new UserRepository();
    const user = await userRepo.findById(userId);
    if (!user) throw new Error('User not found');

    const crypto = await import('crypto');
    const reference = `PKG-TRF-${packageId.substring(0, 8).toUpperCase()}-${crypto.default.randomBytes(3).toString('hex').toUpperCase()}`;

    // Store intent in Redis — webhook handler will look this up to mark package PAID
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await redis.setEx(
      `payment:transfer:${reference}`,
      1800,
      JSON.stringify({ packageId, userId, amount, reference, createdAt: Date.now() })
    );

    const accountNumber = process.env.TRAKA_BANK_ACCOUNT_NUMBER;
    const accountName = process.env.TRAKA_BANK_ACCOUNT_NAME || 'TRAKA Technologies Ltd';
    const bankName = process.env.TRAKA_BANK_NAME;

    if (!accountNumber || !bankName) {
      logger.error('Bank account details not configured — refusing transfer payment', {
        hasAccountNumber: Boolean(accountNumber),
        hasBankName: Boolean(bankName)
      });
      throw new Error('TRANSFER_PAYMENT_UNAVAILABLE: Bank account not configured. Please use digital payment.');
    }

    const trakaAccount = {
      account_number: accountNumber,
      account_name: accountName,
      bank_name: bankName,
    };

    return {
      account_number: trakaAccount.account_number,
      account_name: trakaAccount.account_name,
      bank_name: trakaAccount.bank_name,
      amount,
      reference,
      expires_at: expiresAt.toISOString(),
    };
  }

  async scheduleBackgroundSearch(packageId: string, userId: string): Promise<void> {
    const pkg = await this.packageRepository.findById(packageId);
    if (!pkg) throw new Error('Package not found');
    if (pkg.sender_id !== userId) throw new Error('Unauthorized');
    if (pkg.status !== 'PENDING') throw new Error('Package is no longer pending');
    if (pkg.rider_id) throw new Error('Rider already assigned');

    // Store in Redis — a background worker can periodically retry dispatch
    const { redis } = await import('../config/database.js');
    await redis.setEx(
      `dispatch:background:${packageId}`,
      86400, // 24 hours
      JSON.stringify({ packageId, scheduledAt: Date.now(), userId })
    );

    // Notify the sender via push notification when a rider is eventually found
    await this.notificationService.sendToCustomer(
      userId,
      NotificationType.RIDER_ASSIGNED,
      { package_id: packageId, tracking_number: pkg.tracking_number, scheduled: true }
    ).catch(() => {});
  }

  async getPackageByUuid(
    id: string,
    requester: { id: string; role: string }
  ): Promise<any> {
    const packageData = await this.packageRepository.findById(id);
    if (!packageData) throw new Error('Package not found');

    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(requester.role);
    const isOwner = packageData.sender_id === requester.id || packageData.recipient_id === requester.id;
    const isAssignedRider = packageData.rider_id === requester.id;
    if (!isStaff && !isOwner && !isAssignedRider) throw new Error('Unauthorized');

    const liveTracking = await this.getLiveTrackingData(packageData);

    return {
      id: packageData.id,
      tracking_number: packageData.tracking_number,
      status: packageData.status,
      pickup_address: packageData.pickup_address,
      delivery_address: packageData.delivery_address,
      recipient_name: packageData.recipient_name,
      recipient_phone: packageData.recipient_phone,
      recipient_email: packageData.recipient_email,
      description: packageData.description,
      delivery_notes: packageData.delivery_notes,
      package_size: packageData.package_size,
      delivery_speed: packageData.delivery_speed,
      category: packageData.category,
      is_fragile: packageData.is_fragile,
      total_amount: packageData.total_amount,
      estimated_cost: packageData.total_amount,
      payment_method: packageData.payment_method,
      rider_id: packageData.rider_id,
      rider: packageData.rider_id ? await this.getRiderInfo(packageData.rider_id) : null,
      created_at: packageData.createdAt,
      delivered_at: packageData.delivered_at,
      live_tracking: liveTracking,
      // Expose pickup_pin to sender and assigned rider
      pickup_pin: (isOwner || isAssignedRider) ? packageData.pickup_pin : undefined,
    };
  }

  private async getRiderInfo(riderId: string): Promise<any> {
    const rider = await this.riderRepository.getRiderByUserId(riderId);
    if (!rider) return null;
    return {
      id: rider.id,
      name: rider.user ? `${rider.user.first_name} ${rider.user.surname}`.trim() : 'Rider',
      phone: rider.user?.phone,
      rating: (rider as any).avg_rating,
      vehicle_type: rider.vehicle_type,
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
    const activeStatuses = ["PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
    const isActive = activeStatuses.includes(packageData.status) && packageData.rider_id;

    const tracking_token = isActive
      ? TrackingTokenService.generate({ packageId: packageData.id, trackingNumber: packageData.tracking_number })
      : null;
    const liveTrackingUrl = isActive
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/live-track?pkg=${packageData.id}&token=${tracking_token}`
      : null;

    let eta_minutes: number | null = null;
    if (activeStatuses.includes(packageData.status) && packageData.estimated_arrival_at) {
      const remainingMs = new Date(packageData.estimated_arrival_at).getTime() - Date.now();
      eta_minutes = remainingMs > 0 ? Math.ceil(remainingMs / 60000) : 0;
    }

    return {
      id: packageData.id,
      tracking_number: packageData.tracking_number,
      status: packageData.status,
      recipient_name: packageData.recipient_name,
      recipient_email: packageData.recipient_email,
      recipient_phone: packageData.recipient_phone,
      pickup_address: packageData.pickup_address,
      delivery_address: packageData.delivery_address,
      description: packageData.description,
      delivery_notes: packageData.delivery_notes,
      package_size: packageData.package_size,
      package_weight: packageData.package_weight,
      delivery_speed: packageData.delivery_speed,
      schedule_type: packageData.schedule_type,
      scheduled_for: packageData.scheduled_for,
      rider_id: packageData.rider_id,
      rider_has_package: packageData.rider_has_package,
      eta_minutes,
      created_at: packageData.createdAt,
      updated_at: packageData.updatedAt,
      delivered_at: packageData.delivered_at,
      cancellation_reason: packageData.cancellation_reason,
      cancellation_note: packageData.cancellation_note,
      cancelled_at: packageData.cancelled_at,
      cancelled_by: packageData.cancelled_by,
      is_guest_delivery: !packageData.recipient_id,
      tracking_token,
      live_tracking: liveTracking,
      live_tracking_url: liveTrackingUrl,
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
    await this.packageVerificationService.confirmPickup(package_id, pin);
    await this.updatePackageStatus(package_id, 'IN_TRANSIT', tenant_id);

    const packageData = await this.packageRepository.findById(package_id);

    // Set rider status to BUSY
    if (packageData?.rider_id) {
      await Promise.allSettled([
        this.riderRepository.updateRiderProfile(packageData.rider_id, {
          status: 'BUSY',
          is_available: false,
        }),
        CourierPresenceService.updateCourierStatus(packageData.rider_id, 'BUSY'),
      ]);
    }

    // Send tracking email to recipient
    if (packageData?.recipient_email) {
      const sender = await this.userRepository.findById(packageData.sender_id);
      const senderName = sender ? `${sender.first_name} ${sender.surname}`.trim() : 'Someone';
      const trackingUrl = this.generateTrackingUrl(packageData.tracking_number, packageData.guest_tracking_token);

      this.emailService.sendEmail(
        { email: packageData.recipient_email, name: packageData.recipient_name },
        'Your package is on the way 🚀',
        trackingStartedEmail(
          packageData.recipient_name,
          packageData.tracking_number,
          senderName,
          packageData.delivery_address,
          trackingUrl
        )
      ).catch(err => logger.error('Failed to send tracking email', { error: err?.message }));
    }

    // Send delivery code to recipient now that the rider has the package
    await this.packageVerificationService.triggerDeliveryCodeEmail(package_id).catch(err =>
      logger.error('Failed to send delivery code email', { error: err?.message, package_id })
    );

    return { message: 'Package pickup confirmed', status: 'IN_TRANSIT' };
  }

  async confirmDelivery(package_id: string, pin: string, tenant_id: string | null): Promise<any> {
    await this.packageVerificationService.confirmDelivery(package_id, pin);
    await this.updatePackageStatus(package_id, 'DELIVERED', tenant_id);

    const packageData = await this.packageRepository.findById(package_id);

    // Set rider back to AVAILABLE so they can pick up another job
    if (packageData?.rider_id) {
      await Promise.allSettled([
        this.riderRepository.updateRiderProfile(packageData.rider_id, {
          status: 'AVAILABLE',
          is_available: true,
        }),
        CourierPresenceService.updateCourierStatus(packageData.rider_id, 'AVAILABLE'),
      ]);
    }

    return { message: 'Package delivery confirmed', status: 'DELIVERED' };
  }

  async getQRCodeData(qr_code_data: string): Promise<any> {
    return this.packageVerificationService.decodeQRCode(qr_code_data);
  }

  async getPackagesForUser(userId: string): Promise<any[]> {
    const packages = await this.packageRepository.findByUserId(userId);
    return packages.map((pkg: any) => {
      const p = typeof pkg.toJSON === 'function' ? pkg.toJSON() : pkg;
      return {
        id: p.id,
        tracking_number: p.tracking_number,
        status: p.status,
        pickup_address: p.pickup_address ?? '',
        delivery_address: p.delivery_address ?? '',
        recipient_name: p.recipient_name ?? '',
        recipient_phone: p.recipient_phone ?? '',
        description: p.description ?? '',
        package_size: p.package_size ?? '',
        delivery_speed: p.delivery_speed ?? '',
        category: p.category ?? '',
        total_amount: p.total_amount ?? 0,
        estimated_cost: p.total_amount ?? 0,
        rider_id: p.rider_id ?? null,
        created_at: p.createdAt,
        is_sender: p.sender_id === userId,
      };
    });
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
      packageId: packageData.id,
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

      const etaSeconds = dispatchResult.eta ? Math.round(dispatchResult.eta) : undefined;
      await this.packageRepository.assignRider(packageData.id, assignedRider.userId, etaSeconds);

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

      // Race-free hand-off: tell the rider's live socket that this delivery is now theirs
      emitDeliveryAssigned(dispatchResult.assignedCourier.id, {
        type: "delivery-assigned",
        packageId: packageData.id,
        trackingNumber: packageData.tracking_number,
        pickupAddress: data.pickup_address,
        dropoffAddress: data.delivery_address,
        etaSeconds: etaSeconds ?? 0,
      });

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

      // Send live tracking link to recipient
      await this.sendLiveTrackingLink(packageData, assignedRider.fullName).catch(() => {});

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
      logger.error('Auto-dispatch failed', { error });
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
      ? `${rider.user.first_name} ${rider.user.surname}`.trim()
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
      logger.error('Failed to read realtime rider location', { error });
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
    const letters = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4);
    const digits = customAlphabet('0123456789', 4);

    for (let i = 0; i < 10; i++) {
      const trackingNumber = `${letters()}-${digits()}`;
      const existing = await this.packageRepository.findByTrackingNumber(trackingNumber);
      if (!existing) return trackingNumber;
    }

    return `${letters()}-${digits()}`;
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

  private async sendTrackingNotification(packageData: any): Promise<void> {
    // Tracking info is sent via email when the rider picks up (IN_TRANSIT).
    // Nothing to send at booking time.
  }

  private generateLiveTrackingUrl(packageId: string, trackingNumber: string): string {
    const webUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const token = TrackingTokenService.generate({ packageId, trackingNumber });
    return `${webUrl}/live-track?pkg=${packageId}&token=${token}`;
  }

  private async sendLiveTrackingLink(packageData: any, riderName: string): Promise<void> {
    const liveUrl = this.generateLiveTrackingUrl(packageData.id, packageData.tracking_number);
    const sender = await this.userRepository.findById(packageData.sender_id);
    const senderName = sender ? `${sender.first_name} ${sender.surname}`.trim() : 'Someone';

    await Promise.allSettled([
      packageData.recipient_email
        ? this.emailService.sendEmail(
            { email: packageData.recipient_email, name: packageData.recipient_name },
            'Your rider is on the way 👋',
            liveTrackingEmail(
              packageData.recipient_name,
              packageData.tracking_number,
              senderName,
              packageData.delivery_address,
              liveUrl
            )
          )
        : Promise.resolve(),
      packageData.recipient_phone
        ? this.smsService.sendSMS(
            packageData.recipient_phone,
            `TRAKA: ${riderName} is heading to you with a package from ${senderName}. Track live: ${liveUrl}`
          )
        : Promise.resolve(),
    ]);
  }
}
