import { Request, Response } from 'express';
import { PaymentGatewayService } from './payment-gateway.service.js';
import logger from '../utils/logger.js';

export class PaymentGatewayController {
  private paymentGatewayService = new PaymentGatewayService();

  initializeWalletFunding = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { amount, provider, callback_url, currency } = req.body;
      const result = await this.paymentGatewayService.initializeWalletFunding({
        userId,
        amount: Number(amount),
        provider,
        callbackUrl: callback_url,
        currency
      });

      res.status(201).json({
        message: 'Payment initialized successfully',
        payment: {
          provider: result.provider,
          reference: result.reference,
          checkout_url: result.checkoutUrl,
          access_code: result.accessCode,
          bank_details: result.bankDetails
        }
      });
    } catch (error: any) {
      logger.error('Failed to initialize wallet funding', {
        error: error?.message
      });
      res.status(400).json({ error: error.message || 'Failed to initialize payment' });
    }
  };

  verifyWalletFunding = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { reference, provider } = req.query as { reference: string; provider?: string };
      const result = await this.paymentGatewayService.verifyWalletFunding({
        reference,
        provider,
        expectedUserId: userId
      });

      res.json({
        message: result.message,
        payment: result
      });
    } catch (error: any) {
      logger.error('Failed to verify wallet funding', {
        error: error?.message
      });
      res.status(400).json({ error: error.message || 'Failed to verify payment' });
    }
  };

  handleWebhook = (provider: 'kuda' | 'paystack' | 'flutterwave') =>
    async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await this.paymentGatewayService.handleWebhook({
          provider,
          payload: req.body,
          rawBody: (req as any).rawBody,
          headers: req.headers as Record<string, any>
        });

        if (result.code === 'INVALID_SIGNATURE') {
          res.status(401).json({ error: result.message });
          return;
        }

        // Real payment received but intent missing — return 500 so the provider retries.
        if (result.code === 'MISSING_INTENT') {
          logger.error('Webhook unprocessable — no intent found, returning 500 to trigger retry', {
            provider, message: result.message
          });
          res.status(500).json({ error: result.message });
          return;
        }

        res.status(200).json({ message: result.message });
      } catch (error: any) {
        logger.error('Payment webhook handling failed', {
          provider,
          error: error?.message
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    };

  initializeBusinessWalletFunding = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      const tenantId = req.user?.tenant_id;
      if (!userId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized or no business associated' });
        return;
      }

      const { amount, provider, callback_url, currency } = req.body;
      const result = await this.paymentGatewayService.initializeBusinessWalletFunding({
        userId,
        tenantId,
        amount: Number(amount),
        provider,
        callbackUrl: callback_url,
        currency
      });

      res.status(201).json({
        message: 'Business wallet funding initialized',
        payment: {
          provider: result.provider,
          reference: result.reference,
          checkout_url: result.checkoutUrl,
          access_code: result.accessCode,
          bank_details: result.bankDetails
        }
      });
    } catch (error: any) {
      logger.error('Failed to initialize business wallet funding', {
        error: error?.message
      });
      res.status(400).json({ error: error.message || 'Failed to initialize payment' });
    }
  };
}
