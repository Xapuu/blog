---
title: "Pin Docker Base Images by SHA256 Digest"
description: "Mutable tags like node:22-alpine or nginx:alpine can change silently between builds. Pin base images by immutable @sha256:... digest and automate updates with Renovate or Dependabot."
pubDate: 2026-12-16
tags: ["security", "docker", "containers", "supply-chain"]
series: "advent-2026"
adventDay: 16
draft: true
socialSummary: |
  Docker tags like `node:22-alpine` or `v1.4.0` are mutable pointers, not cryptographic locks.

  If an upstream image tag is overwritten (or changes OS packages overnight), your build changes without a single Git commit.

  Day 16/24 of the 2026 DevSec Advent Calendar: pinning Docker base images by immutable `@sha256` digest.
---

We spent [Day 13](/blog/advent-day-13-frozen-lockfiles-ci) talking about why floating version ranges in `package.json` require a cryptographic lockfile (`package-lock.json`).

Yet take a look at the first line of almost every production `Dockerfile`:

```dockerfile
FROM node:22-alpine
```

Here is the catch: **Docker tags are completely mutable.** `node:22-alpine` is not an immutable version. It is a moving pointer that can resolve to completely different image layers today than it did yesterday.

> **Real-World Receipt:** Container supply-chain incidents (from trojanized community Docker Hub images pushed over existing version tags to silent Alpine, musl, or OpenSSL base-image updates breaking production builds mid-rollout) happen precisely because registries allow mutable tags to be overwritten without changing your `Dockerfile`.

---

## Why Mutable Docker Tags Are a Supply-Chain Risk

1. **Silent Upstream Tag Overwrites:** If an upstream registry account or build pipeline for a third-party Docker Hub image is compromised, the attacker can push a malicious image to an existing tag (`v1.4.2` or `22-alpine`). Every CI build that pulls by tag immediately ingests the backdoored image.
2. **Non-Reproducible Builds:** When Alpine bumps OS packages (`libcrypto`, `musl`, `busybox`) under the `node:22-alpine` alias, your runtime binaries change between two builds of the exact same Git commit.

---

## How to Pin Docker Images by `@sha256` Digest

Docker supports referencing an image by both its human-readable tag **and** its immutable content-addressable SHA-256 manifest digest:

### 1. Look Up the Current Multi-Arch Manifest Digest

```bash
docker buildx imagetools inspect node:22-alpine --format "{{.Manifest.Digest}}"
docker buildx imagetools inspect nginxinc/nginx-unprivileged:alpine --format "{{.Manifest.Digest}}"
```

### 2. Pin Both Build and Runtime Stages in Your `Dockerfile`

Combine pinned digests with frozen installs ([Day 13](/blog/advent-day-13-frozen-lockfiles-ci)), `--ignore-scripts` ([Day 14](/blog/advent-day-14-npm-lifecycle-scripts)), and an unprivileged runtime image ([Day 17](/blog/advent-day-17-non-root-docker-containers)):

```dockerfile
# Replace the example @sha256 digests below with the live output from `docker buildx imagetools inspect`!

# Stage 1: Pinned Node 22 LTS Alpine builder
FROM node:22-alpine@sha256:<REPLACE_WITH_NODE_22_ALPINE_DIGEST> AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Pinned Unprivileged Nginx Alpine runner (UID 101, non-root!)
FROM nginxinc/nginx-unprivileged:alpine@sha256:<REPLACE_WITH_NGINX_UNPRIVILEGED_DIGEST> AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
```

### 3. Let Renovate or Dependabot Update Digests Automatically

Pinning digests does **not** mean your base images go stale. Both Renovate (`docker:pinDigests`) and GitHub Dependabot (`package-ecosystem: "docker"`) automatically open pull requests whenever `node:22-alpine` publishes a new security-patched digest. You get deterministic builds plus reviewed, auditable base image upgrades in Git history.

---

## Verify It in 60 Seconds

Find every unpinned `FROM` instruction across all Dockerfiles in your repository:

```bash
grep -rnE '^FROM ' Dockerfile* | grep -v '@sha256:'
```

### Key Takeaway for Day 16

Treat `Dockerfile` base images just like `package-lock.json`. Pin `FROM image:tag@sha256:...` digests and let Renovate or Dependabot keep those digests patched via reviewed PRs.

---

## References

- [Docker Docs: Dockerfile `FROM` Digest Syntax](https://docs.docker.com/reference/dockerfile/#from)
- [Renovate Docs: Docker Digest Pinning](https://docs.renovatebot.com/docker/)
