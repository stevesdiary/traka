import { Request, Response } from 'express';
import { quoteService } from './quote.service.js';
import { createQuoteSchema } from './quote.validators.js';
import logger from '../utils/logger.js';

export class QuoteController {
  createQuote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = createQuoteSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // Check if user is authenticated
      const user_id = req.user?.userId;

      const quote = await quoteService.createQuote({
        ...value,
        user_id
      });

      logger.info('Quote created', {
        quote_code: quote.quote_code,
        user_id: user_id || 'anonymous',
        estimated_price: quote.estimated_price
      });

      res.status(201).json(quote);
    } catch (error: any) {
      logger.error('Failed to create quote', {
        error: error.message,
        body: req.body
      });
      if (error.message?.includes('BULK_DELIVERIES_COMING_SOON')) {
        res.status(503).json({ error: error.message, coming_soon: true });
        return;
      }
      res.status(500).json({ error: 'Failed to create quote' });
    }
  };

  getQuote = async (req: Request, res: Response): Promise<void> => {
    try {
      const { quote_code } = req.params as Record<string, string>;

      const quote = await quoteService.getQuoteByCode(quote_code);

      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }

      res.json({
        quote_code: quote.quote_code,
        pickup_address: quote.pickup_address,
        delivery_address: quote.delivery_address,
        package_size: quote.package_size,
        package_weight: quote.package_weight,
        delivery_speed: quote.delivery_speed,
        estimated_price: quote.estimated_price,
        currency: quote.currency,
        estimated_distance_km: quote.estimated_distance_km,
        expires_at: quote.expires_at,
        status: quote.status,
        created_at: quote.createdAt
      });
    } catch (error: any) {
      logger.error('Failed to get quote', {
        error: error.message,
        quote_code: req.params.quote_code
      });
      res.status(500).json({ error: 'Failed to get quote' });
    }
  };

  getMyQuotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const user_id = req.user!.userId;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const quotes = await quoteService.getUserQuotes(user_id, limit);

      res.json({
        quotes: quotes.map(q => ({
          quote_code: q.quote_code,
          pickup_address: q.pickup_address,
          delivery_address: q.delivery_address,
          estimated_price: q.estimated_price,
          currency: q.currency,
          delivery_speed: q.delivery_speed,
          status: q.status,
          expires_at: q.expires_at,
          created_at: q.createdAt
        })),
        count: quotes.length
      });
    } catch (error: any) {
      logger.error('Failed to get user quotes', {
        error: error.message,
        user_id: req.user?.userId
      });
      res.status(500).json({ error: 'Failed to get quotes' });
    }
  };

  getAnonymousQuotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { session_id } = req.params as Record<string, string>;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      if (!session_id) {
        res.status(400).json({ error: 'Session ID is required' });
        return;
      }

      const quotes = await quoteService.getAnonymousQuotes(session_id, limit);

      res.json({
        quotes: quotes.map(q => ({
          quote_code: q.quote_code,
          pickup_address: q.pickup_address,
          delivery_address: q.delivery_address,
          estimated_price: q.estimated_price,
          currency: q.currency,
          delivery_speed: q.delivery_speed,
          status: q.status,
          expires_at: q.expires_at,
          created_at: q.createdAt
        })),
        count: quotes.length
      });
    } catch (error: any) {
      logger.error('Failed to get anonymous quotes', {
        error: error.message,
        session_id: req.params.session_id
      });
      res.status(500).json({ error: 'Failed to get quotes' });
    }
  };
}
