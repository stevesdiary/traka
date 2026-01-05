import { InvoiceModel } from './invoice.model.js';
import { Op } from 'sequelize';

export class InvoiceRepository {
  async createInvoice(data: {
    tenant_id: string;
    invoice_number: string;
    subtotal: number;
    platform_fee: number;
    total_amount: number;
    package_count: number;
    period_start: Date;
    period_end: Date;
    due_date: Date;
    status?: string;
  }): Promise<InvoiceModel> {
    return await InvoiceModel.create(data);
  }

  async findByTenantAndPeriod(tenantId: string, periodStart: Date, periodEnd: Date): Promise<InvoiceModel | null> {
    return await InvoiceModel.findOne({
      where: {
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd
      }
    });
  }

  async findByTenant(tenantId: string): Promise<InvoiceModel[]> {
    return await InvoiceModel.findAll({
      where: { tenant_id: tenantId },
      order: [['createdAt', 'DESC']]
    });
  }

  async findOverdue(): Promise<InvoiceModel[]> {
    return await InvoiceModel.findAll({
      where: {
        status: 'PENDING',
        due_date: {
          [Op.lt]: new Date()
        }
      }
    });
  }

  async markAsPaid(invoiceId: string): Promise<void> {
    await InvoiceModel.update(
      { 
        status: 'PAID',
        paid_at: new Date()
      },
      { where: { id: invoiceId } }
    );
  }
}