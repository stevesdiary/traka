import config from '../config/environment.js';
import logger from '../utils/logger.js';

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<void>;
}

// ─── KudiSMS ────────────────────────────────────────────────────────────────

interface KudiSMSResponse {
  status: string;
  error_code: string;
  cost?: string;
  data?: string[];
  msg: string;
  length?: number;
  page?: number;
  balance?: string;
}

const KUDISMS_ERROR_MESSAGES: Record<string, string> = {
  '000': 'Message Sent Successfully',
  '009': 'You are only allowed to send maximum of 6 pages of SMS at once',
  '401': 'The request could not be completed',
  '100': 'Token provided is invalid',
  '101': 'The account has been deactivated, please contact the admin',
  '103': "The gateway selected doesn't exist",
  '104': 'Blocked message keyword(s)',
  '105': 'The sender ID used has been blocked',
  '106': 'The sender ID used do not exist',
  '107': 'Please provide a valid phone number',
  '108': 'The total amount of recipients is more than the required batch size of 100',
  '109': 'You do not have enough credit balance to perform the transaction',
  '111': 'Only approved promotional Sender ID allowed',
  '114': 'No package attached to this service',
  '185': 'No route attached to this package',
  '187': 'The request could not be processed',
  '188': 'The sender ID is unapproved',
  '300': 'There are missing parameters'
};

export class KudiSMSProvider implements SMSProvider {
  private apiToken: string;
  private senderId: string;
  private gateway: string;
  private readonly apiUrl = 'https://my.kudisms.net/api/sms';

  constructor() {
    this.apiToken = config.sms.kudisms.apiToken;
    this.senderId = config.sms.kudisms.senderId;
    this.gateway = config.sms.kudisms.gateway;
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.apiToken) {
      logger.warn('KudiSMS API token not configured. SMS not sent.');
      return;
    }

    logger.debug('Attempting to send SMS via KudiSMS', { to, messageLength: message.length });

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.apiToken,
        senderID: this.senderId,
        recipients: to,
        message,
        gateway: this.gateway
      })
    });

    if (!response.ok) {
      throw new Error(`KudiSMS HTTP error: ${response.statusText}`);
    }

    const result: KudiSMSResponse = await response.json();

    if (result.status === 'success' && result.error_code === '000') {
      logger.info('SMS sent successfully via KudiSMS', { to, cost: result.cost, balance: result.balance });
    } else {
      const detail = KUDISMS_ERROR_MESSAGES[result.error_code] || result.msg || 'Unknown error';
      throw new Error(`KudiSMS error: ${detail} (code: ${result.error_code})`);
    }
  }
}

// ─── VTPass ─────────────────────────────────────────────────────────────────

interface VTPassSMSMessage {
  statusCode: string;
  recipient: string;
  messageId: string;
  status: string;
  description: string;
  network: string;
}

interface VTPassSMSResponse {
  responseCode: string;
  response: string;
  batchId?: number;
  messages?: VTPassSMSMessage[];
}

export class VTPassSMSProvider implements SMSProvider {
  private publicKey: string;
  private secretKey: string;
  private senderId: string;
  private readonly baseUrl = 'https://messaging.vtpass.com';
  private readonly normalRoute = '/api/sms/sendsms';
  private readonly dndRoute = '/api/sms/dnd-route';
  private useDnd: boolean;

  constructor() {
    this.publicKey = config.sms.vtpass.publicKey;
    this.secretKey = config.sms.vtpass.secretKey;
    this.senderId = config.sms.vtpass.senderId;
    this.useDnd = config.sms.vtpass.useDnd;
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.publicKey || !this.secretKey) {
      logger.warn('VTPass SMS credentials not configured. SMS not sent.');
      return;
    }

    const route = this.useDnd ? this.dndRoute : this.normalRoute;
    const params = new URLSearchParams({
      sender: this.senderId,
      recipient: to,
      message,
      responsetype: 'json'
    });

    logger.debug('Attempting to send SMS via VTPass', { to, messageLength: message.length, useDnd: this.useDnd });

    const response = await fetch(`${this.baseUrl}${route}?${params}`, {
      method: 'GET',
      headers: {
        'X-Token': this.publicKey,
        'X-Secret': this.secretKey
      }
    });

    if (!response.ok) {
      throw new Error(`VTPass HTTP error: ${response.statusText}`);
    }

    const result: VTPassSMSResponse = await response.json();

    if (result.responseCode === 'TG00') {
      logger.info('SMS sent successfully via VTPass', { to, batchId: result.batchId });
    } else {
      throw new Error(`VTPass SMS error: ${result.response} (code: ${result.responseCode})`);
    }
  }
}

// ─── SMSService (facade) ─────────────────────────────────────────────────────

export class SMSService {
  private provider: SMSProvider;

  constructor(provider?: SMSProvider) {
    this.provider = provider ?? SMSService.createDefaultProvider();
  }

  private static createDefaultProvider(): SMSProvider {
    const { provider } = config.sms;
    if (provider === 'vtpass') return new VTPassSMSProvider();
    return new KudiSMSProvider();
  }

  async sendSMS(to: string, message: string): Promise<void> {
    try {
      await this.provider.sendSMS(to, message);
    } catch (error) {
      logger.error('Failed to send SMS', { to, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async sendOTP(phone: string, otp: string): Promise<void> {
    await this.sendSMS(phone, `TRAKA: ${otp} (expires in 10 min)`);
  }

  async sendNotification(phone: string, title: string, message: string): Promise<void> {
    await this.sendSMS(phone, `${title}\n\n${message}`);
  }
}
