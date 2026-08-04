import crypto from 'crypto';
import { URL } from 'url';
import { WebhookSubscriptionModel, WEBHOOK_EVENTS, type WebhookEvent } from './webhook-subscription.model.js';
import { WebhookDeliveryModel } from './webhook-delivery.model.js';
import { queueService, isQStashConfigured } from '../config/qstash.js';
import config from '../config/environment.js';
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

interface DeliveryMessage {
  subscription_id: string;
  delivery_id: string;
}

export class WebhookService {
  async dispatch(tenantId: string, event: WebhookEvent, payload: object): Promise<void> {
    const subscriptions = await WebhookSubscriptionModel.findAll({
      where: { tenant_id: tenantId, status: 'ACTIVE' },
    });

    const matching = subscriptions.filter(
      sub => sub.events.includes(event) || sub.events.includes('*')
    );

    await Promise.allSettled(matching.map(sub => this.enqueue(sub, event, payload)));
  }

  // Persist a delivery and hand it to QStash (or deliver directly when QStash is unavailable).
  private async enqueue(
    sub: WebhookSubscriptionModel,
    event: WebhookEvent,
    payload: object
  ): Promise<void> {
    const deliveryId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    // Store the exact JSON string so HMAC verification is byte-identical across retries.
    const body = JSON.stringify({ event, data: payload, delivery_id: deliveryId, timestamp });

    const delivery = await WebhookDeliveryModel.create({
      subscription_id: sub.id,
      tenant_id: sub.tenant_id,
      event,
      payload,
      delivery_id: deliveryId,
      body,
      status: 'PENDING',
      attempt_count: 0,
      max_attempts: config.webhook.retries + 1,
    });

    if (!isQStashConfigured()) {
      logger.warn('QStash not configured — delivering webhook synchronously', {
        delivery_id: deliveryId,
        url: sub.url,
      });
      try {
        await this.deliverAttempt(sub, body, delivery, true);
      } catch (error: any) {
        logger.warn('Direct webhook delivery failed', { delivery_id: deliveryId, error: error.message });
      }
      return;
    }

    const queueUrl = `${config.server.apiBaseUrl}/api/queue/webhook`;
    const failureUrl = `${config.server.apiBaseUrl}/api/queue/webhook/failed`;
    const retryDelay = `max(${config.webhook.retryBaseDelayMs}, pow(2, retried) * ${config.webhook.retryBaseDelayMs})`;

    try {
      const messageId = await queueService.publishWebhookDelivery({
        url: queueUrl,
        body: { subscription_id: sub.id, delivery_id: deliveryId },
        retries: config.webhook.retries,
        retryDelay,
        failureCallback: failureUrl,
      });
      await delivery.update({ qstash_message_id: messageId });
    } catch (error: any) {
      await delivery.update({ status: 'FAILED', last_error: error.message || 'Enqueue failed' });
      logger.error('Failed to enqueue webhook delivery', {
        subscription_id: sub.id,
        delivery_id: deliveryId,
        error: error.message,
      });
    }
  }

  // Queue handler entry point: attempt a single delivery. Throws on retryable
  // failures so the queue returns 5xx and QStash schedules the next attempt.
  async handleQueueDelivery(message: DeliveryMessage): Promise<void> {
    const sub = await WebhookSubscriptionModel.findByPk(message.subscription_id);
    if (!sub || sub.status !== 'ACTIVE') {
      logger.warn('Webhook delivery dropped — subscription missing or inactive', message);
      return;
    }

    const delivery = await WebhookDeliveryModel.findOne({
      where: { delivery_id: message.delivery_id },
    });
    if (!delivery) {
      logger.warn('Webhook delivery record not found', message);
      return;
    }

    await this.deliverAttempt(sub, delivery.body, delivery, true);
  }

  // Dead-letter handler: called by QStash when retries are exhausted.
  async handleDeadLetter(message: DeliveryMessage): Promise<void> {
    await WebhookDeliveryModel.update(
      { status: 'DEAD' },
      { where: { delivery_id: message.delivery_id } }
    );

    const sub = await WebhookSubscriptionModel.findByPk(message.subscription_id);
    if (sub && sub.status === 'ACTIVE') {
      await sub.update({ status: 'DISABLED' });
      logger.warn('Webhook subscription auto-disabled after retries exhausted', {
        subscription_id: sub.id,
        url: sub.url,
      });
    }
  }

  async listDeliveries(subscriptionId: string, tenantId: string) {
    const sub = await WebhookSubscriptionModel.findOne({
      where: { id: subscriptionId, tenant_id: tenantId },
    });
    if (!sub) throw new Error('Webhook subscription not found');

    return WebhookDeliveryModel.findAll({
      where: { subscription_id: subscriptionId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
  }

  // Perform one HTTP delivery and record the outcome. Throws on retryable errors;
  // permanent 4xx responses disable the subscription and do not retry.
  private async deliverAttempt(
    sub: WebhookSubscriptionModel,
    body: string,
    delivery: WebhookDeliveryModel,
    terminalOn4xx: boolean
  ): Promise<void> {
    await delivery.update({
      attempt_count: delivery.attempt_count + 1,
      last_attempt_at: new Date(),
      status: 'PENDING',
    });

    const signature = crypto.createHmac('sha256', sub.secret).update(body).digest('hex');

    try {
      const response = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Traka-Signature': `sha256=${signature}`,
          'X-Traka-Event': delivery.event,
          'X-Traka-Delivery-Id': delivery.delivery_id,
          'X-Traka-Timestamp': String(JSON.parse(body).timestamp),
        },
        body,
        signal: AbortSignal.timeout(config.webhook.timeoutMs),
      });

      await delivery.update({ last_status_code: response.status });

      if (response.ok) {
        await delivery.update({ status: 'SUCCEEDED', last_error: null });
        await sub.update({ last_delivery_at: new Date(), failure_count: 0 });
        return;
      }

      if (terminalOn4xx && response.status >= 400 && response.status < 500) {
        const reason = `Endpoint returned HTTP ${response.status}`;
        await delivery.update({ status: 'FAILED', last_error: reason });
        await this.disableSubscription(sub, reason);
        return;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error: any) {
      const reason = error.message || 'Unknown delivery error';
      await delivery.update({ status: 'FAILED', last_error: reason });
      await sub.increment('failure_count');
      logger.warn('Webhook delivery failed', {
        url: sub.url,
        event: delivery.event,
        error: reason,
        delivery_id: delivery.delivery_id,
      });
      throw error;
    }
  }

  private async disableSubscription(sub: WebhookSubscriptionModel, reason: string): Promise<void> {
    await sub.update({ status: 'DISABLED' });
    logger.warn('Webhook subscription disabled', { subscription_id: sub.id, url: sub.url, reason });
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
