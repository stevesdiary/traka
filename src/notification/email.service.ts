import config from '../config/environment.js';
import logger from '../utils/logger.js';

export type EmailAddress = { email: string; name?: string };

export type EmailPayload = {
  sender?: EmailAddress;
  to: EmailAddress[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: EmailAddress;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  tags?: string[];
};

export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

type RecipientInput = string | EmailAddress | Array<string | EmailAddress>;

type SendEmailOptions = {
  sender?: EmailAddress;
  replyTo?: EmailAddress;
  textContent?: string;
  cc?: RecipientInput;
  bcc?: RecipientInput;
  tags?: string[];
};

type BrevoProviderOptions = {
  apiKey: string;
  apiUrl?: string;
  defaultSender: EmailAddress;
  timeoutMs?: number;
};

const DEFAULT_API_URL = 'https://api.brevo.com/v3/smtp/email';
const DEFAULT_TIMEOUT_MS = 15000;

const normalizeRecipient = (recipient: string | EmailAddress): EmailAddress => {
  if (typeof recipient === 'string') {
    return { email: recipient };
  }
  return recipient;
};

const normalizeRecipients = (recipients: RecipientInput): EmailAddress[] => {
  const list = Array.isArray(recipients) ? recipients : [recipients];
  return list
    .filter(recipient => Boolean(recipient))
    .map(recipient => normalizeRecipient(recipient as string | EmailAddress))
    .filter(item => item.email);
};

const normalizeOptionalRecipients = (recipients?: RecipientInput): EmailAddress[] | undefined => {
  if (!recipients) return undefined;
  const list = normalizeRecipients(recipients);
  return list.length > 0 ? list : undefined;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const parseJson = (value: string): Record<string, any> | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, any>;
  } catch {
    return null;
  }
};

class BrevoEmailProvider implements EmailProvider {
  private apiKey: string;
  private apiUrl: string;
  private defaultSender: EmailAddress;
  private timeoutMs: number;

  constructor(options: BrevoProviderOptions) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl ?? DEFAULT_API_URL;
    this.defaultSender = options.defaultSender;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.apiKey) {
      logger.warn('Brevo API key not configured. Email not sent.');
      return;
    }

    if (!payload.to?.length) {
      throw new Error('Email payload "to" is required.');
    }

    if (!payload.subject || !payload.htmlContent) {
      throw new Error('Email payload must include "subject" and "htmlContent".');
    }

    const body: Record<string, any> = {
      sender: payload.sender ?? this.defaultSender,
      to: payload.to,
      subject: payload.subject,
      htmlContent: payload.htmlContent
    };

    if (payload.textContent) body.textContent = payload.textContent;
    if (payload.replyTo) body.replyTo = payload.replyTo;
    if (payload.cc?.length) body.cc = payload.cc;
    if (payload.bcc?.length) body.bcc = payload.bcc;
    if (payload.tags?.length) body.tags = payload.tags;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const responseText = await response.text();

      if (!response.ok) {
        const errorJson = parseJson(responseText);
        const detail =
          (errorJson?.message as string | undefined) ||
          (errorJson?.error as string | undefined) ||
          responseText ||
          response.statusText;
        const errorMessage = `Brevo API error (${response.status}): ${detail}`;
        logger.error('Brevo email send failed', {
          status: response.status,
          error: errorMessage,
          to: payload.to.map(item => item.email),
          subject: payload.subject
        });
        throw new Error(errorMessage);
      }

      const responseJson = parseJson(responseText);
      logger.info('Email sent successfully', {
        to: payload.to.map(item => item.email),
        subject: payload.subject,
        messageId: responseJson?.messageId
      });
    } catch (error) {
      const message = toErrorMessage(error);
      logger.error('Failed to send email', {
        error: message,
        to: payload.to.map(item => item.email),
        subject: payload.subject
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class EmailNotificationService {
  private provider: EmailProvider;
  private defaultSender: EmailAddress;

  constructor(options?: { provider?: EmailProvider; defaultSender?: EmailAddress }) {
    this.defaultSender = options?.defaultSender ?? {
      name: config.email.fromName,
      email: config.email.fromEmail
    };

    this.provider =
      options?.provider ??
      new BrevoEmailProvider({
        apiKey: config.email.brevoApiKey,
        defaultSender: this.defaultSender
      });
  }

  async send(payload: EmailPayload): Promise<void> {
    const mergedPayload: EmailPayload = {
      ...payload,
      sender: payload.sender ?? this.defaultSender
    };

    await this.provider.send(mergedPayload);
  }

  async sendEmail(
    to: RecipientInput,
    subject: string,
    htmlContent: string,
    options: SendEmailOptions = {}
  ): Promise<void> {
    const payload: EmailPayload = {
      sender: options.sender ?? this.defaultSender,
      to: normalizeRecipients(to),
      subject,
      htmlContent,
      textContent: options.textContent,
      replyTo: options.replyTo,
      cc: normalizeOptionalRecipients(options.cc),
      bcc: normalizeOptionalRecipients(options.bcc),
      tags: options.tags
    };

    await this.send(payload);
  }

  async sendNotification(email: string, title: string, message: string): Promise<void> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${title}</h2>
        <p>${message}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from TRAKA. Please do not reply.</p>
      </div>
    `;

    await this.sendEmail(email, title, htmlContent);
  }
}
