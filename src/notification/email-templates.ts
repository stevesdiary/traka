const BASE_URL = process.env.API_BASE_URL?.replace('/api', '') ?? 'https://traka.com';

const shell = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to TRAKA</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#0B0F19;padding:32px 40px;text-align:center;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">TRAKA</span>
              <span style="display:block;font-size:12px;color:#6B7280;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">Logistics · Simplified</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;line-height:1.6;">
                © ${new Date().getFullYear()} TRAKA Technologies Ltd. All rights reserved.<br/>
                This email was sent to you because you signed up for TRAKA.<br/>
                <a href="${BASE_URL}" style="color:#6B7280;text-decoration:none;">Visit our website</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const step = (number: string, icon: string, title: string, description: string) => `
  <tr>
    <td style="padding:12px 0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="48" valign="top">
            <div style="width:40px;height:40px;border-radius:10px;background:#F3F4F6;text-align:center;line-height:40px;font-size:18px;">${icon}</div>
          </td>
          <td style="padding-left:16px;vertical-align:top;">
            <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:#111827;">${number}. ${title}</p>
            <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.5;">${description}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
`;

const ctaButton = (label: string, href: string, color = '#0B0F19') => `
  <tr>
    <td align="center" style="padding-top:32px;">
      <a href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.2px;">${label}</a>
    </td>
  </tr>
`;

export const welcomeCustomerEmail = (firstName: string): string =>
  shell(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Welcome, ${firstName}! 👋</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.6;">
      Your TRAKA account is ready. You can now send packages across Nigeria — fast, tracked, and hassle-free.
    </p>

    <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;">Getting started</p>

    <table cellpadding="0" cellspacing="0" width="100%">
      ${step('1', '📦', 'Book a delivery', 'Tap "Send Package", enter the pickup and drop-off address, choose a package size, and get an instant quote.')}
      ${step('2', '🗺️', 'Track in real time', 'Follow your rider on a live map from the moment they pick up your package until it\'s delivered.')}
      ${step('3', '⭐', 'Rate your experience', 'After each delivery, rate your rider and help us maintain quality across the network.')}
      ${step('4', '👤', 'Complete your profile', 'Add a profile photo and save your frequent addresses to make future bookings even faster.')}
    </table>

    ${ctaButton('Open TRAKA', BASE_URL)}
  `);

export const welcomeBusinessEmail = (contactPerson: string, businessName: string): string =>
  shell(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Welcome to TRAKA, ${contactPerson}!</h1>
    <p style="margin:0 0 4px;font-size:13px;color:#6B7280;">${businessName} is now on TRAKA.</p>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.6;">
      Your business account is under review. Once approved, you'll unlock high-volume delivery tools built for growing businesses.
    </p>

    <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;">What to expect</p>

    <table cellpadding="0" cellspacing="0" width="100%">
      ${step('1', '✅', 'Account approval', 'Our team will review your business details within 24 hours. You\'ll get an email once you\'re approved.')}
      ${step('2', '👥', 'Invite your team', 'Add staff members and assign roles so your team can book and track deliveries independently.')}
      ${step('3', '🚚', 'Bulk shipments', 'Upload a CSV of recipients and dispatch multiple deliveries in one go — perfect for e-commerce fulfilment.')}
      ${step('4', '📊', 'Business dashboard', 'View delivery history, spending analytics, and rider performance across your entire operation.')}
      ${step('5', '🔗', 'API integration', 'Connect TRAKA directly to your store or ERP using our REST API and webhooks.')}
    </table>

    <div style="margin-top:28px;background:#FEF3C7;border-radius:8px;padding:16px 20px;">
      <p style="margin:0;font-size:14px;color:#92400E;">
        <strong>⏳ Pending approval —</strong> you'll receive a confirmation email within 24 hours. Feel free to explore the dashboard in the meantime.
      </p>
    </div>

    ${ctaButton('Go to Dashboard', BASE_URL, '#1D4ED8')}
  `);

export const trackingStartedEmail = (
  recipientName: string,
  trackingNumber: string,
  senderName: string,
  deliveryAddress: string,
  trackingUrl: string
): string =>
  shell(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Your package is on the way! 🚀</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.6;">
      Hi ${recipientName}, a package from <strong>${senderName}</strong> has been picked up and is heading your way.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#F9FAFB;border-radius:10px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;">Delivery details</p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7280;width:120px;">Tracking No.</td>
              <td style="padding:6px 0;font-size:14px;font-weight:700;color:#111827;letter-spacing:1px;">${trackingNumber}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#6B7280;">Delivering to</td>
              <td style="padding:6px 0;font-size:14px;color:#111827;">${deliveryAddress}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('Track My Package 🗺️', trackingUrl, '#FF6B00')}

    <p style="margin:28px 0 0;font-size:13px;color:#9CA3AF;text-align:center;">Tap the button above to see your rider\'s live location.</p>
  `);

export const welcomeRiderEmail = (firstName: string): string =>
  shell(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">You're in, ${firstName}! 🏍️</h1>
    <p style="margin:0 0 28px;font-size:15px;color:#6B7280;line-height:1.6;">
      Welcome to the TRAKA rider network. Complete the steps below to start receiving delivery jobs and earning on your own schedule.
    </p>

    <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;">Your onboarding checklist</p>

    <table cellpadding="0" cellspacing="0" width="100%">
      ${step('1', '📋', 'Complete verification', 'Upload your government ID and a clear photo of yourself. Verification usually takes less than 12 hours.')}
      ${step('2', '🟢', 'Go online', 'Once verified, toggle your status to "Online" in the app to start receiving nearby delivery requests.')}
      ${step('3', '📍', 'Accept & navigate', 'Accept a job, pick up the package, and follow the in-app navigation to the delivery address.')}
      ${step('4', '💳', 'Get paid', 'Earnings are credited to your TRAKA wallet after every successful delivery. Withdraw anytime to your bank.')}
    </table>

    <div style="margin-top:28px;background:#ECFDF5;border-radius:8px;padding:16px 20px;">
      <p style="margin:0;font-size:14px;color:#065F46;">
        <strong>💡 Tip —</strong> riders who maintain a 4.5+ rating get priority access to higher-value deliveries and bonuses.
      </p>
    </div>

    ${ctaButton('Open Rider App', BASE_URL, '#059669')}
  `);
