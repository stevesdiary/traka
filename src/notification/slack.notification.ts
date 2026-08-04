import axios from 'axios';
import { SSRFProtection } from '../utils/ssrf-protection.js';
import logger from '../utils/logger.js';

interface SlackErrorPayload {
  error: Error;
  context?: {
    userId?: string;
    endpoint?: string;
    method?: string;
    requestId?: string;
    additionalInfo?: any;
  };
}

export class SlackNotificationService {
  private webhookUrl: string;
  private environment: string;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/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';
    this.environment = process.env.NODE_ENV || 'development';
    
    // Validate webhook URL
    if (this.webhookUrl && !SSRFProtection.isUrlSafe(this.webhookUrl)) {
      logger.warn('Slack webhook URL failed SSRF validation');
      this.webhookUrl = '';
    }
  }

  async sendErrorNotification(payload: SlackErrorPayload): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const { error, context } = payload;
      
      const appName = context?.additionalInfo?.app || 'traka-server';

      const slackMessage = {
        text: `🚨 [${appName}] Application Error - ${this.environment.toUpperCase()}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🚨 [${appName}] Error - ${this.environment.toUpperCase()}`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Error:* ${error.message}`
              },
              {
                type: 'mrkdwn',
                text: `*Time:* ${new Date().toISOString()}`
              }
            ]
          }
        ]
      };

      // Add context information if available
      if (context) {
        const contextFields = [];
        
        if (context.endpoint) {
          contextFields.push({
            type: 'mrkdwn',
            text: `*Endpoint:* ${context.method || 'GET'} ${context.endpoint}`
          });
        }
        
        if (context.userId) {
          contextFields.push({
            type: 'mrkdwn',
            text: `*User ID:* ${context.userId}`
          });
        }

        if (contextFields.length > 0) {
          slackMessage.blocks.push({
            type: 'section',
            fields: contextFields
          });
        }
      }

      // Add stack trace for development
      if (this.environment === 'development' && error.stack) {
        slackMessage.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Stack Trace:*\n\`\`\`${error.stack.substring(0, 500)}...\`\`\``
          }
        });
      }

      await axios.post(this.webhookUrl, slackMessage);
    } catch (slackError) {
      logger.error('Failed to send Slack notification', { error: slackError instanceof Error ? slackError.message : String(slackError) });
    }
  }

  async sendCriticalAlert(message: string, details?: any): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const slackMessage = {
        text: `🔥 CRITICAL ALERT - ${this.environment.toUpperCase()}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `🔥 CRITICAL ALERT - ${this.environment.toUpperCase()}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Message:* ${message}\n*Time:* ${new Date().toISOString()}`
            }
          }
        ]
      };

      if (details) {
        slackMessage.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``
          }
        });
      }

      await axios.post(this.webhookUrl, slackMessage);
    } catch (error) {
      logger.error('Failed to send critical alert', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async sendBusinessAlert(type: 'ORDER_FAILED' | 'USER_REGISTRATION_FAILED' | 'PRODUCT_CREATION_FAILED' | 'PAYMENT_FAILED' | 'PAYMENT_SUCCESS', data: any): Promise<void> {
    if (!this.webhookUrl) return;

    const icons = {
      ORDER_FAILED: '🛒❌',
      USER_REGISTRATION_FAILED: '👤❌', 
      PRODUCT_CREATION_FAILED: '📦❌',
      PAYMENT_FAILED: '💳❌',
      PAYMENT_SUCCESS: '💳✅'
    };

    try {
      const slackMessage = {
        text: `${icons[type]} ${type.replace('_', ' ')} - ${this.environment.toUpperCase()}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${icons[type]} ${type.replace('_', ' ')}`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Environment:* ${this.environment.toUpperCase()}`
              },
              {
                type: 'mrkdwn',
                text: `*Time:* ${new Date().toISOString()}`
              }
            ]
          }
        ]
      };

      if (data) {
        slackMessage.blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n\`\`\`${JSON.stringify(data, null, 2).substring(0, 500)}\`\`\``
          }
        });
      }

      await axios.post(this.webhookUrl, slackMessage);
    } catch (error) {
      logger.error('Failed to send business alert', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}

export const slackNotificationService = new SlackNotificationService();