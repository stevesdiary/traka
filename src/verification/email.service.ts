export class EmailService {
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
            email: process.env.SMTP_FROM || ''
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
      console.log(response);
      if(response.ok || response.status === 200) {
        console.log(`Email sent successfully to ${to}`);
        return;
      }

      // console.log(`Email sent successfully to ${to}`);
    } catch (error: any) {
      console.error('Failed to send email:', error);
      throw error.message;
    }
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `;

    await this.sendEmail(email, 'TRAKA - Email Verification Code', htmlContent);
  }
}

// import nodemailer from 'nodemailer';

// export class EmailService {
//   private transporter;

//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST || 'smtp.gmail.com',
//       port: 587,
//       secure: false,
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS
//       }
//     });
//   }

//   async sendOTP(email: string, otp: string): Promise<void> {
//     const mailOptions = {
//       from: process.env.SMTP_FROM || 'noreply@traka.com',
//       to: email,
//       subject: 'TRAKA - Email Verification Code',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h2>Email Verification</h2>
//           <p>Your verification code is:</p>
//           <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
//             ${otp}
//           </div>
//           <p>This code will expire in 10 minutes.</p>
//           <p>If you didn't request this code, please ignore this email.</p>
//         </div>
//       `
//     };

//     await this.transporter.sendMail(mailOptions);
//   }
// }