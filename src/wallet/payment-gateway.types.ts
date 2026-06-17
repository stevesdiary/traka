export enum PaymentProvider {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
  KUDA = 'KUDA'
}

export interface InitializePaymentInput {
  amount: number;
  currency: string;
  reference: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  callbackUrl: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface BankTransferDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode?: string;
}

export interface InitializePaymentResult {
  provider: PaymentProvider;
  reference: string;
  checkoutUrl?: string;
  accessCode?: string;
  bankDetails?: BankTransferDetails;
  raw?: any;
}

export interface VerifiedPayment {
  provider: PaymentProvider;
  reference: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  amount: number;
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
  paidAt?: Date;
  raw?: any;
  fallbackUserId?: string;
}

export type WalletType = 'PERSONAL' | 'BUSINESS';

export interface WalletFundingIntent {
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  createdAt: number;
  walletType?: WalletType;
  tenantId?: string;
}

export type WebhookResultCode =
  | 'OK'
  | 'IGNORED'
  | 'INVALID_SIGNATURE'
  | 'MISSING_INTENT'
  | 'PENDING';

export interface WebhookProcessResult {
  processed: boolean;
  message: string;
  code: WebhookResultCode;
}
