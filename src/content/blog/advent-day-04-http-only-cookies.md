---
title: "Stop Storing Auth Tokens in localStorage"
description: "Any XSS bug or poisoned npm dependency can read localStorage and sessionStorage in a single line of JS. Store session tokens in HttpOnly, Secure, SameSite=Strict cookies instead."
pubDate: 2026-12-04
tags: ["security", "auth", "frontend", "cookies"]
series: "advent-2026"
adventDay: 4
draft: true
---

Open the DevTools Application tab on a dozen modern SaaS dashboards and you will still find raw JWT `access_token` and `refresh_token` strings sitting in `window.localStorage`.

Why do teams still do it? Because `localStorage.getItem('token')` + `Authorization: Bearer ...` feels effortless during initial prototyping.

> **Real-World Receipt:** Client-side credential harvesters delivered via poisoned npm dependencies and compromised third-party analytics scripts routinely execute `Object.entries(localStorage)` as their very first instruction—exfiltrating long-lived JWTs and refresh tokens before the user even notices an anomaly.

---

## Why `localStorage` Is a Single Point of Failure

`localStorage` and `sessionStorage` are synchronous JavaScript key-value stores with **zero isolation from scripts executing in your origin**:

1. **One XSS bug = Full Account Takeover:** Any DOM XSS vulnerability, compromised CDN script, or malicious npm transitive package can read `localStorage` with `JSON.stringify(localStorage)`.
2. **Persistence After Tab Close:** Unlike in-memory variables, `localStorage` persists on disk across browser restarts until explicitly cleared.
3. **Unprotected Refresh Tokens:** When a refresh token is stored in `localStorage`, an attacker doesn't just get a 15-minute window—they can mint new access tokens indefinitely from their own server.

---

## The Hardened Alternative: `HttpOnly`, `Secure`, `SameSite` Cookies

When your backend issues session identifiers or refresh tokens via an `HttpOnly` cookie, the browser automatically attaches the cookie to matching HTTP requests while **completely hiding it from `document.cookie` and all JavaScript code**.

### Production Cookie Configuration (Node.js / NestJS / Express)

```typescript
import type { Response } from 'express';

export function setHardenedSessionCookie(res: Response, sessionToken: string): void {
  res.cookie('__Host-session', sessionToken, {
    httpOnly: true,   // Invisible to document.cookie and XSS payloads
    secure: true,     // Sent only over HTTPS
    sameSite: 'strict', // Blocks Cross-Site Request Forgery (CSRF)
    path: '/',        // Required for __Host- prefix
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  });
}
```

### Why the `__Host-` Cookie Prefix Matters

Prefixing your cookie name with `__Host-` instructs the browser to enforce three strict invariants automatically:

- The cookie **must** be set with the `Secure` attribute over HTTPS.
- The cookie **must not** include a `Domain` attribute (preventing a compromised subdomain like `promo.example.com` from overwriting or reading cookies for `app.example.com`).
- The `Path` attribute **must** be `/`.

### Key Takeaway for Day 04

Never store raw JWTs, session IDs, or refresh tokens in `localStorage` or `sessionStorage`. Use `__Host-` prefixed, `HttpOnly; Secure; SameSite=Strict` cookies (or a Backend-for-Frontend token handler) so JavaScript never touches long-lived credentials.

---

## Social Summary (X & LinkedIn)

```text
`JSON.stringify(localStorage)` is the first line of code in almost every client-side supply-chain payload.

If your JWTs or refresh tokens live in localStorage, a single XSS bug or compromised npm dependency equals instant, persistent account takeover.

Day 04/24 of the 2026 DevSec Advent Calendar: Moving session tokens to `__Host-` prefixed, HttpOnly, Secure, SameSite=Strict cookies.
```
