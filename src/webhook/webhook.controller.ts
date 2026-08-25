import { Request, Response } from 'express';
import { WebhookService, webhookService } from './webhook.service.js';
import { WEBHOOK_EVENTS } from './webhook-subscription.model.js';
import { BusinessMemberModel } from '../business/business-member.model.js';
import config from '../config/environment.js';

async function assertMembership(userId: string, tenantId: string, res: Response): Promise<boolean> {
  const membership = await BusinessMemberModel.findOne({
    where: { user_id: userId, tenant_id: tenantId, status: 'ACTIVE' },
  });
  if (!membership || membership.role === 'MEMBER') {
    res.status(403).json({ error: 'Only business owners and admins can manage webhooks' });
    return false;
  }
  return true;
}

export const createWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { business_id } = req.params as Record<string, string>;
    const { url, events } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({
        error: 'events must be a non-empty array',
        valid_events: [...WEBHOOK_EVENTS, '*'],
      });
      return;
    }

    if (!(await assertMembership(userId, business_id, res))) return;

    const sub = await webhookService.createSubscription(business_id, url, events);
    res.status(201).json({
      message: 'Webhook subscription created. Use the secret to verify incoming requests.',
      webhook: sub,
    });
  } catch (error: any) {
    if (error.message?.startsWith('INVALID_URL') || error.message?.startsWith('UNKNOWN_EVENTS')) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create webhook', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const listWebhooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { business_id } = req.params as Record<string, string>;

    if (!(await assertMembership(userId, business_id, res))) return;

    const webhooks = await webhookService.listSubscriptions(business_id);
    res.json({ webhooks });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list webhooks', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const deleteWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { business_id, webhook_id } = req.params as Record<string, string>;

    if (!(await assertMembership(userId, business_id, res))) return;

    await webhookService.deleteSubscription(webhook_id, business_id);
    res.json({ message: 'Webhook subscription deleted' });
  } catch (error: any) {
    if (error.message === 'Webhook subscription not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete webhook', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const listDeliveries = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { business_id, webhook_id } = req.params as Record<string, string>;

    if (!(await assertMembership(userId, business_id, res))) return;

    const deliveries = await webhookService.listDeliveries(webhook_id, business_id);
    res.json({ deliveries });
  } catch (error: any) {
    if (error.message === 'Webhook subscription not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to retrieve webhook deliveries', ...(config.isDevelopment && { details: error.message }) });
  }
};
