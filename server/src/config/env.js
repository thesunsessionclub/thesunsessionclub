import dotenv from 'dotenv';
dotenv.config();

function splitCsv(value = '') {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: process.env.PORT || 4000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-please-change',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-please-change',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  corsOrigins: splitCsv(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || ''),
  siteUrl: process.env.SITE_URL || process.env.CORS_ORIGIN || 'http://localhost:4000',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  secureCookies: (process.env.SECURE_COOKIES || 'false') === 'true',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: (process.env.SMTP_SECURE || 'false') === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@sunsession.local',
  notificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_USER || '',
  smtpTlsRejectUnauthorized: (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true') === 'true',
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
  whatsappTemplateRequest: process.env.WHATSAPP_TEMPLATE_REQUEST || '',
  whatsappTemplateConfirm: process.env.WHATSAPP_TEMPLATE_CONFIRM || '',
  whatsappTemplateRemind: process.env.WHATSAPP_TEMPLATE_REMIND || '',
  whatsappTemplateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'es_MX',
  whatsappDefaultCountryCode: process.env.WHATSAPP_DEFAULT_COUNTRY || '',
};
