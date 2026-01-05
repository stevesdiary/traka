import { Request, Response } from 'express';
import crypto from 'crypto';
import { WalletService } from './wallet.service.js';

export class MonnifyWebhookController {
  private walletService = new WalletService();
  private readonly MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY || '';

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify signature
      const monnifySignature = req.headers['monnify-signature'] as string;
      const rawBody = (req as any).rawBody;

      if (!this.verifySignature(rawBody, monnifySignature)) {
        console.error('Invalid Monnify webhook signature');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { eventType, eventData } = req.body;

      if (eventType === 'SUCCESSFUL_TRANSACTION') {
        const { amountPaid, transactionReference, product } = eventData;
        const riderId = product.reference; // Rider ID mapped to product reference

        await this.walletService.processPayment(
          riderId,
          Number(amountPaid),
          transactionReference
        );

        console.log(`Payment processed: ₦${amountPaid} for rider ${riderId}`);
      }

      res.status(200).json({ message: 'Webhook processed' });
    } catch (error: any) {
      console.error('Monnify webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private verifySignature(rawBody: Buffer, signature: string): boolean {
    if (!this.MONNIFY_SECRET_KEY) return false;

    const computedHash = crypto
      .createHmac('sha512', this.MONNIFY_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    return computedHash === signature;
  }
}