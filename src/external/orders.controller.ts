import { Request, Response } from 'express';
import { PackageService } from '../package/package.service.js';
import { PackageRepository } from '../package/package.repository.js';
import { BusinessMemberModel } from '../business/business-member.model.js';
import { webhookService } from '../webhook/webhook.service.js';
import type { WebhookEvent } from '../webhook/webhook-subscription.model.js';
import config from '../config/environment.js';

const packageService = new PackageService();
const packageRepository = new PackageRepository();

async function getBusinessOwnerUserId(tenantId: string): Promise<string | null> {
  const owner = await BusinessMemberModel.findOne({
    where: { tenant_id: tenantId, role: 'OWNER', status: 'ACTIVE' },
  });
  return owner?.user_id ?? null;
}

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.apiContext!;

    const senderUserId = await getBusinessOwnerUserId(tenantId);
    if (!senderUserId) {
      res.status(422).json({ error: 'Business has no active owner account. Cannot create orders.' });
      return;
    }

    const {
      recipient_name,
      recipient_phone,
      recipient_email,
      pickup_address,
      delivery_address,
      description,
      delivery_notes,
      package_size = 'SMALL',
      package_weight,
      delivery_speed = 'STANDARD',
      category = 'General',
      is_fragile,
      payment_method,
      payment_by,
    } = req.body;

    if (!recipient_name || !recipient_phone || !pickup_address || !delivery_address || !description) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['recipient_name', 'recipient_phone', 'pickup_address', 'delivery_address', 'description'],
      });
      return;
    }

    const result = await packageService.createPackage(
      {
        recipient_name,
        recipient_phone,
        recipient_email,
        pickup_address,
        delivery_address,
        description,
        delivery_notes,
        package_size,
        package_weight,
        delivery_speed,
        category,
        is_fragile,
        payment_method,
        payment_by,
      },
      senderUserId,
      tenantId
    );

    setImmediate(() => {
      webhookService.dispatch(tenantId, 'order.created', {
        tracking_number: result.tracking_number,
        status: result.status,
        recipient_name,
        delivery_address,
        pricing_breakdown: result.pricing_breakdown,
      });
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: result.id,
        tracking_number: result.tracking_number,
        status: result.status,
        tracking_url: result.tracking_url,
        pricing_breakdown: result.pricing_breakdown,
        dispatch: result.dispatch,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('OUT_OF_COVERAGE')) {
      res.status(422).json({ error: error.message });
      return;
    }
    if (error.message?.includes('BULK_DELIVERIES_COMING_SOON')) {
      res.status(503).json({ error: error.message, coming_soon: true });
      return;
    }
    res.status(500).json({ error: 'Failed to create order', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const trackOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.apiContext!;
    const { tracking_number } = req.params;

    const packageData = await packageService.getPackageByTrackingNumber(tracking_number);

    // Scope check — businesses can only track their own tenant's orders
    const rawPackage = await packageRepository.findByTrackingNumber(tracking_number);
    if (!rawPackage || rawPackage.tenant_id !== tenantId) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({ order: packageData });
  } catch (error: any) {
    if (error.message === 'Package not found') {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to retrieve order', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const createBulkOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.apiContext!;
    const { orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      res.status(400).json({ error: 'orders must be a non-empty array' });
      return;
    }
    if (orders.length > 50) {
      res.status(400).json({ error: 'Maximum 50 orders per bulk request' });
      return;
    }

    const senderUserId = await getBusinessOwnerUserId(tenantId);
    if (!senderUserId) {
      res.status(422).json({ error: 'Business has no active owner account. Cannot create orders.' });
      return;
    }

    const results = await Promise.allSettled(
      orders.map((order: any) => {
        const {
          recipient_name,
          recipient_phone,
          recipient_email,
          pickup_address,
          delivery_address,
          description,
          delivery_notes,
          package_size = 'SMALL',
          package_weight,
          delivery_speed = 'STANDARD',
          category = 'OTHERS',
          is_fragile,
          payment_method,
          payment_by,
        } = order;

        if (!recipient_name || !recipient_phone || !pickup_address || !delivery_address || !description) {
          return Promise.reject(new Error('Missing required fields: recipient_name, recipient_phone, pickup_address, delivery_address, description'));
        }

        return packageService.createPackage(
          { recipient_name, recipient_phone, recipient_email, pickup_address, delivery_address, description, delivery_notes, package_size, package_weight, delivery_speed, category, is_fragile, payment_method, payment_by },
          senderUserId,
          tenantId
        );
      })
    );

    const created: any[] = [];
    const errors: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const r = result.value;
        created.push({
          index,
          tracking_number: r.tracking_number,
          status: r.status,
          pricing_breakdown: r.pricing_breakdown,
          tracking_url: r.tracking_url,
        });
        setImmediate(() => {
          webhookService.dispatch(tenantId, 'order.created', {
            tracking_number: r.tracking_number,
            status: r.status,
            recipient_name: orders[index].recipient_name,
            delivery_address: orders[index].delivery_address,
            pricing_breakdown: r.pricing_breakdown,
          });
        });
      } else {
        errors.push({
          index,
          reason: (result.reason as Error).message || 'Unknown error',
        });
      }
    });

    res.status(207).json({
      summary: { total: orders.length, created: created.length, failed: errors.length },
      orders: created,
      errors,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process bulk orders', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const updateRecipient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.apiContext!;
    const { tracking_number } = req.params;
    const { recipient_name, recipient_phone, recipient_email, delivery_address } = req.body;

    if (!recipient_name && !recipient_phone && recipient_email === undefined && !delivery_address) {
      res.status(400).json({
        error: 'At least one field must be provided',
        fields: ['recipient_name', 'recipient_phone', 'recipient_email', 'delivery_address'],
      });
      return;
    }

    const result = await packageService.updateRecipientDetails(tracking_number, tenantId, {
      recipient_name,
      recipient_phone,
      recipient_email,
      delivery_address,
    });

    res.json({ message: 'Recipient updated successfully', ...result });
  } catch (error: any) {
    if (error.message === 'Order not found') {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (error.message?.startsWith('Cannot update order in')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update recipient', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const confirmDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.apiContext!;
    const { tracking_number } = req.params;

    const rawPackage = await packageRepository.findByTrackingNumber(tracking_number);
    if (!rawPackage || rawPackage.tenant_id !== tenantId) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (rawPackage.status === 'DELIVERED') {
      res.json({ message: 'Order already marked as delivered', status: 'DELIVERED' });
      return;
    }

    if (rawPackage.status === 'CANCELLED') {
      res.status(422).json({ error: 'Cannot confirm a cancelled order' });
      return;
    }

    await packageService.updatePackageStatus(rawPackage.id, 'DELIVERED', tenantId);

    setImmediate(() => {
      webhookService.dispatch(tenantId, 'order.confirmed', {
        tracking_number,
        status: 'DELIVERED',
      });
    });

    res.json({ message: 'Delivery confirmed', tracking_number, status: 'DELIVERED' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to confirm delivery', ...(config.isDevelopment && { details: error.message }) });
  }
};
