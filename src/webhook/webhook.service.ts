import crypto from 'crypto';
import { URL } from 'url';
import { WebhookSubscriptionModel, WEBHOOK_EVENTS, type WebhookEvent } from './webhook-subscription.model.js';
import logger from '../utils/logger.js';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', '169.254.169.254', 'metadata']);
const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
];

function isWebhookUrlSafe(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(host)) return false;
    if (PRIVATE_IP_RANGES.some(r => r.test(host))) return false;
    return true;
  } catch {
    return false;
  }
}

export class WebhookService {
  async dispatch(tenantId: string, event: WebhookEvent, payload: object): Promise<void> {
    const subscriptions = await WebhookSubscriptionModel.findAll({
      where: { tenant_id: tenantId, status: 'ACTIVE' },
    });

    const matching = subscriptions.filter(
      sub => sub.events.includes(event) || sub.events.includes('*')
    );

    await Promise.allSettled(matching.map(sub => this.deliver(sub, event, payload)));
  }

  private async deliver(sub: WebhookSubscriptionModel, event: WebhookEvent, payload: object): Promise<void> {
    const deliveryId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ event, data: payload, delivery_id: deliveryId, timestamp });
    const signature = crypto.createHmac('sha256', sub.secret).update(body).digest('hex');

    try {
      const response = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Traka-Signature': `sha256=${signature}`,
          'X-Traka-Event': event,
          'X-Traka-Delivery-Id': deliveryId,
          'X-Traka-Timestamp': String(timestamp),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await sub.update({ last_delivery_at: new Date(), failure_count: 0 });
    } catch (error: any) {
      await sub.update({ failure_count: sub.failure_count + 1 });
      logger.warn('Webhook delivery failed', { url: sub.url, event, error: error.message });
    }
  }

  async createSubscription(tenantId: string, url: string, events: string[]) {
    if (!isWebhookUrlSafe(url)) {
      throw new Error('INVALID_URL: Webhook URL must be a valid public HTTP/HTTPS endpoint');
    }

    const unknownEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e as WebhookEvent) && e !== '*');
    if (unknownEvents.length > 0) {
      throw new Error(`UNKNOWN_EVENTS: ${unknownEvents.join(', ')}`);
    }

    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;
    const sub = await WebhookSubscriptionModel.create({
      tenant_id: tenantId,
      url,
      secret,
      events,
      status: 'ACTIVE',
    });

    return sub.toJSON();
  }

  async listSubscriptions(tenantId: string) {
    return WebhookSubscriptionModel.findAll({
      where: { tenant_id: tenantId },
      order: [['createdAt', 'DESC']],
    });
  }

  async deleteSubscription(id: string, tenantId: string): Promise<void> {
    const affected = await WebhookSubscriptionModel.destroy({
      where: { id, tenant_id: tenantId },
    });
    if (!affected) throw new Error('Webhook subscription not found');
  }
}

export const webhookService = new WebhookService();
