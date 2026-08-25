import { Request, Response } from 'express';
import { InvoiceService } from './invoice.service.js';
import config from '../config/environment.js';

export class InvoiceController {
  private invoiceService = new InvoiceService();

  generateInvoice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { year, month } = req.body;
      const tenantId = req.user?.tenant_id || (req.params.tenantId as string);

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }

      const invoice = await this.invoiceService.generateMonthlyInvoice(
        tenantId,
        parseInt(year),
        parseInt(month)
      );

      res.status(201).json({ invoice });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Internal server error' });
    }
  };

  getInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const invoices = await this.invoiceService.getInvoicesByTenant(tenantId);
      res.json({ invoices });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Internal server error' });
    }
  };

  markPaid = async (req: Request, res: Response): Promise<void> => {
    try {
      const { invoiceId } = req.params as Record<string, string>;
      
      await this.invoiceService.markInvoicePaid(invoiceId);
      res.json({ message: 'Invoice marked as paid' });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Internal server error' });
    }
  };

  getOverdueInvoices = async (req: Request, res: Response): Promise<void> => {
    try {
      const overdueInvoices = await this.invoiceService.getOverdueInvoices();
      res.json({ invoices: overdueInvoices });
    } catch (error: any) {
      res.status(500).json({ error: config.isDevelopment ? error.message : 'Internal server error' });
    }
  };
}