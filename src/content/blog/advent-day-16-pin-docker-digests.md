---
title: "Pin Docker Base Images by SHA256 Digest"
description: "Mutable tags like node:22-alpine or nginx:alpine can change silently between builds. Pin base images by immutable @sha256:... digest and automate updates with Renovate or Dependabot."
pubDate: 2026-12-16
tags: ["security", "docker", "containers", "supply-chain"]
series: "advent-2026"
adventDay: 16
draft: true
---

We spent Day 13 talking about why floating version ranges in `package.json` require a cryptographic lockfile (`package-lock.json`).

Yet take a look at the first line of almost every production `Dockerfile`:

```dockerfile
FROM node:22-alpine
```

Here is the catch: **Docker tags are completely mutable.** `node:22-alpine` is not an immutable version—it is a moving pointer that can point to a different image layer today than it did yesterday.

---

## Why Mutable Docker Tags Are a Supply-Chain Risk

1. **Silent Upstream Tag Overwrites:** If an upstream registry account or build pipeline for a third-party Docker Hub image is compromised, the attacker can push a malicious image to an existing tag (`v1.4.2` or `22-alpine`). Every CI build that pulls by tag immediately ingests the backdoored image.
2. **Non-Reproducible Builds:** When Alpine bumps from `3.20` to `3.21` under the `node:22-alpine` alias, system libraries (`libcrypto`, `musl`, `busybox`) change between two builds of the exact same Git commit.

---

## How to Pin Docker Images by `@sha256` Digest

Docker supports referencing an image by both its human-readable tag **and** its immutable content-addressable SHA-256 manifest digest:

### 1. Look Up the Current Multi-Arch Manifest Digest

```bash
docker buildx imagetools inspect node:22-alpine --format "{{json .Manifest.Digest}}"
```

### 2. Pin Both Build and Runtime Stages in Your `Dockerfile`

```dockerfile
# Stage 1: Pinned Node 22 LTS Alpine builder
FROM node:22-alpine@sha256:9f0f70c6e2f80c240b8d72676f2a6845b8f19725e0f4b4b6e56e57f1b5a0c321 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Pinned Nginx Alpine runner
FROM nginx:alpine@sha256:4a98c1f87a98f4d9756a813d827564785965664759483b6e35c1a8e7c9f01234 AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
```

### 3. Let Renovate or Dependabot Update Digests Automatically

Pinning digests does **not** mean your base images go stale! Both Renovate (`docker:pinDigests`) and GitHub Dependabot (`package-ecosystem: "docker"`) automatically open pull requests whenever `node:22-alpine` publishes a new security-patched digest—giving you deterministic builds *plus* reviewed, auditable base image upgrades in Git history.

### Key Takeaway for Day 16

Treat `Dockerfile` base images just like `package-lock.json`. Pin `FROM image:tag@sha256:...` digests and let automated PR bots keep those digests patched.

---

## Social Summary (X & LinkedIn)

```text
Docker tags like `node:22-alpine` or `v1.4.0` are mutable pointers, not cryptographic locks.

If an upstream image tag is overwritten—or changes OS packages overnight—your build changes without a single Git commit.

Day 16/24 of the 2026 DevSec Advent Calendar: Pinning Docker base images by immutable `@sha256` digest.
```
