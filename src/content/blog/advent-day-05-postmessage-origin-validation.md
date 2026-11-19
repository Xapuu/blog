---
title: "window.postMessage Without event.origin Checks Is DOM XSS Waiting to Happen"
description: "Listening to window.addEventListener('message', ...) without strictly validating event.origin against an exact allowlist lets any malicious popup or iframe inject untrusted payloads into your app."
pubDate: 2026-12-05
tags: ["security", "javascript", "dom-xss"]
series: "advent-2026"
adventDay: 5
draft: true
socialSummary: |
  Grep your frontend repo for `addEventListener('message'`.

  If a listener touches `event.data` without an exact `ALLOWED_ORIGINS.has(event.origin)` check (or uses `.includes('yourdomain.com')`), any malicious tab or iframe can inject forged messages straight into your app.

  Day 05/24 of the 2026 DevSec Advent Calendar: hardening `window.postMessage` receivers and senders.
---

`window.postMessage()` is the standard browser mechanism for controlled cross-origin communication between a parent window and an embedded `<iframe>`, OAuth popup, or payment widget.

It is also one of the most frequently misconfigured APIs in frontend codebases, turning safe cross-window messaging into cross-origin data leaks or DOM XSS.

> **Real-World Receipt:** `postMessage` origin-check bypasses consistently rank among the highest-payout client-side bug bounty findings across OAuth popups, embedded chat widgets, and SaaS SSO flows. A single missing `event.origin` check or `.includes('example.com')` regex lets an attacker page at `https://example.com.attacker.tld` steal OAuth codes or execute arbitrary JavaScript in the victim's session.

---

## The Two Classic `postMessage` Mistakes

### Mistake 1: Missing or Regex-Flawed `event.origin` Validation (Receiver)

Any tab, popup, or iframe that obtains a reference to your `window` can call `targetWindow.postMessage(payload, '*')`. If your message listener processes `event.data` without checking `event.origin` (or uses a weak substring/regex check like `event.origin.includes('trusted.example.com')`), an attacker from `https://trusted.example.com.attacker.tld` can send arbitrary commands to your app:

```typescript
// VULNERABLE: No origin check (or weak .indexOf / .includes check)
window.addEventListener('message', (event) => {
  if (event.data?.type === 'OAUTH_TOKEN') {
    // Attacker can overwrite session state or trigger DOM XSS!
    applyUserSession(event.data.token);
  }
});
```

### Mistake 2: Using Wildcard `'*'` as `targetOrigin` (Sender)

When sending sensitive data (such as an auth nonce or user profile) to an embedded iframe via `iframe.contentWindow.postMessage(secretPayload, '*')`, the browser delivers that message even if the iframe navigated away to an untrusted origin.

---

## The Hardened `postMessage` Pattern

Always validate `event.origin` against an explicit `Set` of exact origins, verify `event.source` matches the window reference you expect, validate the runtime schema of `event.data`, and pass an explicit `targetOrigin` when sending messages:

```typescript
// src/security/postmessage.ts
const ALLOWED_ORIGINS = new Set<string>([
  'https://auth.hristov.dev',
  'https://checkout.hristov.dev',
]);

interface AuthSuccessMessage {
  type: 'AUTH_COMPLETE';
  nonce: string;
}

function isAuthSuccessMessage(data: unknown): data is AuthSuccessMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'AUTH_COMPLETE' &&
    typeof (data as Record<string, unknown>).nonce === 'string'
  );
}

export function registerCheckoutListener(expectedFrame: HTMLIFrameElement): void {
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    // 1. Strict exact-match origin check (NEVER allowlist 'null'!)
    if (!ALLOWED_ORIGINS.has(event.origin)) {
      return;
    }

    // 2. Verify the message came from the specific iframe/popup you opened
    if (event.source !== expectedFrame.contentWindow) {
      return;
    }

    // 3. Runtime schema validation of untrusted payload
    if (!isAuthSuccessMessage(event.data)) {
      return;
    }

    // Safe to process
    verifyAuthNonce(event.data.nonce);
  });
}

// 4. Always specify exact targetOrigin when sending messages (never '*')
export function sendToCheckoutFrame(iframe: HTMLIFrameElement, payload: object): void {
  iframe.contentWindow?.postMessage(payload, 'https://checkout.hristov.dev');
}
```

> **Watch Out for `'null'` Origins:** Never add `'null'` to `ALLOWED_ORIGINS`. Sandboxed iframes (without `allow-same-origin`), `data:` URLs, and `file://` documents all serialize `event.origin` as the string `'null'`. Any attacker can forge a `'null'` origin from a sandboxed iframe.

---

## Verify It in 60 Seconds

Audit every `postMessage` sender and receiver in your codebase right now:

```bash
# Find every message listener and postMessage call in src/
grep -rnE "addEventListener\(['\"]message|onmessage|\.postMessage\(" src/
```

For every match, confirm: exact `event.origin` allowlist check, `event.source` check where applicable, and zero wildcard `'*'` `targetOrigin` calls carrying sensitive data.

### Key Takeaway for Day 05

Grep your frontend repositories for `addEventListener('message'` and `.postMessage(` today. Require an exact allowlist check (`ALLOWED_ORIGINS.has(event.origin)`), never allowlist `'null'`, check `event.source`, and never pass `'*'` as `targetOrigin` for non-public data.

---

## References

- [MDN: `Window.postMessage()` Security Concerns](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns)
- [OWASP HTML5 Security Cheat Sheet: Web Messaging](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#web-messaging)
