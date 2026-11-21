import nodemailer from 'nodemailer';
import { getDb } from '../db';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export interface FormSubmissionField {
  label: string;
  value: any;
  type?: string;
  name?: string;
}

export interface FormSubmissionPayload {
  formId?: string;
  formTitle: string;
  toEmail: string | string[];
  subject?: string;
  fields: FormSubmissionField[];
  ip?: string;
}

// Retrieve SMTP settings from DB
export async function getSmtpSettings(): Promise<SmtpConfig> {
  const db = await getDb();
  const row = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', ['smtp']);
  if (!row) {
    return {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromEmail: 'info@irepair-mobiles.co.uk',
      fromName: 'iRepair Mobiles UK',
      enabled: false,
    };
  }

  try {
    const parsed = JSON.parse(row.value_json);
    return {
      host: parsed.host || '',
      port: Number(parsed.port) || 587,
      secure: Boolean(parsed.secure),
      user: parsed.user || '',
      pass: parsed.pass || '',
      fromEmail: parsed.fromEmail || 'info@irepair-mobiles.co.uk',
      fromName: parsed.fromName || 'iRepair Mobiles UK',
      enabled: Boolean(parsed.enabled),
    };
  } catch {
    return {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromEmail: 'info@irepair-mobiles.co.uk',
      fromName: 'iRepair Mobiles UK',
      enabled: false,
    };
  }
}

// Retrieve general site settings (for logo, address, name)
export async function getGeneralSettings(): Promise<Record<string, any>> {
  try {
    const db = await getDb();
    const row = db.get<{ value_json: string }>('SELECT value_json FROM site_settings WHERE key = ?', ['general']);
    return row ? JSON.parse(row.value_json) : {};
  } catch {
    return {};
  }
}

// Create Nodemailer Transporter
export async function createTransporter(customConfig?: Partial<SmtpConfig>) {
  const config = customConfig ? { ...(await getSmtpSettings()), ...customConfig } : await getSmtpSettings();

  if (!config.host || !config.user) {
    throw new Error('SMTP host and user must be configured in settings');
  }

  const transportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports (uses STARTTLS)
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false, // Prevent issues with self-signed or intermediate certs
    },
  } as any;

  return nodemailer.createTransport(transportOptions);
}

// Generate Branded HTML Email Template
export function generateBrandedEmailHtml(options: {
  title: string;
  subtitle?: string;
  fields: FormSubmissionField[];
  siteName: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  timestamp?: string;
}): string {
  const {
    title,
    subtitle,
    fields,
    siteName,
    logoUrl,
    phone,
    address,
    timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }),
  } = options;

  // Use full logo URL or SVG fallback display
  const baseUrl = process.env.APP_URL || 'https://irepair-mobiles.co.uk';
  const displayLogo = logoUrl
    ? logoUrl.startsWith('http')
      ? logoUrl
      : `${baseUrl.replace(/\/+$/, '')}/${logoUrl.replace(/^\/+/, '')}`
    : `${baseUrl}/src/assets/images/irepair-logo.svg`;

  const rowsHtml = fields
    .map((field) => {
      let valStr = '';
      if (field.value === null || field.value === undefined) {
        valStr = '<em style="color:#94a3b8;">None provided</em>';
      } else if (typeof field.value === 'boolean') {
        valStr = field.value ? 'Yes' : 'No';
      } else if (Array.isArray(field.value)) {
        valStr = field.value.join(', ');
      } else {
        valStr = String(field.value).replace(/\n/g, '<br/>');
      }

      return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #334155; width: 35%; vertical-align: top; font-size: 13px; background-color: #fafafa;">
            ${escapeHtml(field.label || field.name || 'Field')}
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; width: 65%; font-size: 14px; line-height: 1.5;">
            ${valStr}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Container Box -->
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Top Accent Stripe -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #DF0C88 0%, #ff4b91 50%, #8b5cf6 100%);"></td>
          </tr>

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background-color: #ffffff; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block;">
                      <img src="${displayLogo}" alt="${escapeHtml(siteName)}" height="38" style="height: 38px; width: auto; max-width: 200px; display: block; border: 0;" />
                    </div>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; background-color: #fdf2f8; color: #DF0C88; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Website Inquiry
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Title & Intro -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px;">
                ${escapeHtml(title)}
              </h1>
              ${subtitle ? `<p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">${escapeHtml(subtitle)}</p>` : ''}
              <div style="display: inline-block; font-size: 12px; color: #64748b; background-color: #f1f5f9; padding: 4px 10px; border-radius: 6px; margin-bottom: 8px;">
                📅 Received: <strong>${timestamp}</strong>
              </div>
            </td>
          </tr>

          <!-- Submitted Form Fields Table -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; border-collapse: separate;">
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #334155;">
                ${escapeHtml(siteName)}
              </p>
              ${address ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">${escapeHtml(address)}</p>` : ''}
              ${phone ? `<p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b;">Support: <a href="tel:${escapeHtml(phone)}" style="color: #DF0C88; text-decoration: none; font-weight: 600;">${escapeHtml(phone)}</a></p>` : ''}
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
                This notification was generated automatically from your website form widget.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Escape HTML characters
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Test SMTP Connection
export async function testSmtp(targetEmail: string, customConfig?: Partial<SmtpConfig>): Promise<{ success: boolean; message: string; messageId?: string }> {
  const config = customConfig ? { ...(await getSmtpSettings()), ...customConfig } : await getSmtpSettings();

  if (!config.host) {
    throw new Error('SMTP Host server is required');
  }
  if (!config.user) {
    throw new Error('SMTP Username / Email is required');
  }
  if (!targetEmail) {
    throw new Error('Test recipient email address is required');
  }

  const transporter = await createTransporter(config);

  // Verify connection configuration
  await transporter.verify();

  const general = await getGeneralSettings();
  const siteName = general.siteName || 'iRepair Mobiles UK';
  const logoUrl = general.logoUrl || '/src/assets/images/irepair-logo.svg';

  const html = generateBrandedEmailHtml({
    title: 'SMTP Connection Test Successful',
    subtitle: 'Your email server has been correctly connected to iRepair Mobiles staff dashboard.',
    fields: [
      { label: 'SMTP Server', value: config.host },
      { label: 'SMTP Port', value: String(config.port) },
      { label: 'Encryption', value: config.secure ? 'SSL/TLS (Port 465)' : 'STARTTLS (Port 587)' },
      { label: 'Sender Address', value: `${config.fromName} <${config.fromEmail}>` },
      { label: 'Recipient Verified', value: targetEmail },
      { label: 'Status', value: 'Ready for live website form submissions' },
    ],
    siteName,
    logoUrl,
    phone: general.phone,
    address: general.address,
  });

  const mailOptions = {
    from: `"${config.fromName || siteName}" <${config.fromEmail || config.user}>`,
    to: targetEmail,
    subject: `✅ [SMTP Verified] Test Email from ${siteName}`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);

  return {
    success: true,
    message: `Test email successfully dispatched to ${targetEmail}`,
    messageId: info.messageId,
  };
}

// Send Form Submission
export async function processFormSubmission(payload: FormSubmissionPayload): Promise<{
  success: boolean;
  emailSent: boolean;
  recipientsCount: number;
  message: string;
  error?: string;
}> {
  const db = await getDb();
  const now = new Date().toISOString();
  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Parse recipients list
  let recipients: string[] = [];
  if (Array.isArray(payload.toEmail)) {
    recipients = payload.toEmail;
  } else if (typeof payload.toEmail === 'string') {
    recipients = payload.toEmail
      .split(/[,;\n\s]+/)
      .map((e) => e.trim())
      .filter((e) => Boolean(e) && e.includes('@'));
  }

  const smtp = await getSmtpSettings();
  const general = await getGeneralSettings();
  const siteName = general.siteName || 'iRepair Mobiles UK';
  const logoUrl = general.logoUrl || '/src/assets/images/irepair-logo.svg';

  // Fallback recipient if none provided in widget settings
  if (recipients.length === 0) {
    const fallback = general.email || smtp.fromEmail || 'info@irepair-mobiles.co.uk';
    recipients = [fallback];
  }

  let emailSent = false;
  let emailError: string | null = null;

  // Attempt to send email if SMTP is configured
  if (smtp.host && smtp.user) {
    try {
      const transporter = await createTransporter(smtp);
      const emailSubject = payload.subject || `New Submission: ${payload.formTitle || 'Website Contact Form'}`;

      const html = generateBrandedEmailHtml({
        title: payload.formTitle || 'Website Form Inquiry',
        subtitle: `Submitted by a website visitor via form widget`,
        fields: payload.fields,
        siteName,
        logoUrl,
        phone: general.phone,
        address: general.address,
        timestamp: new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }),
      });

      await transporter.sendMail({
        from: `"${smtp.fromName || siteName}" <${smtp.fromEmail || smtp.user}>`,
        to: recipients.join(', '),
        subject: emailSubject,
        html,
      });

      emailSent = true;
    } catch (err: any) {
      console.error('Failed to send form submission email:', err.message);
      emailError = err.message || 'SMTP delivery failure';
    }
  } else {
    emailError = 'SMTP server not configured in dashboard settings';
  }

  // Save submission to database for audit and dashboard records
  try {
    db.run(
      `INSERT INTO form_submissions (
        id, form_id, form_title, recipients_json, fields_json, email_status, email_error, ip, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submissionId,
        payload.formId || 'form_widget',
        payload.formTitle || 'Contact Form',
        JSON.stringify(recipients),
        JSON.stringify(payload.fields),
        emailSent ? 'sent' : 'logged',
        emailError,
        payload.ip || '127.0.0.1',
        now,
      ]
    );
  } catch (dbErr: any) {
    console.error('Failed to save submission to database:', dbErr);
  }

  return {
    success: true,
    emailSent,
    recipientsCount: recipients.length,
    message: emailSent
      ? `Submission received and dispatched to ${recipients.length} recipient(s).`
      : `Submission recorded successfully. (Note: Email delivery will activate once SMTP details are configured in Settings).`,
    error: emailError || undefined,
  };
}

export interface JobApplicationEmailPayload {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  educationLevel: string;
  salaryExpectations: number | string;
  jobTitle: string;
  jobLocation: string;
  applicationId: string;
  submittedAt?: string;
  attachments?: {
    filename: string;
    path: string;
    contentType?: string;
  }[];
}

export async function sendJobApplicationEmail(payload: JobApplicationEmailPayload): Promise<{
  success: boolean;
  emailSent: boolean;
  message: string;
  error?: string;
}> {
  const targetEmail = 'info@irepair-mobiles.co.uk';
  const smtp = await getSmtpSettings();
  const general = await getGeneralSettings();
  const siteName = general.siteName || 'iRepair Mobiles UK';
  const logoUrl = general.logoUrl || '/src/assets/images/irepair-logo.svg';

  const recipients = [targetEmail];
  if (smtp.fromEmail && smtp.fromEmail.includes('@') && !recipients.includes(smtp.fromEmail)) {
    // Also include if different
  }

  let emailSent = false;
  let emailError: string | null = null;

  const fields: FormSubmissionField[] = [
    { label: 'Candidate Name', value: payload.candidateName },
    { label: 'Candidate Email', value: `<a href="mailto:${escapeHtml(payload.candidateEmail)}" style="color:#DF0C88; font-weight:700;">${escapeHtml(payload.candidateEmail)}</a>` },
    { label: 'Phone Number', value: `<a href="tel:${escapeHtml(payload.candidatePhone)}" style="color:#0f172a; font-weight:600;">${escapeHtml(payload.candidatePhone)}</a>` },
    { label: 'Applied Position', value: `<strong>${escapeHtml(payload.jobTitle)}</strong>` },
    { label: 'Store Location', value: escapeHtml(payload.jobLocation) },
    { label: 'Education Level', value: escapeHtml(payload.educationLevel) },
    { label: 'Salary Expectations', value: `£${Number(payload.salaryExpectations).toLocaleString('en-GB')} / year` },
    { label: 'Application ID', value: `<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:12px;">${escapeHtml(payload.applicationId)}</code>` },
    {
      label: 'Attached Documents',
      value: payload.attachments && payload.attachments.length > 0
        ? payload.attachments.map(a => `📎 <strong>${escapeHtml(a.filename)}</strong> (Attached directly to this email)`).join('<br/>')
        : 'No files attached',
    },
  ];

  if (smtp.host && smtp.user) {
    try {
      const transporter = await createTransporter(smtp);
      const subject = `📥 New Job Application: ${payload.candidateName} for ${payload.jobTitle} (${payload.jobLocation})`;

      const html = generateBrandedEmailHtml({
        title: `Job Application: ${payload.jobTitle}`,
        subtitle: `New application received for ${payload.jobLocation} branch. Resume & details attached below.`,
        fields,
        siteName,
        logoUrl,
        phone: general.phone,
        address: general.address,
        timestamp: payload.submittedAt || new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }),
      });

      await transporter.sendMail({
        from: `"${smtp.fromName || siteName}" <${smtp.fromEmail || smtp.user}>`,
        to: recipients.join(', '),
        replyTo: payload.candidateEmail,
        subject,
        html,
        attachments: payload.attachments || [],
      });

      emailSent = true;
    } catch (err: any) {
      console.error('Failed to dispatch job application email:', err.message);
      emailError = err.message || 'SMTP delivery failure';
    }
  } else {
    emailError = 'SMTP host not configured in site settings';
    console.log(`[Job Application Received] Logged to database for ${payload.candidateName} (${payload.jobTitle}). SMTP not configured.`);
  }

  return {
    success: true,
    emailSent,
    message: emailSent
      ? `Application received and dispatched with attachments to ${targetEmail}`
      : `Application successfully recorded in database. (Email queued for ${targetEmail})`,
    error: emailError || undefined,
  };
}

