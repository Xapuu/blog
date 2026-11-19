---
title: "Validate Outbound URLs to Kill SSRF"
description: "Any backend endpoint that fetches a user-supplied URL (webhooks, avatar importers, link previews, PDF generators) can be abused to query internal services or cloud metadata (169.254.169.254). Pin resolved IPs at connect time to stop SSRF and DNS rebinding."
pubDate: 2026-12-21
tags: ["security", "backend", "nodejs", "ssrf"]
series: "advent-2026"
adventDay: 21
draft: true
socialSummary: |
  Any backend endpoint that fetches a user-supplied URL (webhooks, link previews, avatar imports) is one unvalidated `fetch()` away from exposing cloud metadata (`169.254.169.254`) or internal services.

  Checking `!url.includes('localhost')`, or even running `dns.lookup()` before calling `fetch()`, won't stop DNS rebinding unless you pin the validated IP at socket-connect time.

  Day 21/24 of the 2026 DevSec Advent Calendar: killing SSRF and DNS rebinding in Node.js & TypeScript.
---

Almost every modern web application has at least one feature where the backend fetches a URL provided by a user:

- Webhook test endpoints (`POST /api/webhooks/test`)
- Link preview / OpenGraph unfurlers
- `"Import avatar from URL"`
- HTML-to-PDF / screenshot generators ([Day 22](/blog/advent-day-22-headless-chromium-containers))

If your backend blindly passes that user-supplied URL into `fetch(userUrl)` or `axios.get(userUrl)`, you have a textbook **Server-Side Request Forgery (SSRF)** vulnerability.

> **Real-World Receipt:** SSRF against cloud Instance Metadata Services (`169.254.169.254`) has powered some of the most expensive cloud breaches on record (from Capital One's AWS IAM credential theft to recurring webhook and PDF-renderer compromises), turning a single unvalidated outbound HTTP request into full cloud account access.

---

## Why Naive String Checks (and Separate `dns.lookup()` Calls) Fail

Attackers trivially bypass `!url.includes('127.0.0.1')` and naive pre-flight checks using:

- **Alternate IP Representations:** `http://2130706433/`, `http://0x7f000001/`, or IPv4-mapped IPv6 (`http://[::ffff:169.254.169.254]/`, which `URL` normalizes to hex `[::ffff:a9fe:a9fe]`).
- **HTTP `302` Open Redirects:** Passing an allowed public URL that returns `302 Found -> Location: http://169.254.169.254/...`.
- **DNS Rebinding (TOCTOU):** If you call `dns.lookup(host)` first and then call `fetch(url)`, `fetch()` performs a **second** DNS lookup. An attacker with a 0-second TTL DNS server returns a public IP on lookup #1 and `169.254.169.254` on lookup #2.

---

## Hardened, DNS-Rebinding-Safe SSRF Guard in Node.js

To defeat DNS rebinding, validate the resolved IP **inside the HTTP client's socket `lookup` hook** so the exact IP you validated is the exact IP `fetch()` connects to, while disabling redirects (`redirect: 'error'`) and enforcing timeouts:

```typescript
import dns from 'node:dns';
import net from 'node:net';
import { Agent } from 'undici';

function isBlockedIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || // 0.0.0.0/8 ("this" network)
    a === 10 || // 10.0.0.0/8 (Private)
    a === 127 || // 127.0.0.0/8 (Loopback)
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 (CGNAT / Tailscale)
    (a === 169 && b === 254) || // 169.254.0.0/16 (Cloud Metadata / Link-local)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 (Private)
    (a === 192 && b === 0) || // 192.0.0.0/24 (IETF Protocol Assignments)
    (a === 192 && b === 168) || // 192.168.0.0/16 (Private)
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 (Benchmarking)
    a >= 224 // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved
  );
}

function extractMappedIPv4(ipv6: string): string | null {
  const lower = ipv6.toLowerCase();
  // Dotted form: ::ffff:127.0.0.1
  if (lower.startsWith('::ffff:') && net.isIPv4(lower.slice(7))) {
    return lower.slice(7);
  }
  // Canonical hex form: ::ffff:7f00:1 or ::ffff:a9fe:a9fe
  const hexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMatch) {
    const hi = parseInt(hexMatch[1], 16);
    const lo = parseInt(hexMatch[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.replace(/^\[|\]$/g, '').split('%')[0];
  if (net.isIPv4(ip)) return isBlockedIPv4(ip);
  if (net.isIPv6(ip)) {
    const mapped = extractMappedIPv4(ip);
    if (mapped) return isBlockedIPv4(mapped);
    const lower = ip.toLowerCase();
    return (
      lower === '::1' ||
      lower === '::' ||
      /^fe[89ab][0-9a-f]:/.test(lower) || // fe80::/10 Link-local
      lower.startsWith('fc') || // fc00::/7 Unique local
      lower.startsWith('fd') ||
      lower.startsWith('ff') // ff00::/8 Multicast
    );
  }
  return true; // Fail closed on unparseable addresses
}

// Validate resolved IPs inside undici's lookup hook so fetch() cannot re-resolve (blocks DNS rebinding!)
const ssrfSafeDispatcher = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, []);
        if (!addresses.length) return callback(new Error('DNS lookup returned no records'), []);
        for (const entry of addresses) {
          if (isPrivateOrReservedIp(entry.address)) {
            return callback(new Error(`Blocked SSRF target IP: ${entry.address}`), []);
          }
        }
        return callback(null, addresses);
      });
    },
  },
});

export async function safeOutboundFetch(rawUrl: string): Promise<Response> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS outbound requests are permitted');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Embedded URL credentials are not permitted');
  }

  return fetch(parsed, {
    redirect: 'error', // Never follow 301/302 redirects blindly to internal hosts
    signal: AbortSignal.timeout(5_000),
    // @ts-expect-error undici dispatcher supported natively in Node.js fetch
    dispatcher: ssrfSafeDispatcher,
  });
}
```

> **Production Tip:** For complex workloads, combine a battle-tested IP range parser (`ipaddr.js`) with **AWS IMDSv2** (`HttpTokens: required`) and egress firewalling (`NetworkPolicy` or an outbound proxy) so defense-in-depth never relies on application code alone.

---

## Verify It in 60 Seconds

Test your outbound URL fetcher against the classic SSRF bypass vectors. Every single one must be rejected:

```typescript
const SSRF_PROBES = [
  'http://169.254.169.254/latest/meta-data/',
  'https://[::ffff:169.254.169.254]/',
  'https://[::ffff:7f00:1]/',
  'https://2130706433/',
  'https://localtest.me/', // Public DNS record resolving to 127.0.0.1
];
```

### Key Takeaway for Day 21

Never call `fetch(userProvidedUrl)` directly, and do not rely on a separate pre-flight `dns.lookup()` that leaves you open to DNS rebinding. Validate resolved IPs inside the HTTP client's socket `lookup` hook, handle hex IPv4-mapped IPv6 addresses, set `redirect: 'error'`, and enforce IMDSv2 on cloud instances.

---

## References

- [OWASP Server-Side Request Forgery (SSRF) Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [AWS EC2 Docs: Configure Instance Metadata Service Version 2 (IMDSv2)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
