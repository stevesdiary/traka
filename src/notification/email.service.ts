export class EmailNotificationService {
  private apiKey: string;
  private apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    if (!this.apiKey) {
      console.warn('Brevo API key not configured. Email not sent.');
      return;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify({
          sender: {
            name: 'TRAKA',
            email: process.env.SMTP_FROM || 'noreply@traka.com'
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Brevo API error: ${error.message || response.statusText}`);
      }

      console.log(`Email sent successfully to ${to}`);
    } catch (error: any) {
      console.error('Failed to send email:', error.message);
      throw error;
    }
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
