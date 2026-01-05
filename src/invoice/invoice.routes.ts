import { Router } from 'express';
import { InvoiceController } from './invoice.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rolePermission.middleware.js';
import { Resource, Action } from '../utils/rolePermissions.js';

const router: Router = Router();
const invoiceController = new InvoiceController();

router.use(authenticateToken);

// Generate invoice for tenant
router.post('/generate',
  requirePermission(Resource.TENANT, Action.CREATE),
  invoiceController.generateInvoice
);

// Get tenant invoices
router.get('/',
  requirePermission(Resource.TENANT, Action.READ),
  invoiceController.getInvoices
);

// Mark invoice as paid (admin only)
router.put('/:invoiceId/paid',
  requirePermission(Resource.TENANT, Action.APPROVE),
  invoiceController.markPaid
);

// Get overdue invoices (admin only)
router.get('/overdue',
  requirePermission(Resource.TENANT, Action.READ),
  invoiceController.getOverdueInvoices
);

export { router as invoiceRoutes };