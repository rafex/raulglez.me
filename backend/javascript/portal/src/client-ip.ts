import { isIP } from 'node:net';
import type { IncomingMessage } from 'node:http';

/**
 * HAProxy Ingress derives X-Real-IP from its PROXY-protocol peer and overwrites
 * any client value. The public Nginx proxy passes that header to this
 * cluster-internal service. Ignore X-Forwarded-For because it may contain
 * client-supplied values that are not trustworthy at this hop.
 */
export function getTrustedClientIp(req: IncomingMessage): string {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && isIP(realIp.trim())) return realIp.trim();
  return req.socket.remoteAddress ?? 'unknown';
}
