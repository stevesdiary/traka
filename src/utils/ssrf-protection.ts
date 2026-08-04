import { URL } from 'url';
import logger from './logger.js';

/**
 * SSRF Protection Utility
 * Validates URLs to prevent Server-Side Request Forgery attacks
 */

// Blocked IP ranges (private networks, localhost, cloud metadata)
const BLOCKED_IP_RANGES = [
  /^127\./,                    // Localhost
  /^10\./,                     // Private network (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private network (172.16.0.0/12)
  /^192\.168\./,               // Private network (192.168.0.0/16)
  /^169\.254\./,               // Link-local (169.254.0.0/16)
  /^0\./,                      // Reserved
  /^224\./,                    // Multicast
  /^240\./,                    // Reserved
  /^255\.255\.255\.255$/,      // Broadcast
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',  // GCP metadata
  '169.254.169.254',           // AWS/Azure metadata
  'metadata',
  'internal',
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Allowed domains (whitelist for external APIs)
const ALLOWED_DOMAINS = [
  'nominatim.openstreetmap.org',  // Geocoding
  'photon.komoot.io',             // Geocoding fallback
  'api.brevo.com',                 // Email service
  'my.kudisms.net',                // SMS service
  'hooks.slack.com',               // Slack webhooks
];

export class SSRFProtection {
  /**
   * Validate URL to prevent SSRF attacks
   * @param urlString - URL to validate
   * @param allowedDomains - Optional additional allowed domains
   * @returns true if URL is safe, false otherwise
   */
  static isUrlSafe(urlString: string, allowedDomains: string[] = []): boolean {
    try {
      const url = new URL(urlString);

      // Check protocol
      if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
        logger.warn(`SSRF: Blocked protocol ${url.protocol}`);
        return false;
      }

      // Check hostname against blocked list
      const hostname = url.hostname.toLowerCase();
      if (BLOCKED_HOSTNAMES.includes(hostname)) {
        logger.warn(`SSRF: Blocked hostname ${hostname}`);
        return false;
      }

      // Check if hostname is an IP address
      if (this.isIPAddress(hostname)) {
        // Check against blocked IP ranges
        for (const range of BLOCKED_IP_RANGES) {
          if (range.test(hostname)) {
            logger.warn(`SSRF: Blocked IP range ${hostname}`);
            return false;
          }
        }
      }

      // Check against whitelist
      const allAllowedDomains = [...ALLOWED_DOMAINS, ...allowedDomains];
      const isAllowed = allAllowedDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        logger.warn(`SSRF: Domain not in whitelist ${hostname}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.warn(`SSRF: Invalid URL ${urlString}`);
      return false;
    }
  }

  /**
   * Check if string is an IP address
   */
  private static isIPAddress(hostname: string): boolean {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;
    
    return ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname);
  }

  /**
   * Sanitize URL by validating and returning safe URL
   * @throws Error if URL is not safe
   */
  static sanitizeUrl(urlString: string, allowedDomains: string[] = []): string {
    if (!this.isUrlSafe(urlString, allowedDomains)) {
      throw new Error('URL blocked by SSRF protection');
    }
    return urlString;
  }

  /**
   * Validate configuration URLs on startup
   */
  static validateConfigUrls(config: Record<string, string>): void {
    const urlFields = ['SLACK_WEBHOOK_URL', 'REDIS_URL', 'POSTGRES_URL'];
    
    for (const field of urlFields) {
      const url = config[field];
      if (url && url.startsWith('http')) {
        try {
          // Allow internal URLs for database connections
          const parsedUrl = new URL(url);
          logger.info(`Config URL validated: ${field} (${parsedUrl.hostname})`);
        } catch (error) {
          logger.warn(`Invalid config URL: ${field}`);
        }
      }
    }
  }
}
