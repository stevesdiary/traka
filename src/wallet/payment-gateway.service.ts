import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import config from '../config/environment.js';
import { redis } from '../config/database.js';
import logger from '../utils/logger.js';
import { UserRepository } from '../user/user.repository.js';
import { WalletService } from './wallet.service.js';
import { BusinessWalletService } from './business-wallet.service.js';
import {
  BankTransferDetails,
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProvider,
  VerifiedPayment,
  WalletFundingIntent,
  WebhookProcessResult,
  WalletType
} from './payment-gateway.types.js';

interface PaymentGatewayClient {
  initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifiedPayment>;
  verifyWebhookSignature(rawBody: Buffer | undefined, headers: Record<string, any>): boolean;
  parseWebhookPayload(payload: any): VerifiedPayment | null;
}

const INTENT_PREFIX = 'payment:intent:';
const INTENT_TTL_SECONDS = 24 * 60 * 60;

const SUCCESS_STATES = new Set(['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'PAID', 'OVERPAID']);
const PENDING_STATES = new Set(['PENDING', 'PROCESSING', 'IN_PROGRESS', 'INITIATED', 'PARTIALLY_PAID']);

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizePaymentStatus(status: string): 'SUCCESS' | 'PENDING' | 'FAILED' {
  const normalized = status.toUpperCase();
  if (SUCCESS_STATES.has(normalized)) return 'SUCCESS';
  if (PENDING_STATES.has(normalized)) return 'PENDING';
  return 'FAILED';
}

function parseMetadata(input: any): Record<string, any> | undefined {
  if (!input) return undefined;
  if (typeof input === 'object') return input as Record<string, any>;

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function numberOrZero(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}


class PaystackGatewayClient implements PaymentGatewayClient {
  private readonly secretKey = config.payment.paystack.secretKey;
  private readonly baseUrl = config.payment.paystack.baseUrl;
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${this.secretKey}`
      }
    });
  }

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const response = await this.http.post('/transaction/initialize', {
      email: input.customerEmail,
      amount: Math.round(input.amount * 100),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata || {}
    });

    if (!response.data?.status) {
      throw new Error(`Paystack init failed: ${response.data?.message || 'Unknown error'}`);
    }

    return {
      provider: PaymentProvider.PAYSTACK,
      reference: input.reference,
      checkoutUrl: response.data?.data?.authorization_url,
      accessCode: response.data?.data?.access_code,
      raw: response.data
    };
  }

  async verifyPayment(reference: string): Promise<VerifiedPayment> {
    const response = await this.http.get(`/transaction/verify/${reference}`);
    if (!response.data?.status) {
      throw new Error(`Paystack verify failed: ${response.data?.message || 'Unknown error'}`);
    }

    const payload = response.data?.data || {};
    const status = normalizePaymentStatus(String(payload.status || 'FAILED'));

    return {
      provider: PaymentProvider.PAYSTACK,
      reference: String(payload.reference || reference),
      status,
      amount: numberOrZero(payload.amount) / 100,
      currency: payload.currency,
      customerEmail: payload.customer?.email,
      metadata: parseMetadata(payload.metadata),
      paidAt: payload.paid_at ? new Date(payload.paid_at) : undefined,
      raw: response.data
    };
  }

  verifyWebhookSignature(rawBody: Buffer | undefined, headers: Record<string, any>): boolean {
    const signatureHeader = headers['x-paystack-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!rawBody || !signature || !this.secretKey) return false;

    const computedHash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    return safeCompare(computedHash, String(signature));
  }

  parseWebhookPayload(payload: any): VerifiedPayment | null {
    if (!payload || payload.event !== 'charge.success') {
      return null;
    }

    const eventData = payload.data || {};
    const reference = String(eventData.reference || '');
    if (!reference) return null;

    return {
      provider: PaymentProvider.PAYSTACK,
      reference,
      status: normalizePaymentStatus(String(eventData.status || 'SUCCESS')),
      amount: numberOrZero(eventData.amount) / 100,
      currency: eventData.currency,
      customerEmail: eventData.customer?.email,
      metadata: parseMetadata(eventData.metadata),
      paidAt: eventData.paid_at ? new Date(eventData.paid_at) : undefined,
      raw: payload
    };
  }
}

class FlutterwaveGatewayClient implements PaymentGatewayClient {
  private readonly secretKey = config.payment.flutterwave.secretKey;
  private readonly webhookHash = config.payment.flutterwave.webhookHash;
  private readonly baseUrl = config.payment.flutterwave.baseUrl;
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${this.secretKey}`
      }
    });
  }

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const response = await this.http.post('/payments', {
      tx_ref: input.reference,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.callbackUrl,
      customer: {
        email: input.customerEmail,
        name: input.customerName,
        phonenumber: input.customerPhone
      },
      customizations: {
        title: 'TRAKA Wallet Funding',
        description: input.description
      },
      meta: input.metadata || {}
    });

    if (String(response.data?.status || '').toLowerCase() !== 'success') {
      throw new Error(`Flutterwave init failed: ${response.data?.message || 'Unknown error'}`);
    }

    return {
      provider: PaymentProvider.FLUTTERWAVE,
      reference: input.reference,
      checkoutUrl: response.data?.data?.link,
      raw: response.data
    };
  }

  async verifyPayment(reference: string): Promise<VerifiedPayment> {
    const response = await this.http.get(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`);

    if (String(response.data?.status || '').toLowerCase() !== 'success') {
      throw new Error(`Flutterwave verify failed: ${response.data?.message || 'Unknown error'}`);
    }

    const payload = response.data?.data || {};
    const status = normalizePaymentStatus(String(payload.status || 'FAILED'));

    return {
      provider: PaymentProvider.FLUTTERWAVE,
      reference: String(payload.tx_ref || reference),
      status,
      amount: numberOrZero(payload.amount ?? payload.charged_amount),
      currency: payload.currency,
      customerEmail: payload.customer?.email,
      metadata: parseMetadata(payload.meta),
      paidAt: payload.created_at ? new Date(payload.created_at) : undefined,
      raw: response.data
    };
  }

  verifyWebhookSignature(rawBody: Buffer | undefined, headers: Record<string, any>): boolean {
    const signatureHeader = headers['verif-hash'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    if (!signature || !this.webhookHash) {
      return false;
    }

    return safeCompare(String(signature), this.webhookHash);
  }

  parseWebhookPayload(payload: any): VerifiedPayment | null {
    if (!payload || payload.event !== 'charge.completed') {
      return null;
    }

    const eventData = payload.data || {};
    const reference = String(eventData.tx_ref || '');
    if (!reference) return null;

    return {
      provider: PaymentProvider.FLUTTERWAVE,
      reference,
      status: normalizePaymentStatus(String(eventData.status || 'FAILED')),
      amount: numberOrZero(eventData.amount ?? eventData.charged_amount),
      currency: eventData.currency,
      customerEmail: eventData.customer?.email,
      metadata: parseMetadata(eventData.meta),
      paidAt: eventData.created_at ? new Date(eventData.created_at) : undefined,
      raw: payload
    };
  }
}

class KudaGatewayClient implements PaymentGatewayClient {
  private readonly apiKey = config.payment.kuda.apiKey;
  private readonly email = config.payment.kuda.email;
  private readonly webhookSecret = config.payment.kuda.webhookSecret;
  private readonly baseUrl = config.payment.kuda.baseUrl;
  private readonly virtualAccountName = config.payment.kuda.virtualAccountName;
  private accessToken = '';
  private accessTokenExpiry = 0;
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000
    });
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiry) {
      return this.accessToken;
    }

    const response = await this.http.post('/Account/GetToken', {
      email: this.email,
      apiKey: this.apiKey
    });

    if (!response.data?.status) {
      throw new Error(`Kuda auth failed: ${response.data?.message || 'Unknown error'}`);
    }

    const token = response.data?.data;
    if (!token) throw new Error('Kuda auth failed: Missing access token');

    this.accessToken = token;
    // Kuda tokens are typically valid for 24 hours; refresh 5 min early
    this.accessTokenExpiry = now + (24 * 60 - 5) * 60 * 1000;
    return token;
  }

  private async post<T>(endpoint: string, body: Record<string, any>): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.http.post(endpoint, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data as T;
  }

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const response = await this.post<any>('/Collection/InitiateCollection', {
      amount: input.amount,
      narration: input.description,
      clientAccountNumber: input.reference,
      beneficiaryName: input.customerName,
      beneficiaryEmail: input.customerEmail,
      beneficiaryPhone: input.customerPhone || '',
      trackingReference: input.reference,
      currency: input.currency,
      metadata: input.metadata || {}
    });

    if (!response?.status) {
      throw new Error(`Kuda payment init failed: ${response?.message || 'Unknown error'}`);
    }

    const data = response?.data || {};
    const bankDetails: BankTransferDetails = {
      accountNumber: data.virtualAccountNumber || data.accountNumber || '',
      accountName: data.accountName || this.virtualAccountName,
      bankName: data.bankName || 'Kuda Microfinance Bank',
      bankCode: data.bankCode || '090267'
    };

    return {
      provider: PaymentProvider.KUDA,
      reference: input.reference,
      bankDetails,
      raw: response
    };
  }

  async verifyPayment(reference: string): Promise<VerifiedPayment> {
    const response = await this.post<any>('/Transaction/RetrieveTransaction', {
      requestReference: reference
    });

    if (!response?.status) {
      throw new Error(`Kuda verify failed: ${response?.message || 'Unknown error'}`);
    }

    const data = response?.data || {};
    const status = normalizePaymentStatus(
      String(data.transactionStatus || data.status || 'FAILED')
    );

    return {
      provider: PaymentProvider.KUDA,
      reference: String(data.requestReference || data.transactionReference || reference),
      status,
      amount: numberOrZero(data.amount ?? data.transactionAmount),
      currency: data.currency || 'NGN',
      customerEmail: data.beneficiaryEmail || data.customerEmail,
      metadata: parseMetadata(data.metadata),
      paidAt: data.transactionDate ? new Date(data.transactionDate) : undefined,
      raw: response
    };
  }

  verifyWebhookSignature(rawBody: Buffer | undefined, headers: Record<string, any>): boolean {
    const signatureHeader = headers['x-kuda-signature'] ?? headers['kuda-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!rawBody || !signature || !this.webhookSecret) return false;

    const computed = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return safeCompare(computed, String(signature));
  }

  parseWebhookPayload(payload: any): VerifiedPayment | null {
    if (!payload || payload.notificationType !== 'COLLECTION') {
      return null;
    }

    const data = payload.data || payload.transactionData || {};
    const reference = String(data.trackingReference || data.requestReference || '');
    if (!reference) return null;

    const status = normalizePaymentStatus(
      String(data.transactionStatus || data.status || 'SUCCESS')
    );

    return {
      provider: PaymentProvider.KUDA,
      reference,
      status,
      amount: numberOrZero(data.amount ?? data.transactionAmount),
      currency: data.currency || 'NGN',
      customerEmail: data.beneficiaryEmail || data.customerEmail,
      metadata: parseMetadata(data.metadata),
      paidAt: data.transactionDate ? new Date(data.transactionDate) : undefined,
      raw: payload
    };
  }
}

export class PaymentGatewayService {
  private walletService = new WalletService();
  private businessWalletService = new BusinessWalletService();
  private userRepository = new UserRepository();
  private gateways: Record<PaymentProvider, PaymentGatewayClient>;

  constructor() {
    this.gateways = {
      [PaymentProvider.KUDA]: new KudaGatewayClient(),
      [PaymentProvider.PAYSTACK]: new PaystackGatewayClient(),
      [PaymentProvider.FLUTTERWAVE]: new FlutterwaveGatewayClient()
    };
  }

  private resolveProvider(provider?: string): PaymentProvider {
    const selected = (provider || config.payment.defaultProvider).toUpperCase();

    if (selected in PaymentProvider) {
      return selected as PaymentProvider;
    }

    throw new Error(`Unsupported payment provider: ${provider}`);
  }

  private getGateway(provider: PaymentProvider): PaymentGatewayClient {
    return this.gateways[provider];
  }

  private generateReference(provider: PaymentProvider): string {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `WLT-${provider}-${Date.now()}-${random}`;
  }

  private buildWalletTransactionReference(provider: PaymentProvider, reference: string): string {
    return `${provider}:${reference}`;
  }

  private async saveFundingIntent(reference: string, intent: WalletFundingIntent): Promise<void> {
    await redis.setEx(
      `${INTENT_PREFIX}${reference}`,
      INTENT_TTL_SECONDS,
      JSON.stringify(intent)
    );
  }

  private async getFundingIntent(reference: string): Promise<WalletFundingIntent | null> {
    const raw = await redis.get(`${INTENT_PREFIX}${reference}`);
    return raw ? JSON.parse(raw) as WalletFundingIntent : null;
  }

  private async clearFundingIntent(reference: string): Promise<void> {
    await redis.del(`${INTENT_PREFIX}${reference}`);
  }

  private async resolveWalletOwner(
    payment: VerifiedPayment,
    intent: WalletFundingIntent | null
  ): Promise<string | null> {
    if (intent?.userId) return intent.userId;
    if (payment.metadata?.userId) return String(payment.metadata.userId);
    return null;
  }

  private async processSuccessfulPayment(
    payment: VerifiedPayment,
    expectedUserId?: string
  ): Promise<WebhookProcessResult> {
    const intent = await this.getFundingIntent(payment.reference);
    const walletOwnerId = await this.resolveWalletOwner(payment, intent);

    if (!walletOwnerId) {
      logger.error('No payment intent found for reference — payment cannot be credited', {
        reference: payment.reference,
        provider: payment.provider,
        amount: payment.amount
      });
      return {
        processed: false,
        code: 'MISSING_INTENT',
        message: `No payment intent found for reference ${payment.reference}`
      };
    }

    if (expectedUserId && walletOwnerId !== expectedUserId) {
      throw new Error('Unauthorized payment reference');
    }

    // Reject under-payments: do not credit and do not clear the intent so the
    // provider can retry or ops can investigate.
    if (intent && payment.amount < intent.amount) {
      logger.error('Payment amount below initialized amount — not crediting wallet', {
        reference: payment.reference,
        expected: intent.amount,
        paid: payment.amount,
        provider: payment.provider
      });
      return {
        processed: false,
        code: 'PENDING',
        message: `Payment amount ₦${payment.amount} is below the required ₦${intent.amount}`
      };
    }

    const reference = this.buildWalletTransactionReference(payment.provider, payment.reference);
    const walletType: WalletType = intent?.walletType ?? 'PERSONAL';

    if (walletType === 'BUSINESS' && intent?.tenantId) {
      await this.businessWalletService.rechargeWallet(intent.tenantId, payment.amount, reference);
    } else {
      await this.walletService.processWalletDeposit(
        walletOwnerId,
        payment.amount,
        reference,
        payment.provider
      );
    }

    await this.clearFundingIntent(payment.reference);

    return {
      processed: true,
      code: 'OK',
      message: 'Wallet funded successfully'
    };
  }

  async initializeWalletFunding(data: {
    userId: string;
    amount: number;
    provider?: string;
    callbackUrl?: string;
    currency?: string;
  }): Promise<InitializePaymentResult> {
    const user = await this.userRepository.findById(data.userId);
    if (!user) throw new Error('User not found');
    if (!user.email) throw new Error('User email is required for payment');
    if (data.amount <= 0) throw new Error('Amount must be greater than zero');

    const provider = this.resolveProvider(data.provider);
    const gateway = this.getGateway(provider);
    const reference = this.generateReference(provider);
    const callbackUrl =
      data.callbackUrl ||
      process.env.PAYMENT_CALLBACK_URL ||
      `${config.server.apiBaseUrl}/api/wallet/fund/verify`;
    const currency = data.currency || 'NGN';

    await this.saveFundingIntent(reference, {
      userId: data.userId,
      provider,
      amount: data.amount,
      currency,
      createdAt: Date.now()
    });

    return gateway.initializePayment({
      amount: data.amount,
      currency,
      reference,
      customerEmail: user.email,
      customerName: `${user.first_name} ${user.surname}`.trim(),
      customerPhone: user.phone || undefined,
      callbackUrl,
      description: `TRAKA wallet funding for ${user.email}`,
      metadata: {
        userId: data.userId,
        purpose: 'WALLET_TOPUP'
      }
    });
  }

  async verifyWalletFunding(data: {
    reference: string;
    provider?: string;
    expectedUserId?: string;
  }): Promise<{
    reference: string;
    provider: PaymentProvider;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    amount: number;
    processed: boolean;
    message: string;
  }> {
    const intent = await this.getFundingIntent(data.reference);
    const provider = this.resolveProvider(data.provider || intent?.provider);
    const gateway = this.getGateway(provider);
    const payment = await gateway.verifyPayment(data.reference);

    if (payment.status !== 'SUCCESS') {
      return {
        reference: payment.reference,
        provider,
        status: payment.status,
        amount: payment.amount,
        processed: false,
        message: 'Payment is not successful yet'
      };
    }

    const result = await this.processSuccessfulPayment(payment, data.expectedUserId);
    return {
      reference: payment.reference,
      provider,
      status: payment.status,
      amount: payment.amount,
      processed: result.processed,
      message: result.message
    };
  }

  async handleWebhook(data: {
    provider: string;
    payload: any;
    rawBody?: Buffer;
    headers: Record<string, any>;
  }): Promise<WebhookProcessResult> {
    const provider = this.resolveProvider(data.provider);
    const gateway = this.getGateway(provider);

    const valid = gateway.verifyWebhookSignature(data.rawBody, data.headers);
    if (!valid) {
      return { processed: false, code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' };
    }

    const payment = gateway.parseWebhookPayload(data.payload);
    if (!payment) {
      return { processed: false, code: 'IGNORED', message: 'Webhook event ignored' };
    }

    if (payment.status !== 'SUCCESS') {
      return { processed: false, code: 'PENDING', message: `Payment status is ${payment.status}` };
    }

    return this.processSuccessfulPayment(payment);
  }

  async initializeBusinessWalletFunding(data: {
    userId: string;
    tenantId: string;
    amount: number;
    provider?: string;
    callbackUrl?: string;
    currency?: string;
  }): Promise<InitializePaymentResult> {
    const user = await this.userRepository.findById(data.userId);
    if (!user) throw new Error('User not found');
    if (!user.email) throw new Error('User email is required for payment');
    if (data.amount <= 0) throw new Error('Amount must be greater than zero');

    const provider = this.resolveProvider(data.provider);
    const gateway = this.getGateway(provider);
    const reference = this.generateReference(provider);
    const callbackUrl =
      data.callbackUrl ||
      process.env.PAYMENT_CALLBACK_URL ||
      `${config.server.apiBaseUrl}/api/wallet/fund/verify`;
    const currency = data.currency || 'NGN';

    await this.saveFundingIntent(reference, {
      userId: data.userId,
      tenantId: data.tenantId,
      walletType: 'BUSINESS',
      provider,
      amount: data.amount,
      currency,
      createdAt: Date.now()
    });

    return gateway.initializePayment({
      amount: data.amount,
      currency,
      reference,
      customerEmail: user.email,
      customerName: `${user.first_name} ${user.surname}`.trim(),
      customerPhone: user.phone || undefined,
      callbackUrl,
      description: `TRAKA business wallet funding for tenant ${data.tenantId}`,
      metadata: {
        userId: data.userId,
        tenantId: data.tenantId,
        purpose: 'BUSINESS_WALLET_TOPUP'
      }
    });
  }
}
