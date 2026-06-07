import { Request, Response } from 'express';
import { PackageService } from '../package/package.service.js';
import { PackageRepository } from '../package/package.repository.js';
import { BusinessMemberModel } from '../business/business-member.model.js';
import { webhookService } from '../webhook/webhook.service.js';
import type { WebhookEvent } from '../webhook/webhook-subscription.model.js';

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
    res.status(500).json({ error: 'Failed to create order', details: error.message });
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
    res.status(500).json({ error: 'Failed to retrieve order', details: error.message });
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
    res.status(500).json({ error: 'Failed to confirm delivery', details: error.message });
  }
};
