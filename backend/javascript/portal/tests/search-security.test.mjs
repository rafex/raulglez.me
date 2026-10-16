import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTrustedClientIp } from '../dist/client-ip.js';
import { allowSearchRequest } from '../dist/search-security.js';

test('client IP comes from the proxy-overwritten X-Real-IP, not X-Forwarded-For', () => {
  const req = {
    headers: {
      'x-real-ip': '198.51.100.10',
      'x-forwarded-for': '203.0.113.200, 198.51.100.10',
    },
    socket: { remoteAddress: '10.0.0.8' },
  };
  assert.equal(getTrustedClientIp(req), '198.51.100.10');

  req.headers['x-real-ip'] = 'not-an-ip';
  assert.equal(getTrustedClientIp(req), '10.0.0.8');
});

test('search limiter allows 20 requests per IP in a minute and resets at the window boundary', () => {
  const ip = 'search-limit-test-unique';
  for (let i = 0; i < 20; i++) assert.equal(allowSearchRequest(ip, 1_000), true);
  assert.equal(allowSearchRequest(ip, 1_000), false);
  assert.equal(allowSearchRequest(ip, 61_000), true);
  assert.equal(allowSearchRequest(`${ip}-other`, 1_000), true);
});
