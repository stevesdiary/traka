import { InvoiceRepository } from './invoice.repository.js';
import { PackageModel } from '../package/package.model.js';
import { sequelize } from '../config/database.js';
import { QueryTypes, Op } from 'sequelize';

export class InvoiceService {
  private invoiceRepository = new InvoiceRepository();
  private readonly PLATFORM_FEE_RATE = 0.15; // 15% platform fee

  async generateMonthlyInvoice(tenantId: string, year: number, month: number): Promise<any> {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Check if invoice already exists
    const existingInvoice = await this.invoiceRepository.findByTenantAndPeriod(
      tenantId, periodStart, periodEnd
    );

    if (existingInvoice) {
      return existingInvoice;
    }

    // Get delivered packages for the period
    const packages = await PackageModel.findAll({
      where: {
        tenant_id: tenantId,
        status: 'DELIVERED',
        delivered_at: {
          [Op.between]: [periodStart, periodEnd]
        }
      }
    });

    const subtotal = packages.reduce((sum, pkg) => sum + Number(pkg.delivery_fee || 0), 0);
    const platformFee = subtotal * this.PLATFORM_FEE_RATE;
    const totalAmount = subtotal + platformFee;

    const invoiceNumber = this.generateInvoiceNumber(tenantId, year, month);
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 30); // 30 days to pay

    return await this.invoiceRepository.createInvoice({
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      subtotal,
      platform_fee: platformFee,
      total_amount: totalAmount,
      package_count: packages.length,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
      status: 'PENDING'
    });
  }

  async markInvoicePaid(invoiceId: string): Promise<void> {
    await this.invoiceRepository.markAsPaid(invoiceId);
  }

  async getInvoicesByTenant(tenantId: string): Promise<any[]> {
    return await this.invoiceRepository.findByTenant(tenantId);
  }

  async getOverdueInvoices(): Promise<any[]> {
    return await this.invoiceRepository.findOverdue();
  }

  async generateInvoicesForAllTenants(year: number, month: number): Promise<void> {
    const tenants = await sequelize.query(
      'SELECT DISTINCT tenant_id FROM packages WHERE status = :status',
      {
        replacements: { status: 'DELIVERED' },
        type: QueryTypes.SELECT
      }
    ) as { tenant_id: string }[];

    for (const tenant of tenants) {
      try {
        await this.generateMonthlyInvoice(tenant.tenant_id, year, month);
      } catch (error) {
        console.error(`Failed to generate invoice for tenant ${tenant.tenant_id}:`, error);
      }
    }
  }

  private generateInvoiceNumber(tenantId: string, year: number, month: number): string {
    const shortTenantId = tenantId.substring(0, 8);
    const monthStr = month.toString().padStart(2, '0');
    return `INV-${year}${monthStr}-${shortTenantId}`;
  }
}