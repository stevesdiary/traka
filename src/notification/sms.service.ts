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
  '103': 'The gateway selected doesn\'t exist',
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

export class SMSService {
  private apiToken: string;
  private senderId: string;
  private gateway: string;
  private apiUrl = 'https://my.kudisms.net/api/sms';

  constructor() {
    this.apiToken = process.env.KUDISMS_API_TOKEN || '';
    this.senderId = process.env.KUDISMS_SENDER_ID || 'TRAKA';
    this.gateway = process.env.KUDISMS_GATEWAY || '2'; // Default: Refunds for DND numbers
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.apiToken) {
      console.warn('KudiSMS API token not configured. SMS not sent.');
      return;
    }

    // Debug: Log the exact message being sent
    console.log('📱 Attempting to send SMS:');
    console.log('  To:', to);
    console.log('  Message:', message);
    console.log('  Message length:', message.length);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: this.apiToken,
          senderID: this.senderId,
          recipients: to,
          message: message,
          gateway: this.gateway
        })
      });
      
      if (!response.ok) {
        throw new Error(`KudiSMS API error: ${response.statusText}`);
      }

      const result: KudiSMSResponse = await response.json();

      if (result.status === 'success' && result.error_code === '000') {
        console.log(`SMS sent successfully to ${to}.`);
      } else {
        const errorMessage = KUDISMS_ERROR_MESSAGES[result.error_code] || result.msg || 'Unknown error';
        throw new Error(`KudiSMS API error: ${errorMessage} (Code: ${result.error_code})`);
      }
    } catch (error: any) {
      console.error('Failed to send SMS:', error.message);
      throw error;
    }
  }

  async sendOTP(phone: string, otp: string): Promise<void> {
    const message = `TRAKA: ${otp} (expires in 10 min)`;
    await this.sendSMS(phone, message);
  }

  async sendNotification(phone: string, title: string, message: string): Promise<void> {
    const smsMessage = `${title}\n\n${message}`;
    await this.sendSMS(phone, smsMessage);
  }
}
