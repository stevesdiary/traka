import { Client, Receiver } from '@upstash/qstash';
import logger from '../utils/logger.js';

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

export class QueueService {
  // Publish message to queue
  async publishMessage(topic: string, payload: any, delay?: number): Promise<string> {
    try {
      const url = `${process.env.APP_URL}/api/queue/${topic}`;
      const result = delay
        ? await qstash.publishJSON({
            url,
            body: payload,
            delay,
          })
        : await qstash.publishJSON({
            url,
            body: payload,
          });

      logger.info(`Message published to queue: ${topic}`, { messageId: result.messageId });
      return result.messageId;
    } catch (error) {
      logger.error(`Failed to publish message to queue: ${topic}`, { error });
      throw error;
    }
  }

  // Schedule recurring job (cron)
  async scheduleJob(name: string, cron: string, url: string, payload?: any): Promise<string> {
    try {
      const result = await qstash.schedules.create({
        destination: url,
        cron,
        body: payload ? JSON.stringify(payload) : undefined,
      });

      logger.info(`Scheduled job created: ${name}`, { scheduleId: result.scheduleId });
      return result.scheduleId;
    } catch (error) {
      logger.error(`Failed to schedule job: ${name}`, { error });
      throw error;
    }
  }

  // Delete scheduled job
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      await qstash.schedules.delete(scheduleId);
      logger.info(`Schedule deleted: ${scheduleId}`);
    } catch (error) {
      logger.error(`Failed to delete schedule: ${scheduleId}`, { error });
      throw error;
    }
  }

  // Verify incoming webhook signature
  async verifySignature(signature: string, body: string): Promise<boolean> {
    try {
      await qstashReceiver.verify({
        signature,
        body,
      });
      return true;
    } catch (error) {
      logger.warn('QStash signature verification failed', { error });
      return false;
    }
  }
}

export const queueService = new QueueService();
