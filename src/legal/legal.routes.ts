import { Router } from 'express';
import { LegalController } from './legal.controller.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { Resource, Action } from '../utils/rolePermissions.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: Router = Router();
const legalController = new LegalController();

// Public endpoints (no authentication required)
router.get('/faq', legalController.getFAQs);
router.get('/terms', legalController.getTermsOfService);
router.get('/commission-policy', legalController.getCommissionPolicy);

// Admin endpoint to seed content
router.post('/seed',
  authenticateToken,
  requirePermission(Resource.USER, Action.CREATE),
  legalController.seedContent
);

export { router as legalRoutes };