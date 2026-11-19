---
title: "Dev Servers Belong on localhost: Why 0.0.0.0 Turns Into RCE"
description: "Hardcoding vite --host or server.host: true (0.0.0.0) in package.json or mapping -p 5173:5173 in Docker exposes your dev server to local networks and browser pivot attacks."
pubDate: 2026-12-03
tags: ["security", "vite", "docker", "frontend"]
series: "advent-2026"
adventDay: 3
draft: true
socialSummary: |
  Don't forget why every bundler warns against exposing dev servers to the network.

  With Vite's critical dev-server advisory (GHSA-p4f5-76q4-ffq7, CVSS 9.1), hardcoding `vite --host` (0.0.0.0) in package.json or `-p 5173:5173` in Docker exposes your laptop to LAN attackers on shared Wi-Fi.

  Day 03/24 of the 2026 DevSec Advent Calendar: locking dev servers and Docker port mappings strictly to 127.0.0.1.
---

How many times have you seen `"dev": "vite --host"` in `package.json`, `server: { host: true }` in `vite.config.ts`, or `-p 5173:5173` in a `docker-compose.yml` file?

Developers add `--host` (which binds the dev server to `0.0.0.0`, all network interfaces) so a container port forwards cleanly or to preview a page on their phone once, and then commit it to the repository for the entire engineering team.

> **Real-World Receipt (Nov 2026):** Vite published a critical security advisory (`GHSA-p4f5-76q4-ffq7`, CVSS 9.1) affecting the Vite dev server's `__vite-browser-external` and `__vite-optional-peer-dep` virtual modules. Whenever the dev server is reachable on the network, a crafted HTTP request can bypass `server.fs` restrictions to read arbitrary files and achieve Remote Code Execution (RCE).

---

## The Two Threat Vectors of `0.0.0.0` Dev Servers

When your local development server listens on `0.0.0.0:5173` (or `0.0.0.0:3000` / `0.0.0.0:4200`), you are exposed in two ways:

1. **Untrusted Local Networks (Coffee Shops, Conferences, Co-Working Wi-Fi):** Any device on the same LAN subnet can scan port `5173` and send HTTP requests directly to your dev server to read source code, steal `.env` files, or trigger dev-bundler RCE on your laptop.
2. **Drive-By Browser Pivot / DNS Rebinding:** Even on a home network behind NAT, malicious websites or ads open in another browser tab can probe local ports or use DNS rebinding if `server.allowedHosts` and CORS are not strictly locked down.

---

## How to Lock Down Vite & Docker Dev Servers

### 1. Never Commit `--host` or `host: true` in `vite.config.ts`

Keep Vite bound strictly to loopback (`127.0.0.1` / `localhost`) by default, and upgrade to patched Vite versions (`>=8.3.7`, `>=8.2.5`, `>=8.1.7`, `>=7.3.8`, `>=6.4.6`). Also verify nested transitive copies as covered in [Day 15](/blog/advent-day-15-transitive-dependencies):

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // Bind strictly to loopback interface
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Restrict filesystem serving strictly to workspace root
    fs: {
      strict: true,
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**'],
    },
  },
});
```

### 2. Bind Docker Compose Dev Ports to `127.0.0.1`

When running a dev server inside Docker, the container process itself must listen on `0.0.0.0` inside the container namespace so Docker's bridge network can reach it. However, **your host port mapping in `docker-compose.yml` must bind to `127.0.0.1`**, never `0.0.0.0`:

```yaml
# docker-compose.yml
services:
  frontend-dev:
    build: .
    command: npx vite --host 0.0.0.0 --port 5173
    ports:
      # BAD: Exposes 5173 on 0.0.0.0 (all host network interfaces, bypassing ufw!)
      # - "5173:5173"

      # GOOD: Binds strictly to host loopback (127.0.0.1)
      - "127.0.0.1:5173:5173"
```

---

## Verify It in 60 Seconds

Check which local dev ports on your workstation are accidentally bound to `0.0.0.0` or `::` right now:

```bash
# Linux
ss -tulnp | grep -E ':(3000|4200|4321|5173|8080)\b'

# macOS
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(3000|4200|4321|5173|8080)\b'
```

You should see `127.0.0.1:<port>` or `[::1]:<port>`, never `0.0.0.0:<port>` or `*:<port>`.

### Key Takeaway for Day 03

Dev bundlers prioritize fast Hot Module Replacement (HMR) and source transformation, not production-grade network isolation. Never run a dev server in production, remove `--host` from shared `package.json` scripts, and prefix Docker dev port mappings with `127.0.0.1:`.

---

## References

- [Vite Security Advisory: GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7)
- [Vite Server Options (`server.host` & `server.fs`)](https://vite.dev/config/server-options.html)
