---
title: "Don't Run Node & Web Containers as root"
description: "Docker containers run as UID 0 (root) by default. Adding USER node or running unprivileged nginx restricts filesystem writes and drastically reduces blast radius if an attacker achieves RCE."
pubDate: 2026-12-17
tags: ["security", "docker", "nodejs", "hardening"]
series: "advent-2026"
adventDay: 17
draft: true
socialSummary: |
  If your Dockerfile doesn't have a `USER` instruction before `CMD`, your Node.js app is running as `UID 0 (root)`.

  When an RCE hits a root container with a writable filesystem, the attacker can `apk add` tools, modify your JS bundle on disk, and probe kernel escapes.

  Day 17/24 of the 2026 DevSec Advent Calendar: non-root containers, read-only root filesystems, and dropping Linux capabilities.
---

Quick quiz: if you build a Node.js microservice with a standard `Dockerfile` and leave out a `USER` instruction, what Linux user does `node dist/server.js` run as inside the container?

**`root` (UID `0`).**

By default, Docker containers do not enable user namespace remapping. That means `UID 0` inside the container is the exact same `UID 0` as `root` on the underlying Linux host kernel, separated only by Linux namespaces, cgroups, and seccomp filters.

> **Real-World Receipt:** High-impact container escape vulnerabilities like `runc`'s Leaky Vessels flaw (`CVE-2024-21626`) and Linux kernel escapes repeatedly demonstrate why running as `UID 0` with default capabilities multiplies RCE blast radius from "compromised app process" to "compromised host node."

---

## Why Running Containers as `root` Multiplies RCE Impact

If an attacker exploits a deserialization bug, SSRF-to-RCE chain, or template injection inside your Node.js app when it runs as `root`:

1. **Full Container Filesystem Modification:** The attacker can overwrite application source files (`server.js`), install packages via `apk add` / `apt-get`, modify `/etc/passwd`, or plant persistent backdoors on disk.
2. **Container Escape Amplification:** Exploiting kernel or container-runtime bugs is dramatically easier when the compromised process holds `UID 0` and default Linux capabilities (`CAP_NET_RAW`, `CAP_CHOWN`, `CAP_SETUID`).

---

## Hardening Your `Dockerfile` and Runtime Flags

### 1. Switch to `USER node` (or `nginxinc/nginx-unprivileged`)

Official `node` images already include a built-in unprivileged user (`node`, UID `1000`). Keep application files owned by `root` with read-only permissions (`0555`/`0444`) so the `node` process can read and execute your bundle without being able to overwrite its own `.js` files, and prune `devDependencies` before copying:

```dockerfile
# Pin by @sha256 digest in production (see Day 16)
FROM node:22-alpine@sha256:<REPLACE_WITH_NODE_22_ALPINE_DIGEST> AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production-only artifacts owned by root (read-only to the node user!)
COPY --from=builder --chmod=0555 /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chmod=0444 /app/package.json ./package.json

# Drop privileges from root (UID 0) to node (UID 1000)
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

For static Nginx containers, use `nginxinc/nginx-unprivileged:alpine` (which listens on port `8080` as UID `101` without requiring `root` at startup).

### 2. Enforce `--read-only` Root Filesystem and Drop Capabilities at Runtime

Never use mutable `:latest` tags here either ([Day 16](/blog/advent-day-16-pin-docker-digests)). Reference an immutable release tag or `@sha256` digest:

```yaml
# docker-compose.prod.yml / Kubernetes securityContext equivalent
services:
  api:
    image: my-org/api:1.14.2@sha256:<REPLACE_WITH_IMAGE_DIGEST>
    user: "1000:1000"
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
```

---

## Verify It in 60 Seconds

Check what UID your built container image actually executes as before deploying it:

```bash
docker run --rm --entrypoint id my-org/api:1.14.2
# Expected: uid=1000(node) gid=1000(node) (NEVER uid=0(root)!)
```

### Key Takeaway for Day 17

Check every `Dockerfile` in your organization for a `USER` instruction before `CMD` / `ENTRYPOINT`. Combine non-root execution (`USER node`) with `read_only: true`, `cap_drop: [ALL]`, and `no-new-privileges:true` to make post-exploitation lateral movement hit a brick wall.

---

## References

- [CVE-2024-21626: `runc` Container Breakout (Leaky Vessels)](https://www.cve.org/CVERecord?id=CVE-2024-21626)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
