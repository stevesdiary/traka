export enum PaymentProvider {
  MONNIFY = 'MONNIFY',
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE'
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

export interface InitializePaymentResult {
  provider: PaymentProvider;
  reference: string;
  checkoutUrl: string;
  accessCode?: string;
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

export interface WalletFundingIntent {
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  createdAt: number;
}
