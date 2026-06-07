import { Request, Response } from 'express';
import { PackageService } from '../package/package.service.js';
import { BusinessMemberModel } from '../business/business-member.model.js';
import { webhookService } from '../webhook/webhook.service.js';

const packageService = new PackageService();

async function getBusinessOwnerUserId(tenantId: string): Promise<string | null> {
  const owner = await BusinessMemberModel.findOne({
    where: { tenant_id: tenantId, role: 'OWNER', status: 'ACTIVE' },
  });
  return owner?.user_id ?? null;
}

export const bookRide = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.apiContext!;

    const senderUserId = await getBusinessOwnerUserId(tenantId);
    if (!senderUserId) {
      res.status(422).json({ error: 'Business has no active owner account. Cannot book rides.' });
      return;
    }

    const {
      recipient_name,
      recipient_phone,
      recipient_email,
      pickup_address,
      delivery_address,
      description = 'On-demand courier booking',
      delivery_notes,
      package_size = 'SMALL',
      package_weight,
      is_fragile,
      payment_method = 'CASH',
      payment_by = 'SENDER',
    } = req.body;

    if (!recipient_name || !recipient_phone || !pickup_address || !delivery_address) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['recipient_name', 'recipient_phone', 'pickup_address', 'delivery_address'],
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
        delivery_speed: 'SAME_DAY',
        category: 'On-demand',
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
        type: 'ride',
        dispatch: result.dispatch,
      });
    });

    res.status(201).json({
      message: 'Ride booked successfully',
      ride: {
        id: result.id,
        tracking_number: result.tracking_number,
        status: result.status,
        tracking_url: result.tracking_url,
        dispatch: result.dispatch,
        pricing_breakdown: result.pricing_breakdown,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('OUT_OF_COVERAGE')) {
      res.status(422).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to book ride', details: error.message });
  }
};
