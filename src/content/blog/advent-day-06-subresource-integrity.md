---
title: "Subresource Integrity (SRI) for Static CDNs"
description: "If you load a versioned script or stylesheet from a public CDN without an integrity=\"sha384-...\" hash and crossorigin=\"anonymous\", a CDN compromise turns into arbitrary code execution."
pubDate: 2026-12-06
tags: ["security", "frontend", "supply-chain"]
series: "advent-2026"
adventDay: 6
draft: true
---

Loading a pinned library version like `https://cdn.jsdelivr.net/npm/library@1.4.2/dist/lib.min.js` feels immutable. After all, `1.4.2` is a fixed version number—what could go wrong?

If the third-party CDN itself is compromised, a BGP/DNS hijack occurs, or an attacker poisons the edge cache, the file served at that exact URL can be modified to include a credential skimmer—and every browser visiting your site will execute it without hesitation.

> **Real-World Receipt:** The polyfill.io supply-chain compromise demonstrated how a single domain ownership transfer or CDN bucket modification can weaponize a `<script>` tag across hundreds of thousands of production websites simultaneously.

---

## How Subresource Integrity (SRI) Protects Your Users

**Subresource Integrity (`integrity="sha384-..."`)** lets you give the browser a cryptographic hash of the exact bytes you expect a `<script>` or `<link rel="stylesheet">` tag to return.

Before executing a single byte of the downloaded file, the browser computes its SHA-384 (or SHA-512) digest and compares it against the `integrity` attribute. If a single character differs, **the browser refuses to execute the script**.

---

## Generating and Enforcing SRI Hashes

### 1. Generate a SHA-384 Integrity Hash via CLI

```bash
curl -s https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js \
  | openssl dgst -sha384 -binary \
  | openssl base64 -A \
  | awk '{print "sha384-"$0}'
```

### 2. Add `integrity` and `crossorigin="anonymous"` to Your HTML

```html
<!-- Always pair integrity="..." with crossorigin="anonymous" -->
<script
  src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js"
  integrity="sha384-7f7J9t5xK8V0v+ExampleHashReplaceWithActualBase64Digest=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
></script>
```

> **Note:** Never omit `crossorigin="anonymous"`. Without it, the browser cannot perform the CORS-enabled integrity verification on a cross-origin CDN asset!

### 3. Even Better: Self-Host Critical Assets

Whenever possible, bundle and self-host your JavaScript and font files under `'self'` rather than relying on public CDNs. Modern HTTP/2 and HTTP/3 browser cache partitioning (keyed by top-level site) already eliminated the old "shared cross-site CDN cache hit" performance advantage.

### Key Takeaway for Day 06

Self-host critical dependencies under `'self'`. For any external static script or stylesheet you must load from a CDN, pin an immutable version and enforce `integrity="sha384-..."` with `crossorigin="anonymous"`.

---

## Social Summary (X & LinkedIn)

```text
Since browsers partitioned HTTP caches by top-level origin, loading JS from public CDNs doesn't even give you shared cache hits anymore—it just adds a supply-chain failure point.

If you must load a static script from a 3rd-party CDN, never ship it without Subresource Integrity (`integrity="sha384-..."` + `crossorigin="anonymous"`).

Day 06/24 of the 2026 DevSec Advent Calendar: Enforcing cryptographic integrity on external assets.
```
