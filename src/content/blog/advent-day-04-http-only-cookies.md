---
title: "Stop Storing Auth Tokens in localStorage"
description: "Any XSS bug or poisoned npm dependency can read localStorage and sessionStorage in a single line of JS. Store session tokens in HttpOnly, Secure, SameSite cookies instead."
pubDate: 2026-12-04
tags: ["security", "auth", "frontend", "cookies"]
series: "advent-2026"
adventDay: 4
draft: true
socialSummary: |
  `JSON.stringify(localStorage)` is the first line of code in almost every client-side supply-chain payload.

  If your JWTs or refresh tokens live in localStorage, a single XSS bug or compromised npm dependency equals instant, persistent account takeover.

  Day 04/24 of the 2026 DevSec Advent Calendar: moving session tokens to `__Host-` prefixed, HttpOnly, Secure, SameSite cookies.
---

Open the DevTools Application tab on a dozen modern SaaS dashboards and you will still find raw JWT `access_token` and `refresh_token` strings sitting in `window.localStorage`.

Why do teams still do it? Because `localStorage.getItem('token')` plus `Authorization: Bearer ...` feels effortless during initial prototyping.

> **Real-World Receipt:** Client-side credential harvesters delivered via poisoned npm dependencies and compromised third-party analytics scripts routinely execute `Object.entries(localStorage)` as their very first instruction, exfiltrating long-lived JWTs and refresh tokens before the user notices anything wrong.

---

## Why `localStorage` Is a Single Point of Failure

`localStorage` and `sessionStorage` are synchronous JavaScript key-value stores with **zero isolation from scripts executing in your origin**:

1. **One XSS bug = Offline Account Takeover:** Any DOM XSS vulnerability, compromised CDN script, or malicious npm transitive package can read `localStorage` with `JSON.stringify(localStorage)` and replay the token from the attacker's own infrastructure.
2. **Persistence After Tab Close:** Unlike in-memory variables, `localStorage` persists on disk across browser restarts until explicitly cleared.
3. **Unprotected Refresh Tokens:** When a refresh token is stored in `localStorage`, an attacker does not just get a 15-minute window. They can mint new access tokens indefinitely from anywhere in the world.

---

## The Hardened Alternative: `__Host-` `HttpOnly`, `Secure`, `SameSite` Cookies

When your backend issues session identifiers or refresh tokens via an `HttpOnly` cookie, the browser automatically attaches the cookie to matching HTTP requests while **completely hiding it from `document.cookie` and all JavaScript code**.

> **Important Security Model Note:** `HttpOnly` stops an attacker from *exfiltrating* your session token for offline replay. While malicious JS is actively executing in the user's tab, it can still trigger authenticated `fetch()` calls. That is why `HttpOnly` cookies must be paired with a strict CSP ([Day 01](/blog/advent-day-01-csp-connect-src)) and sensitive route isolation ([Day 02](/blog/advent-day-02-isolate-sensitive-routes)).

### Production Cookie Configuration (Node.js / NestJS / Express)

```typescript
import type { Response } from 'express';

export function setHardenedSessionCookie(res: Response, sessionToken: string): void {
  res.cookie('__Host-session', sessionToken, {
    httpOnly: true,   // Invisible to document.cookie and XSS payloads
    secure: true,     // Sent only over HTTPS
    sameSite: 'lax',  // Blocks cross-site POST CSRF without breaking inbound links from email/Slack
    path: '/',        // Required for __Host- prefix
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  });
}
```

### `SameSite=Lax` vs. `SameSite=Strict` in Production

- **`SameSite=Strict`** blocks cookies on *all* cross-site navigations. Clicking a link to `https://app.example.com/tickets/42` from Slack, Jira, or an email drops the user back on `/login`.
- **`SameSite=Lax`** preserves top-level `GET` navigation links while blocking cross-site `POST`/`PUT`/`DELETE` form submissions. Pair `SameSite=Lax` with a CSRF token or `Sec-Fetch-Site` header check on state-changing routes, and reserve `SameSite=Strict` for elevated step-up actions (like billing changes or API key creation).

### Why the `__Host-` Cookie Prefix Matters

Prefixing your cookie name with `__Host-` instructs the browser to enforce three strict invariants automatically:

- The cookie **must** be set with the `Secure` attribute over HTTPS.
- The cookie **must not** include a `Domain` attribute (preventing a compromised subdomain like `promo.example.com` from overwriting or tossing cookies into `app.example.com`).
- The `Path` attribute **must** be `/`.

---

## Verify It in 60 Seconds

Log into your application, open DevTools Console, and verify that neither `localStorage` nor `document.cookie` exposes your session or refresh token:

```javascript
console.log('localStorage keys:', Object.keys(localStorage));
console.log('JS-visible cookies:', document.cookie);
// Your session / refresh token must NOT appear in either output!
```

### Key Takeaway for Day 04

Never store raw JWTs, session IDs, or refresh tokens in `localStorage` or `sessionStorage`. Use `__Host-` prefixed, `HttpOnly; Secure; SameSite=Lax` (or `Strict` for step-up flows) cookies, or a Backend-for-Frontend token handler, so JavaScript never touches long-lived credentials.

---

## References

- [MDN: Using HTTP Cookies (`HttpOnly`, `SameSite`, and Cookie Prefixes)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
