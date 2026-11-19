---
title: "Don't Run Node & Web Containers as root"
description: "Docker containers run as UID 0 (root) by default. Adding USER node or running unprivileged nginx restricts filesystem writes and drastically reduces blast radius if an attacker achieves RCE."
pubDate: 2026-12-17
tags: ["security", "docker", "nodejs", "hardening"]
series: "advent-2026"
adventDay: 17
draft: true
---

Quick quiz: if you build a Node.js microservice with a standard `Dockerfile` and don't include a `USER` instruction, what Linux user does `node dist/server.js` run as inside the container?

**`root` (UID `0`).**

By default, Docker containers do not enable user namespace remapping—meaning `UID 0` inside the container is the exact same `UID 0` as `root` on the underlying Linux host kernel, separated only by Linux namespaces, cgroups, and seccomp filters.

---

## Why Running Containers as `root` Multiplies RCE Impact

If an attacker exploits a deserialization bug, SSRF-to-RCE chain, or template injection inside your Node.js app when it runs as `root`:

1. **Full Container Filesystem Modification:** The attacker can overwrite application source files (`server.js`), install packages via `apk add` / `apt-get`, modify `/etc/passwd`, or plant persistent backdoors in memory/disk.
2. **Container Escape Amplification:** Every historical Linux kernel or `runc` container escape vulnerability (such as `CVE-2024-21626` or `Dirty Pipe`) is dramatically easier to exploit when the process inside the container already holds `UID 0` and default Linux capabilities (`CAP_NET_RAW`, `CAP_CHOWN`, `CAP_SETUID`).

---

## Hardening Your `Dockerfile` and Runtime Flags

### 1. Switch to `USER node` (or `nginxinc/nginx-unprivileged`)

Official `node` images already include a built-in unprivileged user (`node`, UID `1000`). Always copy application files with `--chown=node:node` (or better yet, keep code owned by `root` with read-only permissions so the app cannot even modify its own `.js` files!) and switch to `USER node`:

```dockerfile
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy build artifacts owned by root (read-only to the node user!)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Drop privileges from root (UID 0) to node (UID 1000)
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

For static Nginx containers, use `nginxinc/nginx-unprivileged:alpine` (which listens on port `8080` as UID `101` without requiring `root` at startup).

### 2. Enforce `--read-only` Root Filesystem and Drop Capabilities at Runtime

```yaml
# docker-compose.prod.yml / Kubernetes securityContext equivalent
services:
  api:
    image: my-org/api:latest
    user: "1000:1000"
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
```

### Key Takeaway for Day 17

Check every `Dockerfile` in your organization for a `USER` instruction before `CMD` / `ENTRYPOINT`. Combine non-root execution (`USER node`) with `read_only: true` and `cap_drop: [ALL]` to make post-exploitation lateral movement hit a brick wall.

---

## Social Summary (X & LinkedIn)

```text
If your Dockerfile doesn't have a `USER` instruction before `CMD`, your Node.js app is running as `UID 0 (root)`.

When an RCE hits a root container with a writable filesystem, the attacker can `apk add` tools, modify your JS bundle on disk, and probe kernel escapes.

Day 17/24 of the 2026 DevSec Advent Calendar: Non-root containers, read-only root filesystems, and dropping Linux capabilities.
```
