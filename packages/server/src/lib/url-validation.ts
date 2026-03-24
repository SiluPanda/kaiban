/**
 * Validates that a URL is safe for outbound requests (webhook/notification delivery).
 * Blocks private IPs, localhost, and metadata endpoints to prevent SSRF.
 */
export function validateExternalUrl(urlStr: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, reason: 'Invalid URL' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, reason: 'Only http and https protocols are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return { valid: false, reason: 'Localhost URLs are not allowed' };
  }

  // Block private IP ranges
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p))) {
    // 10.0.0.0/8
    if (parts[0] === 10) return { valid: false, reason: 'Private IP addresses are not allowed' };
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return { valid: false, reason: 'Private IP addresses are not allowed' };
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return { valid: false, reason: 'Private IP addresses are not allowed' };
    // 169.254.0.0/16 (link-local / cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return { valid: false, reason: 'Link-local addresses are not allowed' };
  }

  return { valid: true };
}
