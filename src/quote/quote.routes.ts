import { Router } from 'express';
import { QuoteController } from './quote.controller.js';
import { optionalAuth } from '../middleware/optional-auth.middleware.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router: Router = Router();
const quoteController = new QuoteController();

// Rate limiter for public quote endpoint (prevent abuse)
const quoteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: 'Too many quote requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Public endpoint - anyone can create quotes (with rate limiting)
router.post('/', quoteRateLimiter, optionalAuth, quoteController.createQuote);

// Public endpoint - get quote by code (no auth required)
router.get('/:quote_code', quoteController.getQuote);

// Authenticated endpoint - get user's quotes (auth required)
router.get('/user/my-quotes', authenticateToken, quoteController.getMyQuotes);

// Public endpoint - get anonymous quotes by session ID (no auth required)
router.get('/session/:session_id', quoteController.getAnonymousQuotes);

export default router;
