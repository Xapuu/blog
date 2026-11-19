---
title: "Validate Outbound URLs to Kill SSRF"
description: "Any backend endpoint that fetches a user-supplied URL (webhooks, avatar importers, link previews, PDF generators) can be abused to query internal services or cloud metadata (169.254.169.254). Resolve DNS first and block private IP ranges."
pubDate: 2026-12-21
tags: ["security", "backend", "nodejs", "ssrf"]
series: "advent-2026"
adventDay: 21
draft: true
---

Almost every modern web application has at least one feature where the backend fetches a URL provided by a user:

- Webhook test endpoints (`POST /api/webhooks/test`)
- Link preview / OpenGraph unfurlers (or tweet/card fetchers!)
- `"Import avatar from URL"`
- HTML-to-PDF / screenshot generators

If your backend blindly passes that user-supplied URL into `fetch(userUrl)` or `axios.get(userUrl)`, you have a textbook **Server-Side Request Forgery (SSRF)** vulnerability.

---

## What an Attacker Can Reach via SSRF

Your backend server sits inside your private VPC or container network. When an attacker supplies an internal URL, your server becomes their proxy to:

1. **Cloud Instance Metadata (`http://169.254.169.254/latest/meta-data/iam/security-credentials/` or GCP `metadata.google.internal`):** Stealing temporary IAM role credentials.
2. **Internal Microservices & Databases (`http://127.0.0.1:6379`, `http://internal-admin:8080/metrics`):** Hitting unauthenticated internal endpoints that assume network location equals trust.

---

## Why Naive String Checks (`!url.includes('127.0.0.1')`) Fail

Attackers trivially bypass string regexes using:

- **DNS Resolution to Private IPs (`localtest.me` -> `127.0.0.1`, or custom A records pointing to `169.254.169.254`)**
- **Alternate IP Representations (`http://2130706433/`, `http://0x7f000001/`, IPv6 `[::ffff:127.0.0.1]`)**
- **HTTP `302` Open Redirects:** Passing an allowed public URL that returns `302 Found -> Location: http://169.254.169.254/...`

---

## Hardened SSRF Guard in Node.js / TypeScript

Always validate the protocol (`https:` only), resolve DNS **before** connecting, block all private/loopback/link-local IPv4 and IPv6 ranges, and disable automatic HTTP redirects (`redirect: 'error'`):

```typescript
import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 0 ||
      parts[0] === 10 || // 10.0.0.0/8 (Private)
      parts[0] === 127 || // 127.0.0.0/8 (Loopback)
      (parts[0] === 169 && parts[1] === 254) || // 169.254.0.0/16 (Cloud Metadata / Link-local)
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || // 172.16.0.0/12
      (parts[0] === 192 && parts[1] === 168) || // 192.168.0.0/16
      (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) // 100.64.0.0/10 (Carrier NAT / Tailscale)
    );
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fe80:') ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') ||
      normalized.startsWith('::ffff:169.254.')
    );
  }
  return true;
}

export async function assertSafeOutboundUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS outbound requests are permitted');
  }

  const records = await dns.lookup(parsed.hostname, { all: true });
  if (records.length === 0) {
    throw new Error('Hostname could not be resolved');
  }

  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error(`Blocked SSRF attempt to reserved IP: ${record.address}`);
    }
  }

  return parsed;
}
```

### Key Takeaway for Day 21

Never call `fetch(userProvidedUrl)` without validating the protocol, resolving DNS to block `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, and `169.254.169.254`, and setting `redirect: 'error'` (plus enforcing IMDSv2 on AWS EC2).

---

## Social Summary (X & LinkedIn)

```text
Any backend endpoint that fetches a user-supplied URL—webhooks, link previews, avatar imports—is one unvalidated `fetch()` away from exposing cloud metadata (`169.254.169.254`) or internal services.

Checking `!url.includes('localhost')` won't stop DNS rebinding or HTTP 302 redirects.

Day 21/24 of the 2026 DevSec Advent Calendar: Killing SSRF in Node.js & TypeScript.
```
